# frozen_string_literal: true

require_relative "railscope/version"
require_relative "railscope/context"
require_relative "railscope/filter"
require_relative "railscope/middleware"
require_relative "railscope/engine"

module Railscope
  class Error < StandardError; end
  class AuthenticationError < Error; end

  DEFAULT_IGNORE_PATHS = %w[
    /railscope
    /assets
    /packs
    /cable
  ].freeze

  class << self
    attr_writer :retention_days
    attr_accessor :authenticate_with

    def enabled?
      %w[true 1].include?(ENV.fetch("RAILSCOPE_ENABLED", nil))
    end

    def retention_days
      @retention_days ||= ENV.fetch("RAILSCOPE_RETENTION_DAYS", 7).to_i
    end

    def ignore_paths
      @ignore_paths ||= DEFAULT_IGNORE_PATHS.dup
    end

    def ignore_paths=(paths)
      @ignore_paths = paths
    end

    def add_ignore_paths(*paths)
      @ignore_paths = ignore_paths.concat(paths.flatten).uniq
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

    def should_record?(path: nil)
      return false unless enabled?
      return false unless ready?
      return false if path && ignore_path?(path)

      true
    end

    def ready?
      return @ready if defined?(@ready) && !@ready.nil?
      return false if @checking_ready
      return false if defined?(Rails::Generators)

      @checking_ready = true
      @ready = Entry.table_exists?
      @checking_ready = false
      @ready
    rescue StandardError
      @checking_ready = false
      false
    end

    def reset_ready!
      @ready = nil
    end

    def ignore_path?(path)
      return false if path.nil?

      ignore_paths.any? { |ignored| path.start_with?(ignored) }
    end

    def configure
      yield self
    end
  end
end
