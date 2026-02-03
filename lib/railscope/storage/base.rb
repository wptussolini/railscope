# frozen_string_literal: true

module Railscope
  module Storage
    class Base
      # Write a new entry
      # @param attributes [Hash] entry attributes
      # @return [EntryData] the created entry
      def write(attributes)
        raise NotImplementedError, "#{self.class}#write must be implemented"
      end

      # Find an entry by UUID
      # @param uuid [String] the entry UUID
      # @return [EntryData, nil] the entry or nil if not found
      def find(uuid)
        raise NotImplementedError, "#{self.class}#find must be implemented"
      end

      # Find an entry by UUID, raising if not found
      # @param uuid [String] the entry UUID
      # @return [EntryData] the entry
      # @raise [RecordNotFound] if entry not found
      def find!(uuid)
        find(uuid) || raise(RecordNotFound, "Entry not found: #{uuid}")
      end

      # List entries with optional filters
      # @param filters [Hash] optional filters (:type, :tag, :batch_id, :family_hash)
      # @param page [Integer] page number (1-indexed)
      # @param per_page [Integer] entries per page
      # @param displayable_only [Boolean] only return displayable entries
      # @return [Array<EntryData>] list of entries
      def all(filters: {}, page: 1, per_page: 25, displayable_only: true)
        raise NotImplementedError, "#{self.class}#all must be implemented"
      end

      # Count entries with optional filters
      # @param filters [Hash] optional filters
      # @param displayable_only [Boolean] only count displayable entries
      # @return [Integer] count of entries
      def count(filters: {}, displayable_only: true)
        raise NotImplementedError, "#{self.class}#count must be implemented"
      end

      # Get all entries in a batch
      # @param batch_id [String] the batch UUID
      # @return [Array<EntryData>] list of entries in the batch
      def for_batch(batch_id)
        raise NotImplementedError, "#{self.class}#for_batch must be implemented"
      end

      # Get all entries with the same family hash
      # @param family_hash [String] the family hash
      # @param page [Integer] page number
      # @param per_page [Integer] entries per page
      # @return [Array<EntryData>] list of entries with same family
      def for_family(family_hash, page: 1, per_page: 25)
        raise NotImplementedError, "#{self.class}#for_family must be implemented"
      end

      # Count entries with the same family hash
      # @param family_hash [String] the family hash
      # @return [Integer] count of entries
      def family_count(family_hash)
        raise NotImplementedError, "#{self.class}#family_count must be implemented"
      end

      # Delete all entries
      # @return [Integer] number of deleted entries
      def destroy_all!
        raise NotImplementedError, "#{self.class}#destroy_all! must be implemented"
      end

      # Delete expired entries (older than retention_days)
      # @return [Integer] number of deleted entries
      def destroy_expired!
        raise NotImplementedError, "#{self.class}#destroy_expired! must be implemented"
      end

      # Check if storage is available and ready
      # @return [Boolean] true if ready
      def ready?
        raise NotImplementedError, "#{self.class}#ready? must be implemented"
      end
    end

    class RecordNotFound < StandardError; end
  end
end
