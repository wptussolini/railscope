# frozen_string_literal: true

module Railscope
  module Subscribers
    class QuerySubscriber
      EVENT_NAME = "sql.active_record"

      IGNORED_NAMES = %w[SCHEMA TRANSACTION].freeze
      IGNORED_SQL_PATTERNS = [
        /\A\s*SELECT.*sqlite_master/i,
        /\A\s*SELECT.*pg_catalog/i,
        /\A\s*SELECT.*information_schema/i,
        /\A\s*SHOW/i,
        /\A\s*SET/i
      ].freeze

      def self.subscribe
        ActiveSupport::Notifications.subscribe(EVENT_NAME) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record(event)
        end
      end

      def record(event)
        return unless Railscope.enabled?
        return if ignore_query?(event)

        Entry.create!(
          entry_type: "query",
          payload: build_payload(event),
          tags: build_tags(event),
          occurred_at: Time.current
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record query: #{e.message}")
      end

      private

      def build_payload(event)
        {
          sql: event.payload[:sql],
          name: event.payload[:name],
          duration: event.duration.round(2),
          cached: event.payload[:cached] || false,
          async: event.payload[:async] || false,
          row_count: event.payload[:row_count]
        }
      end

      def build_tags(event)
        tags = ["query"]
        tags << query_type(event.payload[:sql])
        tags << "cached" if event.payload[:cached]
        tags << "slow" if event.duration > 100
        tags.compact
      end

      def query_type(sql)
        case sql.to_s.strip
        when /\A\s*SELECT/i then "select"
        when /\A\s*INSERT/i then "insert"
        when /\A\s*UPDATE/i then "update"
        when /\A\s*DELETE/i then "delete"
        end
      end

      def ignore_query?(event)
        return true if event.payload[:name].to_s.in?(IGNORED_NAMES)
        return true if IGNORED_SQL_PATTERNS.any? { |pattern| event.payload[:sql].to_s.match?(pattern) }
        return true if event.payload[:sql].to_s.include?("railscope_entries")

        false
      end
    end
  end
end
