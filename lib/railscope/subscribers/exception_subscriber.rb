# frozen_string_literal: true

module Railscope
  module Subscribers
    class ExceptionSubscriber
      EVENT_NAME = "process_action.action_controller"

      def self.subscribe
        ActiveSupport::Notifications.subscribe(EVENT_NAME) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record(event)
        end
      end

      def record(event)
        return unless Railscope.enabled?
        return unless event.payload[:exception].present?

        Entry.create!(
          entry_type: "exception",
          payload: build_payload(event),
          tags: build_tags(event),
          occurred_at: Time.current
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record exception: #{e.message}")
      end

      private

      def build_payload(event)
        exception_class, exception_message = event.payload[:exception]
        exception_object = event.payload[:exception_object]

        {
          class: exception_class,
          message: exception_message,
          backtrace: exception_object&.backtrace&.first(20),
          path: event.payload[:path],
          method: event.payload[:method],
          controller: event.payload[:controller],
          action: event.payload[:action],
          params: filtered_params(event.payload[:params]),
          status: event.payload[:status]
        }
      end

      def build_tags(event)
        exception_class = event.payload[:exception]&.first
        tags = ["exception"]
        tags << exception_class.underscore.gsub("/", "_") if exception_class
        tags
      end

      def filtered_params(params)
        return {} if params.nil?

        params.except(:controller, :action, :format).to_h.deep_transform_values do |value|
          value.is_a?(String) && value.length > 200 ? "#{value[0..200]}..." : value
        end
      rescue StandardError
        {}
      end
    end
  end
end
