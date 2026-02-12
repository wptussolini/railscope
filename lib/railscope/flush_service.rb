# frozen_string_literal: true

module Railscope
  class FlushService
    BUFFER_KEY = "railscope:buffer"
    UPDATES_KEY = "railscope:buffer:updates"
    BATCH_SIZE = 100
    MAX_RETRIES = 3

    def self.call
      new.call
    end

    def call
      total = flush_entries
      apply_pending_updates
      total
    end

    private

    def flush_entries
      total = 0
      retries = 0

      loop do
        batch = pop_batch(BUFFER_KEY)
        break if batch.empty?

        entries = batch.map { |json| JSON.parse(json, symbolize_names: true) }
        batch_insert_to_database(entries)
        total += entries.size
        retries = 0
      rescue Redis::BaseError => e
        retries += 1
        if retries <= MAX_RETRIES
          Rails.logger.warn("[Railscope] Redis connection lost during flush, reconnecting (attempt #{retries}/#{MAX_RETRIES})...")
          reconnect_redis!
          retry
        else
          Rails.logger.error("[Railscope] Redis flush failed after #{MAX_RETRIES} retries (flushed #{total} entries): #{e.message}")
          break
        end
      end

      total
    end

    def apply_pending_updates
      retries = 0

      loop do
        batch = pop_batch(UPDATES_KEY)
        break if batch.empty?

        batch.each do |json|
          update = JSON.parse(json, symbolize_names: true)
          apply_update(update)
        end
        retries = 0
      rescue Redis::BaseError => e
        retries += 1
        if retries <= MAX_RETRIES
          Rails.logger.warn("[Railscope] Redis connection lost during updates, reconnecting (attempt #{retries}/#{MAX_RETRIES})...")
          reconnect_redis!
          retry
        else
          Rails.logger.error("[Railscope] Redis updates failed after #{MAX_RETRIES} retries: #{e.message}")
          break
        end
      end
    end

    def apply_update(update)
      entry = Entry.where(
        batch_id: update[:batch_id],
        entry_type: update[:entry_type].to_s
      ).order(created_at: :desc).first
      return unless entry

      entry.payload = entry.payload.merge(
        update[:payload_updates].transform_keys(&:to_s)
      )
      entry.save!
    rescue StandardError => e
      Rails.logger.debug("[Railscope] Failed to apply buffered update: #{e.message}")
    end

    def batch_insert_to_database(entries)
      now = Time.current

      records = entries.map do |entry|
        {
          uuid: entry[:uuid],
          batch_id: entry[:batch_id],
          family_hash: entry[:family_hash],
          entry_type: entry[:entry_type],
          payload: entry[:payload],
          tags: entry[:tags] || [],
          should_display_on_index: entry.fetch(:should_display_on_index, true),
          occurred_at: entry[:occurred_at] || now,
          created_at: entry[:created_at] || now,
          updated_at: entry[:updated_at] || now
        }
      end

      Entry.insert_all(records)
    end

    def pop_batch(key)
      redis.lpop(key, BATCH_SIZE) || []
    end

    def reconnect_redis!
      Railscope.redis&.close
    rescue StandardError
      # ignore
    ensure
      Railscope.instance_variable_set(:@redis, nil)
    end

    def redis
      Railscope.redis
    end
  end
end
