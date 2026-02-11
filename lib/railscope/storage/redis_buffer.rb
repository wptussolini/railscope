# frozen_string_literal: true

module Railscope
  module Storage
    class RedisBuffer < Base
      BUFFER_KEY = "railscope:buffer"
      UPDATES_KEY = "railscope:buffer:updates"

      # WRITE → Redis (fast, ~0.1ms)
      def write(attributes)
        entry = build_entry(attributes)
        redis.rpush(BUFFER_KEY, entry.to_json)
        entry
      end

      # UPDATE → Redis buffer (for response data from middleware)
      def update_by_batch(batch_id:, entry_type:, payload_updates:)
        update = {
          batch_id: batch_id,
          entry_type: entry_type,
          payload_updates: payload_updates
        }
        redis.rpush(UPDATES_KEY, update.to_json)
      end

      # READ → Database (source of truth)
      def find(uuid)
        database_adapter.find(uuid)
      end

      def all(filters: {}, page: 1, per_page: 25, displayable_only: true)
        database_adapter.all(filters: filters, page: page, per_page: per_page, displayable_only: displayable_only)
      end

      def count(filters: {}, displayable_only: true)
        database_adapter.count(filters: filters, displayable_only: displayable_only)
      end

      def for_batch(batch_id)
        database_adapter.for_batch(batch_id)
      end

      def for_family(family_hash, page: 1, per_page: 25)
        database_adapter.for_family(family_hash, page: page, per_page: per_page)
      end

      def family_count(family_hash)
        database_adapter.family_count(family_hash)
      end

      def destroy_all!
        redis.del(BUFFER_KEY, UPDATES_KEY)
        database_adapter.destroy_all!
      end

      def destroy_expired!
        database_adapter.destroy_expired!
      end

      # READY → needs both Redis AND database
      def ready?
        Railscope.redis_available? && database_adapter.ready?
      end

      private

      def redis
        Railscope.redis
      end

      def database_adapter
        @database_adapter ||= Database.new
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
    end
  end
end
