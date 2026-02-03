# frozen_string_literal: true

module Railscope
  # Plain Ruby object representing an entry, used by both storage adapters
  # This provides a consistent interface regardless of storage backend
  class EntryData
    ATTRIBUTES = %i[
      uuid
      batch_id
      family_hash
      entry_type
      payload
      tags
      should_display_on_index
      occurred_at
      created_at
      updated_at
    ].freeze

    attr_accessor(*ATTRIBUTES)

    # Alias id to uuid for compatibility with existing code
    alias id uuid

    def initialize(attributes = {})
      attributes = attributes.symbolize_keys if attributes.respond_to?(:symbolize_keys)

      ATTRIBUTES.each do |attr|
        value = attributes[attr]
        # Handle time parsing for string values
        if %i[occurred_at created_at updated_at].include?(attr) && value.is_a?(String)
          value = Time.zone.parse(value) rescue value
        end
        send("#{attr}=", value)
      end

      # Set defaults
      self.tags ||= []
      self.payload ||= {}
      self.should_display_on_index = true if should_display_on_index.nil?
    end

    def to_h
      ATTRIBUTES.each_with_object({}) do |attr, hash|
        hash[attr] = send(attr)
      end
    end

    def to_json(*args)
      serializable_hash.to_json(*args)
    end

    def serializable_hash
      to_h.transform_values do |value|
        case value
        when Time, DateTime, ActiveSupport::TimeWithZone
          value.iso8601(6)
        else
          value
        end
      end
    end

    def displayable?
      should_display_on_index
    end

    # For compatibility with ActiveRecord-style access
    def [](key)
      send(key) if respond_to?(key)
    end

    def []=(key, value)
      send("#{key}=", value) if respond_to?("#{key}=")
    end

    # Comparison for sorting
    def <=>(other)
      return nil unless other.is_a?(EntryData)

      other.occurred_at <=> occurred_at # desc by default
    end

    class << self
      # Create from ActiveRecord Entry model
      def from_active_record(record)
        new(
          uuid: record.uuid,
          batch_id: record.batch_id,
          family_hash: record.family_hash,
          entry_type: record.entry_type,
          payload: record.payload,
          tags: record.tags,
          should_display_on_index: record.should_display_on_index,
          occurred_at: record.occurred_at,
          created_at: record.created_at,
          updated_at: record.updated_at
        )
      end

      # Create from JSON hash (Redis)
      def from_json(json_string)
        data = JSON.parse(json_string, symbolize_names: true)
        new(data)
      end
    end
  end
end
