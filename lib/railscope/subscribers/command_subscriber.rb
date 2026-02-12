# frozen_string_literal: true

module Railscope
  module Subscribers
    class CommandSubscriber < BaseSubscriber
      class << self
        def subscribe
          return unless defined?(Rake::Task)

          instrument_rake_tasks
        end

        private

        def instrument_rake_tasks
          Rake::Task.tasks.each do |task|
            instrument_task(task)
          end

          # Also instrument tasks defined after initial load
          Rake::Task.singleton_class.prepend(TaskInstrumentation)
        end

        def instrument_task(task)
          return if task.name.start_with?("railscope:")
          return if Railscope.ignore_command?(task.name)
          return if instrumented_tasks.include?(task.name)

          instrumented_tasks << task.name

          original_execute = task.method(:execute)

          task.define_singleton_method(:execute) do |args = nil|
            CommandSubscriber.new.record(task, args) do
              original_execute.call(args)
            end
          end
        end

        def instrumented_tasks
          @instrumented_tasks ||= Set.new
        end
      end

      # Module to intercept new task definitions
      module TaskInstrumentation
        def define_task(*args, &block)
          task = super
          CommandSubscriber.send(:instrument_task, task) if task.is_a?(Rake::Task)
          task
        end
      end

      def record(task, args)
        return yield unless Railscope.enabled?
        return yield unless Railscope.ready?

        # Setup context for this command (similar to middleware for HTTP requests)
        setup_command_context(task)

        start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        exit_code = 0
        exception_info = nil
        caught_exception = nil

        begin
          result = yield
          result
        rescue SystemExit => e
          exit_code = e.status
          raise
        rescue Exception => e
          exit_code = 1
          caught_exception = e
          exception_info = {
            class: e.class.name,
            message: e.message,
            backtrace: e.backtrace&.first(20)
          }
          raise
        ensure
          duration = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(2)

          # Create the command entry
          create_entry!(
            entry_type: "command",
            payload: build_payload(task, args, duration, exit_code, exception_info),
            tags: build_tags(task, exit_code),
            family_hash: generate_family_hash("command", task.name),
            should_display_on_index: true
          )

          # Also create a separate exception entry (appears in exceptions list)
          create_exception_entry!(task, caught_exception) if caught_exception

          # Clear context after command completes
          Railscope::Context.clear!
        end
      end

      private

      def setup_command_context(task)
        ctx = Railscope::Context.current
        ctx.batch_id = SecureRandom.uuid
        ctx[:recording] = true
        ctx[:command] = task.name
      end

      def build_payload(task, args, duration, exit_code, exception_info)
        {
          command: task.name,
          arguments: serialize_args(args),
          options: extract_options,
          description: task.comment,
          hostname: Socket.gethostname,
          duration: duration,
          exit_code: exit_code,
          exception: exception_info
        }.compact
      end

      def build_tags(task, exit_code)
        tags = ["command"]
        tags << "failed" if exit_code != 0
        tags << task.name.split(":").first if task.name.include?(":")
        tags
      end

      def create_exception_entry!(task, exception)
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
            source: "command",
            command: task.name
          },
          tags: build_exception_tags(exception),
          family_hash: generate_family_hash("exception", exception.class.name, "command", task.name),
          should_display_on_index: true
        )
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

      def build_exception_tags(exception)
        tags = %w[exception command]
        tags << exception.class.name.underscore.tr("/", "_") if exception.class.name
        tags
      end

      def serialize_args(args)
        return {} if args.nil?

        case args
        when Rake::TaskArguments
          args.to_hash.transform_keys(&:to_s)
        when Hash
          args.transform_keys(&:to_s)
        else
          { "value" => args.to_s }
        end
      rescue StandardError
        {}
      end

      def extract_options
        # Only capture options that are actually passed (unlike Telescope which shows all defaults)
        options = {}

        ARGV.each do |arg|
          case arg
          when "--trace", "-t"
            options["trace"] = true
          when "--dry-run", "-n"
            options["dry-run"] = true
          when "--verbose", "-v"
            options["verbose"] = true
          when "--silent", "-s"
            options["silent"] = true
          when "--quiet", "-q"
            options["quiet"] = true
          when "--help", "-h", "-H"
            options["help"] = true
          when "--version", "-V"
            options["version"] = true
          when "--prereqs", "-P"
            options["prereqs"] = true
          when /^--(\w[\w-]*)=(.*)$/
            options[Regexp.last_match(1)] = Regexp.last_match(2)
          when /^--(\w[\w-]*)$/
            options[Regexp.last_match(1)] = true
          when /^-(\w)$/
            options[Regexp.last_match(1)] = true
          end
        end

        options
      rescue StandardError
        {}
      end
    end
  end
end
