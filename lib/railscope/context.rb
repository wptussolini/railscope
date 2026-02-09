# frozen_string_literal: true

module Railscope
  class Context
    THREAD_KEY = :railscope_context

    class << self
      def current
        Thread.current[THREAD_KEY] ||= new
      end

      def clear!
        Thread.current[THREAD_KEY] = nil
      end

      def with(**attributes)
        previous = current.to_h.dup
        attributes.each { |key, value| current[key] = value }
        yield
      ensure
        clear!
        previous.each { |key, value| current[key] = value }
      end
    end

    def initialize
      @store = {}
    end

    def []=(key, value)
      @store[key.to_sym] = value
    end

    def [](key)
      @store[key.to_sym]
    end

    def fetch(key, default = nil)
      @store.fetch(key.to_sym, default)
    end

    def merge!(hash)
      hash.each { |key, value| self[key] = value }
      self
    end

    def to_h
      @store.dup
    end

    # Batch ID groups all entries from a single request/job
    def batch_id
      self[:batch_id] ||= SecureRandom.uuid
    end

    def batch_id=(value)
      self[:batch_id] = value
    end

    # Request ID from Rails (for correlation with Rails logs)
    def request_id
      self[:request_id]
    end

    def request_id=(value)
      self[:request_id] = value
    end

    def tags
      self[:tags] ||= []
    end

    def add_tag(tag)
      tags << tag unless tags.include?(tag)
    end

    def add_tags(*new_tags)
      new_tags.flatten.each { |tag| add_tag(tag) }
    end

    def user_id
      self[:user_id]
    end

    def user_id=(value)
      self[:user_id] = value
    end

    delegate :empty?, to: :@store
  end
end
