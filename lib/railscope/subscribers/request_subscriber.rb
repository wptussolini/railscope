# frozen_string_literal: true

module Railscope
  module Subscribers
    class RequestSubscriber < BaseSubscriber
      EVENT_NAME = "process_action.action_controller"

      def self.subscribe
        return if @subscribed

        @subscribed = true

        ActiveSupport::Notifications.subscribe(EVENT_NAME) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record(event)
        end
      end

      def record(event)
        return unless Railscope.enabled?
        return unless Railscope.ready?

        create_entry!(
          entry_type: "request",
          payload: build_payload(event),
          tags: build_tags(event),
          family_hash: build_family_hash(event),
          should_display_on_index: true
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

      # Group requests by controller#action
      def build_family_hash(event)
        controller = event.payload[:controller]
        action = event.payload[:action]
        generate_family_hash("request", controller, action)
      end
    end
  end
end
