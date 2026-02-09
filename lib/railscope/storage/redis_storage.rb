# frozen_string_literal: true

module Railscope
  module Storage
    class RedisStorage < Base
      # Key prefixes
      PREFIX = "railscope"
      ENTRY_KEY = "#{PREFIX}:entry:%s".freeze           # Hash with entry data
      ALL_ENTRIES_KEY = "#{PREFIX}:entries".freeze      # Sorted set (score=timestamp)
      DISPLAYABLE_KEY = "#{PREFIX}:displayable".freeze  # Sorted set of displayable entries
      BATCH_KEY = "#{PREFIX}:batch:%s".freeze           # Sorted set per batch
      FAMILY_KEY = "#{PREFIX}:family:%s".freeze         # Sorted set per family
      TYPE_KEY = "#{PREFIX}:type:%s".freeze             # Sorted set per entry type
      TAG_KEY = "#{PREFIX}:tag:%s".freeze               # Set per tag

      def write(attributes)
        entry = build_entry(attributes)
        store_entry(entry)
        entry
      end

      def update_by_batch(batch_id:, entry_type:, payload_updates:)
        # Find entries in this batch with the given type
        uuids = redis.zrevrange(batch_key(batch_id), 0, -1)
        return nil if uuids.empty?

        # Find the entry of the specified type
        uuids.each do |uuid|
          entry = find(uuid)
          next unless entry && entry.entry_type == entry_type

          # Merge payload updates
          updated_payload = entry.payload.merge(payload_updates)
          updated_entry = EntryData.new(
            uuid: entry.uuid,
            batch_id: entry.batch_id,
            family_hash: entry.family_hash,
            entry_type: entry.entry_type,
            payload: updated_payload,
            tags: entry.tags,
            should_display_on_index: entry.displayable?,
            occurred_at: entry.occurred_at,
            created_at: entry.created_at,
            updated_at: Time.current
          )

          # Re-store the entry (overwrites the existing one)
          ttl = Railscope.retention_days.days.to_i
          redis.set(entry_key(uuid), updated_entry.to_json, ex: ttl)

          return updated_entry
        end

        nil
      end

      def find(uuid)
        json = redis.get(entry_key(uuid))
        return nil unless json

        EntryData.from_json(json)
      end

      def all(filters: {}, page: 1, per_page: 25, displayable_only: true)
        uuids = fetch_uuids(filters, displayable_only, page, per_page)
        fetch_entries(uuids)
      end

      def count(filters: {}, displayable_only: true)
        if filters.empty?
          key = displayable_only ? DISPLAYABLE_KEY : ALL_ENTRIES_KEY
          redis.zcard(key)
        elsif filters[:type].present? && filters.keys == [:type]
          # Simple type filter - use zcard directly
          key = type_key(filters[:type])
          if displayable_only
            # Intersection count
            count_intersection(key, DISPLAYABLE_KEY)
          else
            redis.zcard(key)
          end
        elsif filters[:batch_id].present? && filters.keys == [:batch_id]
          redis.zcard(batch_key(filters[:batch_id]))
        elsif filters[:family_hash].present? && filters.keys == [:family_hash]
          redis.zcard(family_key(filters[:family_hash]))
        else
          # Complex filter - fetch all matching UUIDs and count
          count_filtered(filters, displayable_only)
        end
      end

      def for_batch(batch_id)
        uuids = redis.zrevrange(batch_key(batch_id), 0, -1)
        fetch_entries(uuids)
      end

      def for_family(family_hash, page: 1, per_page: 25)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page - 1
        uuids = redis.zrevrange(family_key(family_hash), start_idx, end_idx)
        fetch_entries(uuids)
      end

      def family_count(family_hash)
        redis.zcard(family_key(family_hash))
      end

      def destroy_all!
        keys = redis.keys("#{PREFIX}:*")
        return 0 if keys.empty?

        count = redis.zcard(ALL_ENTRIES_KEY)
        redis.del(*keys)
        count
      end

      def destroy_expired!
        cutoff = Railscope.retention_days.days.ago.to_f

        # Get expired entry UUIDs
        expired_uuids = redis.zrangebyscore(ALL_ENTRIES_KEY, "-inf", cutoff)
        return 0 if expired_uuids.empty?

        # Delete each entry and its index references
        expired_uuids.each { |uuid| delete_entry(uuid) }

        expired_uuids.size
      end

      def ready?
        Railscope.redis_available?
      end

      private

      def redis
        Railscope.redis
      end

      def build_entry(attributes)
        now = Time.current
        EntryData.new(
          uuid: attributes[:uuid] || SecureRandom.uuid,
          batch_id: attributes[:batch_id],
          family_hash: attributes[:family_hash],
          entry_type: attributes[:entry_type],
          payload: attributes[:payload] || {},
          tags: attributes[:tags] || [],
          should_display_on_index: attributes.fetch(:should_display_on_index, true),
          occurred_at: attributes[:occurred_at] || now,
          created_at: attributes[:created_at] || now,
          updated_at: attributes[:updated_at] || now
        )
      end

      def store_entry(entry)
        uuid = entry.uuid
        score = entry.occurred_at.to_f
        ttl = Railscope.retention_days.days.to_i

        redis.multi do |multi|
          # Store entry data
          multi.set(entry_key(uuid), entry.to_json, ex: ttl)

          # Add to main sorted set
          multi.zadd(ALL_ENTRIES_KEY, score, uuid)

          # Add to displayable set if applicable
          multi.zadd(DISPLAYABLE_KEY, score, uuid) if entry.displayable?

          # Add to batch set
          multi.zadd(batch_key(entry.batch_id), score, uuid) if entry.batch_id

          # Add to family set
          multi.zadd(family_key(entry.family_hash), score, uuid) if entry.family_hash

          # Add to type set
          multi.zadd(type_key(entry.entry_type), score, uuid) if entry.entry_type

          # Add to tag sets
          entry.tags.each do |tag|
            multi.sadd(tag_key(tag), uuid)
          end

          # Set TTL on index keys
          multi.expire(batch_key(entry.batch_id), ttl) if entry.batch_id
          multi.expire(family_key(entry.family_hash), ttl) if entry.family_hash
        end
      end

      def delete_entry(uuid)
        entry = find(uuid)
        return unless entry

        redis.multi do |multi|
          # Remove from all indexes
          multi.del(entry_key(uuid))
          multi.zrem(ALL_ENTRIES_KEY, uuid)
          multi.zrem(DISPLAYABLE_KEY, uuid)
          multi.zrem(batch_key(entry.batch_id), uuid) if entry.batch_id
          multi.zrem(family_key(entry.family_hash), uuid) if entry.family_hash
          multi.zrem(type_key(entry.entry_type), uuid) if entry.entry_type
          entry.tags.each { |tag| multi.srem(tag_key(tag), uuid) }
        end
      end

      def fetch_uuids(filters, displayable_only, page, per_page)
        # Determine which set to query
        base_key = if filters[:type].present?
                     type_key(filters[:type])
                   elsif filters[:batch_id].present?
                     batch_key(filters[:batch_id])
                   elsif filters[:family_hash].present?
                     family_key(filters[:family_hash])
                   elsif displayable_only
                     DISPLAYABLE_KEY
                   else
                     ALL_ENTRIES_KEY
                   end

        # Calculate pagination
        start_idx = (page - 1) * per_page
        end_idx = per_page == Float::INFINITY ? -1 : start_idx + per_page - 1

        uuids = redis.zrevrange(base_key, start_idx, end_idx)

        # Apply additional filters if needed
        if filters[:tag].present?
          tag_members = redis.smembers(tag_key(filters[:tag]))
          uuids &= tag_members
        end

        # If displayable filter and we're using a type/batch/family key
        if displayable_only && !%W[#{DISPLAYABLE_KEY} #{ALL_ENTRIES_KEY}].include?(base_key)
          displayable_members = redis.zrange(DISPLAYABLE_KEY, 0, -1)
          uuids &= displayable_members
        end

        uuids
      end

      def fetch_entries(uuids)
        return [] if uuids.empty?

        # Fetch all entries in a single pipeline
        jsons = redis.pipelined do |pipeline|
          uuids.each { |uuid| pipeline.get(entry_key(uuid)) }
        end

        # Parse and filter out nil results (expired entries)
        jsons.compact.map { |json| EntryData.from_json(json) }
      end

      # Key generators
      def entry_key(uuid)
        format(ENTRY_KEY, uuid)
      end

      def batch_key(batch_id)
        format(BATCH_KEY, batch_id)
      end

      def family_key(family_hash)
        format(FAMILY_KEY, family_hash)
      end

      def type_key(entry_type)
        format(TYPE_KEY, entry_type)
      end

      def tag_key(tag)
        format(TAG_KEY, tag)
      end

      def count_intersection(key1, key2)
        # Get members from both sets and count intersection
        members1 = redis.zrange(key1, 0, -1)
        members2 = redis.zrange(key2, 0, -1)
        (members1 & members2).size
      end

      def count_filtered(filters, displayable_only)
        # Get all UUIDs matching the primary filter
        base_key = if filters[:type].present?
                     type_key(filters[:type])
                   elsif filters[:batch_id].present?
                     batch_key(filters[:batch_id])
                   elsif filters[:family_hash].present?
                     family_key(filters[:family_hash])
                   elsif displayable_only
                     DISPLAYABLE_KEY
                   else
                     ALL_ENTRIES_KEY
                   end

        uuids = redis.zrange(base_key, 0, -1)

        # Apply tag filter
        if filters[:tag].present?
          tag_members = redis.smembers(tag_key(filters[:tag]))
          uuids &= tag_members
        end

        # Apply displayable filter
        if displayable_only && base_key != DISPLAYABLE_KEY
          displayable_members = redis.zrange(DISPLAYABLE_KEY, 0, -1)
          uuids &= displayable_members
        end

        uuids.size
      end
    end
  end
end
