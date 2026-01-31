# frozen_string_literal: true

module Railscope
  module Subscribers
    class JobSubscriber
      ENQUEUE_EVENT = "enqueue.active_job"
      PERFORM_EVENT = "perform.active_job"

      def self.subscribe
        ActiveSupport::Notifications.subscribe(ENQUEUE_EVENT) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record_enqueue(event)
        end

        ActiveSupport::Notifications.subscribe(PERFORM_EVENT) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record_perform(event)
        end
      end

      def record_enqueue(event)
        return unless Railscope.enabled?
        return if ignore_job?(event.payload[:job])

        Entry.create!(
          entry_type: "job_enqueue",
          payload: build_enqueue_payload(event),
          tags: build_tags(event, "enqueue"),
          occurred_at: Time.current
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record job enqueue: #{e.message}")
      end

      def record_perform(event)
        return unless Railscope.enabled?
        return if ignore_job?(event.payload[:job])

        Entry.create!(
          entry_type: "job_perform",
          payload: build_perform_payload(event),
          tags: build_tags(event, "perform"),
          occurred_at: Time.current
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record job perform: #{e.message}")
      end

      private

      def build_enqueue_payload(event)
        job = event.payload[:job]

        {
          job_id: job.job_id,
          job_class: job.class.name,
          queue_name: job.queue_name,
          arguments: safe_arguments(job.arguments),
          scheduled_at: job.scheduled_at,
          priority: job.priority
        }
      end

      def build_perform_payload(event)
        job = event.payload[:job]

        {
          job_id: job.job_id,
          job_class: job.class.name,
          queue_name: job.queue_name,
          arguments: safe_arguments(job.arguments),
          duration: event.duration.round(2),
          executions: job.executions,
          exception: extract_exception(event)
        }.compact
      end

      def build_tags(event, action)
        job = event.payload[:job]
        tags = ["job", action, job.queue_name]
        tags << "failed" if event.payload[:exception_object].present?
        tags << job.class.name.underscore.gsub("/", "_")
        tags.compact
      end

      def safe_arguments(arguments)
        arguments.map do |arg|
          case arg
          when String, Numeric, TrueClass, FalseClass, NilClass
            arg
          when Hash
            arg.transform_values { |v| safe_value(v) }
          when Array
            arg.map { |v| safe_value(v) }
          else
            arg.to_s
          end
        end
      rescue StandardError
        ["[unserializable]"]
      end

      def safe_value(value)
        case value
        when String, Numeric, TrueClass, FalseClass, NilClass
          value
        else
          value.to_s
        end
      end

      def extract_exception(event)
        return nil unless event.payload[:exception_object]

        exception = event.payload[:exception_object]
        {
          class: exception.class.name,
          message: exception.message,
          backtrace: exception.backtrace&.first(10)
        }
      end

      def ignore_job?(job)
        job.class.name.start_with?("Railscope::")
      end
    end
  end
end
