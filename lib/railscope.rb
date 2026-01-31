# frozen_string_literal: true

require_relative "railscope/version"
require_relative "railscope/engine"

module Railscope
  class Error < StandardError; end

  def self.enabled?
    %w[true 1].include?(ENV.fetch("RAILSCOPE_ENABLED", nil))
  end
end
