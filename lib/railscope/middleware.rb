# frozen_string_literal: true

module Railscope
  class Middleware
    # Maximum size for response body capture (64KB like Telescope)
    RESPONSE_SIZE_LIMIT = 64 * 1024

    def initialize(app)
      @app = app
    end

    def call(env)
      return @app.call(env) unless Railscope.enabled?

      setup_context(env)
      status, headers, response = @app.call(env)

      # Capture response body for recording
      context = Context.current
      if context[:recording]
        # Read body from env (where Rails stores the response)
        body_content = extract_body_from_env(env)

        context_data = {
          batch_id: context.batch_id,
          env: env,
          headers: headers
        }

        # Update entry with response data
        update_entry_async(context_data, body_content)
      end

      [status, headers, response]
    ensure
      Context.clear!
    end

    def extract_body_from_env(env)
      body = ""

      # Try to get from ActionDispatch::Response stored in env
      if env["action_dispatch.response"]
        response = env["action_dispatch.response"]
        body = response.body.to_s if response.respond_to?(:body)
      end

      # Try action_controller.instance
      if body.empty? && env["action_controller.instance"]
        controller = env["action_controller.instance"]
        if controller.respond_to?(:response) && controller.response.respond_to?(:body)
          body = controller.response.body.to_s
        end
      end

      # Truncate if too large
      body = body.byteslice(0, RESPONSE_SIZE_LIMIT) if body.bytesize > RESPONSE_SIZE_LIMIT

      body
    rescue StandardError => e
      Rails.logger.debug("[Railscope] Failed to extract body: #{e.message}")
      ""
    end

    def update_entry_async(context_data, body_content)
      # Update synchronously for now (could be made async later)
      self.class.update_entry_with_response(context_data, body_content)
    rescue StandardError => e
      Rails.logger.debug("[Railscope] Failed to update entry: #{e.message}")
    end

    def self.update_entry_with_response(context_data, response_body)
      return unless Railscope.ready?

      headers = context_data[:headers]
      response_headers = begin
        headers.respond_to?(:to_h) ? headers.to_h : headers.to_hash
      rescue StandardError
        {}
      end
      session_data = extract_session_from_env(context_data[:env])

      # Determine response type and handle accordingly (like Telescope)
      content_type = response_headers["Content-Type"] || response_headers["content-type"] || ""
      parsed_body = parse_response_body(response_body, content_type, context_data[:env])

      payload_updates = {
        "response" => parsed_body.presence,
        "response_headers" => response_headers,
        "session" => session_data
      }

      storage = Railscope.storage

      if storage.is_a?(Railscope::Storage::Database)
        entry = Entry.where(batch_id: context_data[:batch_id], entry_type: "request").order(created_at: :desc).first
        return unless entry

        entry.payload = entry.payload.merge(payload_updates)
        entry.save!

      elsif storage.respond_to?(:update_by_batch)
        storage.update_by_batch(
          batch_id: context_data[:batch_id],
          entry_type: "request",
          payload_updates: payload_updates
        )
      end
    rescue StandardError => e
      Rails.logger.debug("[Railscope] Failed to update entry with response: #{e.message}")
    end

    def self.parse_response_body(response_body, content_type, env)
      body_str = response_body.to_s

      # Empty response
      return "Empty Response" if body_str.blank?

      # Redirect
      if env && (location = env["action_dispatch.redirect_url"])
        return "Redirected to #{location}"
      end

      # JSON response
      if content_type.include?("application/json") || body_str.match?(/\A\s*[\[{]/)
        begin
          return JSON.parse(body_str)
        rescue StandardError
          return body_str.truncate(2000)
        end
      end

      # Plain text response
      if content_type.include?("text/plain")
        return body_str.truncate(2000)
      end

      # HTML view response — extract template path and data like Telescope
      extract_view_response(env) || "HTML Response"
    end

    def self.extract_view_response(env)
      return nil unless env

      controller = env["action_controller.instance"]
      return nil unless controller

      view_path = resolve_view_path(controller)
      return nil unless view_path

      {
        "view" => view_path,
        "data" => extract_controller_data(controller)
      }
    rescue StandardError
      nil
    end

    def self.resolve_view_path(controller)
      # Try to get the actual rendered template from the controller
      if controller.respond_to?(:rendered_format, true) || controller.respond_to?(:controller_path)
        template_path = "app/views/#{controller.controller_path}/#{controller.action_name}"

        # Try to find the actual file with extension
        if defined?(Rails.root)
          candidates = Dir.glob(Rails.root.join("#{template_path}.*"))
          return candidates.first&.sub("#{Rails.root}/", "") if candidates.any?
        end

        template_path
      end
    rescue StandardError
      nil
    end

    def self.extract_controller_data(controller)
      data = {}

      controller.instance_variables.each do |ivar|
        name = ivar.to_s.delete_prefix("@")

        # Skip internal Rails/controller variables
        next if name.start_with?("_")
        next if IGNORED_INSTANCE_VARS.include?(name)

        value = controller.instance_variable_get(ivar)
        data[name] = safe_serialize(value)
      end

      data.presence || {}
    rescue StandardError
      {}
    end

    IGNORED_INSTANCE_VARS = %w[
      request response marked_for_same_origin_verification
      performed_redirect action_has_layout lookup_context
      view_context_class current_renderer view_renderer
      action_name pressed_key action_status response_body
    ].freeze

    def self.safe_serialize(value, depth: 0)
      return "..." if depth > 3

      case value
      when String, Numeric, TrueClass, FalseClass, NilClass
        value
      when Symbol
        value.to_s
      when Array
        value.first(20).map { |v| safe_serialize(v, depth: depth + 1) }
      when Hash
        value.transform_values { |v| safe_serialize(v, depth: depth + 1) }
      when ActiveRecord::Base
        { _class: value.class.name, id: value.try(:id) }
      when ActiveRecord::Relation
        { _class: value.klass.name, count: value.count }
      else
        value.class.name
      end
    rescue StandardError
      value.class.name
    end

    def self.extract_session_from_env(env)
      return {} unless env

      session = env["rack.session"] || env["action_dispatch.request.session"]
      return {} unless session

      session.to_h.transform_keys(&:to_s).except("_csrf_token", "session_id")
    rescue StandardError
      {}
    end

    private

    def setup_context(env)
      path = env["PATH_INFO"]
      context = Context.current

      # Generate a new batch_id for this request
      context.batch_id = SecureRandom.uuid

      # Use Rails request_id if available, otherwise use batch_id
      context.request_id = env["action_dispatch.request_id"] || context.batch_id

      context[:path] = path
      context[:method] = env["REQUEST_METHOD"]
      context[:ip_address] = extract_ip(env)
      context[:recording] = Railscope.should_record?(path: path)

      # Store env reference to capture session later
      context[:env] = env
    end

    def extract_ip(env)
      env["HTTP_X_FORWARDED_FOR"]&.split(",")&.first&.strip ||
        env["HTTP_X_REAL_IP"] ||
        env["REMOTE_ADDR"]
    end
  end
end
