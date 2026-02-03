# frozen_string_literal: true

module Railscope
  module Storage
    class Database < Base
      def write(attributes)
        # Remove uuid if present - let the database generate it
        attrs = attributes.except(:uuid, :created_at, :updated_at)
        record = Entry.create!(attrs)
        EntryData.from_active_record(record)
      end

      def find(uuid)
        record = Entry.find_by_uuid(uuid)
        return nil unless record

        EntryData.from_active_record(record)
      end

      def all(filters: {}, page: 1, per_page: 25, displayable_only: true)
        scope = build_scope(filters, displayable_only)
        records = scope.recent.limit(per_page).offset((page - 1) * per_page)
        records.map { |r| EntryData.from_active_record(r) }
      end

      def count(filters: {}, displayable_only: true)
        build_scope(filters, displayable_only).count
      end

      def for_batch(batch_id)
        records = Entry.for_batch(batch_id).order(:occurred_at)
        records.map { |r| EntryData.from_active_record(r) }
      end

      def for_family(family_hash, page: 1, per_page: 25)
        records = Entry.for_family(family_hash).recent.limit(per_page).offset((page - 1) * per_page)
        records.map { |r| EntryData.from_active_record(r) }
      end

      def family_count(family_hash)
        Entry.for_family(family_hash).count
      end

      def destroy_all!
        Entry.delete_all
      end

      def destroy_expired!
        total_deleted = 0
        batch_size = 1000

        loop do
          expired_ids = Entry.expired.limit(batch_size).pluck(:uuid)
          break if expired_ids.empty?

          deleted = Entry.where(uuid: expired_ids).delete_all
          total_deleted += deleted
          break if deleted < batch_size
        end

        total_deleted
      end

      def ready?
        Entry.table_exists?
      rescue StandardError
        false
      end

      private

      def build_scope(filters, displayable_only)
        scope = Entry.all
        scope = scope.displayable if displayable_only
        scope = scope.by_type(filters[:type]) if filters[:type].present?
        scope = scope.with_tag(filters[:tag]) if filters[:tag].present?
        scope = scope.for_batch(filters[:batch_id]) if filters[:batch_id].present?
        scope = scope.for_family(filters[:family_hash]) if filters[:family_hash].present?
        scope
      end
    end
  end
end
