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
      context.request_id = env["action_dispatch.request_id"] || SecureRandom.uuid
      context[:path] = path
      context[:method] = env["REQUEST_METHOD"]
      context[:recording] = Railscope.should_record?(path: path)
    end
  end
end
