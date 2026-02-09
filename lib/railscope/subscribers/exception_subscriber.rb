# frozen_string_literal: true

module Railscope
  module Subscribers
    class ExceptionSubscriber < BaseSubscriber
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
        return if event.payload[:exception].blank?

        create_entry!(
          entry_type: "exception",
          payload: build_payload(event),
          tags: build_tags(event),
          family_hash: build_family_hash(event),
          should_display_on_index: true
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record exception: #{e.message}")
      end

      private

      def build_payload(event)
        exception_class, exception_message = event.payload[:exception]
        exception_object = event.payload[:exception_object]
        file, line = extract_file_and_line(exception_object)
        line_preview = extract_line_preview(file, line)

        {
          class: exception_class,
          message: exception_message,
          file: file,
          line: line,
          line_preview: line_preview,
          backtrace: exception_object&.backtrace&.first(20),
          path: event.payload[:path],
          method: event.payload[:method],
          controller: event.payload[:controller],
          action: event.payload[:action],
          params: filtered_params(event.payload[:params]),
          status: event.payload[:status]
        }
      end

      def extract_file_and_line(exception)
        return [nil, nil] unless exception&.backtrace&.any?

        first_line = exception.backtrace.first
        if first_line =~ /\A(.+):(\d+)/
          [Regexp.last_match(1), Regexp.last_match(2).to_i]
        else
          [nil, nil]
        end
      end

      # Extract code context around the exception line (like Telescope)
      def extract_line_preview(file, line)
        return nil unless file && line && File.exist?(file)

        lines = File.readlines(file)
        start_line = [line - 10, 1].max
        end_line = [line + 9, lines.length].min

        result = {}
        (start_line..end_line).each do |line_num|
          result[line_num] = lines[line_num - 1]&.chomp || ""
        end
        result
      rescue StandardError
        nil
      end

      def build_tags(event)
        exception_class = event.payload[:exception]&.first
        tags = ["exception"]
        tags << exception_class.underscore.tr("/", "_") if exception_class
        tags
      end

      # Group exceptions by class and location (controller#action)
      def build_family_hash(event)
        exception_class = event.payload[:exception]&.first
        controller = event.payload[:controller]
        action = event.payload[:action]
        generate_family_hash("exception", exception_class, controller, action)
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
