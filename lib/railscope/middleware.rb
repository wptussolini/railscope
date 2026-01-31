# frozen_string_literal: true

module Railscope
  class Middleware
    def initialize(app)
      @app = app
    end

    def call(env)
      return @app.call(env) unless Railscope.enabled?

      setup_context(env)
      @app.call(env)
    ensure
      Context.clear!
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
      context[:recording] = Railscope.should_record?(path: path)
    end
  end
end
