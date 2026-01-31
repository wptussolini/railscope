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
      context = Context.current
      context.request_id = env["action_dispatch.request_id"] || SecureRandom.uuid
      context[:path] = env["PATH_INFO"]
      context[:method] = env["REQUEST_METHOD"]
    end
  end
end
