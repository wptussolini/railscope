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
        request = event.payload[:request]
        headers = extract_headers(event.payload[:headers] || request&.headers)

        {
          path: event.payload[:path],
          method: event.payload[:method],
          status: event.payload[:status],
          duration: event.duration.round(2),
          controller: event.payload[:controller],
          action: event.payload[:action],
          controller_action: "#{event.payload[:controller]}@#{event.payload[:action]}",
          format: event.payload[:format],
          view_runtime: event.payload[:view_runtime]&.round(2),
          db_runtime: event.payload[:db_runtime]&.round(2),
          ip_address: context[:ip_address] || extract_ip(request),
          hostname: Socket.gethostname,
          # Request data
          payload: filter_params(event.payload[:params]),
          headers: headers
        }.compact
      end

      def extract_headers(headers)
        return {} unless headers

        result = {}
        headers.each do |key, value|
          # Only include HTTP headers, skip internal Rails headers
          if key.start_with?("HTTP_") || %w[CONTENT_TYPE CONTENT_LENGTH].include?(key)
            header_name = key.sub(/^HTTP_/, "").split("_").map(&:capitalize).join("-")
            result[header_name] = value
          end
        end
        result
      rescue StandardError
        {}
      end

      def extract_ip(request)
        return nil unless request

        request.try(:remote_ip) || request.try(:ip)
      rescue StandardError
        nil
      end

      def filter_params(params)
        return nil if params.blank?

        # Convert ActionController::Parameters to hash
        params_hash = if params.respond_to?(:to_unsafe_h)
                        params.to_unsafe_h
                      elsif params.respond_to?(:to_hash)
                        params.to_hash
                      else
                        params.to_h
                      end

        # Remove controller/action/format (both string and symbol keys)
        filtered = params_hash.reject { |k, _| %w[controller action format].include?(k.to_s) }

        return nil if filtered.empty?

        Railscope.filter(filtered)
      rescue StandardError => e
        Rails.logger.error("[Railscope] filter_params error: #{e.message}")
        nil
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
