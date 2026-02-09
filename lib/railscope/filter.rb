# frozen_string_literal: true

module Railscope
  class Filter
    MASK = "[FILTERED]"

    DEFAULT_SENSITIVE_KEYS = %w[
      password
      password_confirmation
      secret
      token
      api_key
      apikey
      access_token
      refresh_token
      authorization
      auth
      credential
      private_key
      secret_key
      credit_card
      card_number
      cvv
      ssn
    ].freeze

    class << self
      def filter(payload)
        return payload unless payload.is_a?(Hash)

        filter_hash(payload.deep_dup)
      end

      def sensitive_keys
        @sensitive_keys ||= build_sensitive_keys
      end

      def add_sensitive_keys(*keys)
        @sensitive_keys = nil
        @custom_keys ||= []
        @custom_keys.concat(keys.map(&:to_s).map(&:downcase))
      end

      def reset_sensitive_keys!
        @sensitive_keys = nil
        @custom_keys = []
      end

      private

      def build_sensitive_keys
        keys = DEFAULT_SENSITIVE_KEYS.dup
        keys.concat(rails_filter_parameters)
        keys.concat(@custom_keys || [])
        keys.uniq
      end

      def rails_filter_parameters
        return [] unless defined?(Rails) && Rails.application

        Rails.application.config.filter_parameters.map do |param|
          param.is_a?(Regexp) ? nil : param.to_s.downcase
        end.compact
      end

      def filter_hash(hash)
        hash.each do |key, value|
          if sensitive_key?(key)
            hash[key] = MASK
          elsif value.is_a?(Hash)
            hash[key] = filter_hash(value)
          elsif value.is_a?(Array)
            hash[key] = filter_array(value)
          elsif value.is_a?(String) && looks_like_secret?(value)
            hash[key] = MASK
          end
        end
        hash
      end

      def filter_array(array)
        array.map do |item|
          case item
          when Hash
            filter_hash(item)
          when Array
            filter_array(item)
          else
            item
          end
        end
      end

      def sensitive_key?(key)
        key_str = key.to_s.downcase
        sensitive_keys.any? { |sensitive| key_str.include?(sensitive) }
      end

      def looks_like_secret?(value)
        return false if value.length < 20

        # Bearer tokens
        return true if value.start_with?("Bearer ")
        # Base64 encoded secrets (common pattern)
        return true if value.match?(%r{\A[A-Za-z0-9+/=]{40,}\z})
        # JWT tokens
        return true if value.match?(/\Aey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\z/)

        false
      end
    end
  end
end
