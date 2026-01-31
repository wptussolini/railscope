# frozen_string_literal: true

module Railscope
  module Subscribers
    class RequestSubscriber
      EVENT_NAME = "process_action.action_controller"

      def self.subscribe
        ActiveSupport::Notifications.subscribe(EVENT_NAME) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record(event)
        end
      end

      def record(event)
        return unless Railscope.enabled?
        return if ignore_path?(event.payload[:path])

        Entry.create!(
          entry_type: "request",
          payload: build_payload(event),
          tags: build_tags(event),
          occurred_at: Time.current
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record request: #{e.message}")
      end

      private

      def build_payload(event)
        {
          path: event.payload[:path],
          method: event.payload[:method],
          status: event.payload[:status],
          duration: event.duration.round(2),
          controller: event.payload[:controller],
          action: event.payload[:action],
          format: event.payload[:format],
          view_runtime: event.payload[:view_runtime]&.round(2),
          db_runtime: event.payload[:db_runtime]&.round(2)
        }
      end

      def build_tags(event)
        tags = ["request", event.payload[:method]&.downcase].compact
        tags << "error" if event.payload[:status].to_i >= 400
        tags << "slow" if event.duration > 1000
        tags
      end

      def ignore_path?(path)
        return false if path.nil?

        path.start_with?("/railscope")
      end
    end
  end
end
