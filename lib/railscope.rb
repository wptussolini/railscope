# frozen_string_literal: true

require_relative "railscope/version"
require_relative "railscope/engine"

module Railscope
  class Error < StandardError; end

  class << self
    attr_writer :retention_days

    def enabled?
      %w[true 1].include?(ENV.fetch("RAILSCOPE_ENABLED", nil))
    end

    def retention_days
      @retention_days ||= ENV.fetch("RAILSCOPE_RETENTION_DAYS", 7).to_i
    end
  end
end
