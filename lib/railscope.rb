# frozen_string_literal: true

require_relative "railscope/version"
require_relative "railscope/context"
require_relative "railscope/filter"
require_relative "railscope/entry_data"
require_relative "railscope/storage/base"
require_relative "railscope/storage/database"
require_relative "railscope/storage/redis_storage"
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

  # Storage backends
  STORAGE_DATABASE = :database
  STORAGE_REDIS = :redis

  class << self
    attr_writer :retention_days, :redis, :storage_backend, :ignore_paths
    attr_accessor :authenticate_with

    def enabled=(value)
      @enabled = value
    end

    def enabled?
      return @enabled if defined?(@enabled) && !@enabled.nil?

      %w[true 1].include?(ENV.fetch("RAILSCOPE_ENABLED", nil))
    end

    def retention_days
      @retention_days ||= ENV.fetch("RAILSCOPE_RETENTION_DAYS", 7).to_i
    end

    # Storage configuration
    # @return [Symbol] :database or :redis
    def storage_backend
      return @storage_backend if defined?(@storage_backend) && @storage_backend

      backend = ENV.fetch("RAILSCOPE_STORAGE", "database").to_sym
      @storage_backend = %i[database redis].include?(backend) ? backend : STORAGE_DATABASE
    end

    # Get the storage adapter instance
    # @return [Storage::Base] the configured storage adapter
    def storage
      @storage ||= case storage_backend
                   when STORAGE_REDIS
                     Storage::RedisStorage.new
                   else
                     Storage::Database.new
                   end
    end

    # Reset storage (useful for testing)
    def reset_storage!
      @storage = nil
      @storage_backend = nil
    end

    # Redis configuration
    def redis
      return @redis if defined?(@redis) && @redis

      redis_url = ENV.fetch("RAILSCOPE_REDIS_URL", nil) || ENV.fetch("REDIS_URL", nil)
      return nil unless redis_url

      require "redis"
      @redis = Redis.new(url: redis_url)
    end

    def redis_available?
      return false unless redis

      redis.ping == "PONG"
    rescue StandardError
      false
    end

    def ignore_paths
      @ignore_paths ||= DEFAULT_IGNORE_PATHS.dup
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

      @checking_ready = true
      @ready = storage.ready?
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
