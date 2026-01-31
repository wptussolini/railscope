# frozen_string_literal: true

require_relative "railscope/version"
require_relative "railscope/context"
require_relative "railscope/filter"
require_relative "railscope/middleware"
require_relative "railscope/engine"

module Railscope
  class Error < StandardError; end
  class AuthenticationError < Error; end

  class << self
    attr_writer :retention_days
    attr_accessor :authenticate_with

    def enabled?
      %w[true 1].include?(ENV.fetch("RAILSCOPE_ENABLED", nil))
    end

    def retention_days
      @retention_days ||= ENV.fetch("RAILSCOPE_RETENTION_DAYS", 7).to_i
    end

    def context
      Context.current
    end

    def authenticate(controller)
      return true if authenticate_with.nil?

      authenticate_with.call(controller)
    end

    def filter(payload)
      Filter.filter(payload)
    end

    def add_sensitive_keys(*keys)
      Filter.add_sensitive_keys(*keys)
    end

    def configure
      yield self
    end
  end
end
