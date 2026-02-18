# frozen_string_literal: true

module Railscope
  module Subscribers
    class JobSubscriber < BaseSubscriber
      ENQUEUE_EVENT = "enqueue.active_job"
      PERFORM_START_EVENT = "perform_start.active_job"
      PERFORM_EVENT = "perform.active_job"

      def self.subscribe
        return if @subscribed

        @subscribed = true

        ActiveSupport::Notifications.subscribe(ENQUEUE_EVENT) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record_enqueue(event)
        end

        # Setup context BEFORE job runs (so queries are linked)
        ActiveSupport::Notifications.subscribe(PERFORM_START_EVENT) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.setup_perform_context(event)
        end

        # Record result AFTER job completes
        ActiveSupport::Notifications.subscribe(PERFORM_EVENT) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record_perform(event)
        end
      end

      def setup_perform_context(event)
        return unless Railscope.enabled?
        return if ignore_job?(event.payload[:job])

        job = event.payload[:job]
        setup_job_context(job)
      end

      def record_enqueue(event)
        return unless Railscope.enabled?
        return unless Railscope.ready?
        return if ignore_job?(event.payload[:job])

        job = event.payload[:job]

        create_entry!(
          entry_type: "job_enqueue",
          payload: build_enqueue_payload(event),
          tags: build_tags(event, "enqueue"),
          family_hash: build_family_hash(job),
          should_display_on_index: true
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record job enqueue: #{e.message}")
      end

      def record_perform(event)
        return unless Railscope.enabled?
        return unless Railscope.ready?
        return if ignore_job?(event.payload[:job])

        job = event.payload[:job]
        exception_object = event.payload[:exception_object]

        # Create the job perform entry
        create_entry!(
          entry_type: "job_perform",
          payload: build_perform_payload(event),
          tags: build_tags(event, "perform"),
          family_hash: build_family_hash(job),
          should_display_on_index: true
        )

        # Also create a separate exception entry if job failed
        create_exception_entry!(job, exception_object) if exception_object

        # In conditional mode: flush if triggered, otherwise entries are discarded with context
        if Railscope.conditional_recording? && context.triggered?
          # Response update for jobs is already in the entry payload, nothing extra needed
        end

        # Clear context after job completes (discards any unflushed buffer)
        Railscope::Context.clear!
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
          connection: job.queue_adapter&.class&.name&.demodulize&.sub("Adapter", ""),
          hostname: Socket.gethostname,
          arguments: safe_arguments(job.arguments),
          scheduled_at: job.scheduled_at,
          priority: job.priority
        }.compact
      end

      def build_perform_payload(event)
        job = event.payload[:job]

        {
          job_id: job.job_id,
          job_class: job.class.name,
          queue_name: job.queue_name,
          connection: job.queue_adapter&.class&.name&.demodulize&.sub("Adapter", ""),
          hostname: Socket.gethostname,
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
        tags << job.class.name.underscore.tr("/", "_")
        tags.compact
      end

      # Group jobs by class name
      def build_family_hash(job)
        generate_family_hash("job", job.class.name)
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
        file, line = extract_file_and_line(exception)
        line_preview = extract_line_preview(file, line)

        {
          class: exception.class.name,
          message: exception.message,
          file: file,
          line: line,
          line_preview: line_preview,
          backtrace: exception.backtrace&.first(20)
        }.compact
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

      def ignore_job?(job)
        job.class.name.start_with?("Railscope::") || Railscope.ignore_job?(job.class.name)
      end

      def setup_job_context(job)
        # Clear any existing context to ensure a fresh batch_id
        Railscope::Context.clear!

        ctx = Railscope::Context.current
        new_batch_id = SecureRandom.uuid
        ctx.batch_id = new_batch_id
        ctx[:recording] = true
        ctx[:job_class] = job.class.name
        ctx[:job_id] = job.job_id
      end

      def create_exception_entry!(job, exception)
        file, line = extract_file_and_line(exception)
        line_preview = extract_line_preview(file, line)

        create_entry!(
          entry_type: "exception",
          payload: {
            class: exception.class.name,
            message: exception.message,
            file: file,
            line: line,
            line_preview: line_preview,
            backtrace: exception.backtrace&.first(20),
            source: "job",
            job_class: job.class.name,
            job_id: job.job_id,
            queue_name: job.queue_name
          }.compact,
          tags: build_exception_tags(exception, job),
          family_hash: generate_family_hash("exception", exception.class.name, "job", job.class.name),
          should_display_on_index: true
        )
      end

      def build_exception_tags(exception, job)
        tags = %w[exception job]
        tags << exception.class.name.underscore.tr("/", "_") if exception.class.name
        tags << job.class.name.underscore.tr("/", "_")
        tags
      end
    end
  end
end
