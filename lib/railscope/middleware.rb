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
        if response.respond_to?(:body)
          body = response.body.to_s
        end
      end

      # Try action_controller.instance
      if body.empty? && env["action_controller.instance"]
        controller = env["action_controller.instance"]
        if controller.respond_to?(:response) && controller.response.respond_to?(:body)
          body = controller.response.body.to_s
        end
      end

      # Truncate if too large
      if body.bytesize > RESPONSE_SIZE_LIMIT
        body = body.byteslice(0, RESPONSE_SIZE_LIMIT)
      end

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
      response_headers = headers.respond_to?(:to_h) ? headers.to_h : headers.to_hash rescue {}
      session_data = extract_session_from_env(context_data[:env])

      # Parse JSON if applicable
      content_type = response_headers["Content-Type"] || response_headers["content-type"] || ""
      looks_like_json = response_body.to_s.start_with?("{") || response_body.to_s.start_with?("[")
      is_json = content_type.include?("application/json") || looks_like_json

      parsed_body = if is_json
                      JSON.parse(response_body) rescue response_body
                    else
                      response_body
                    end

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
