# frozen_string_literal: true

module Railscope
  class Entry < ApplicationRecord
    self.table_name = "railscope_entries"

    before_create { self.uuid ||= SecureRandom.uuid }

    validates :entry_type, presence: true
    validates :occurred_at, presence: true

    # Basic scopes
    scope :by_type, ->(type) { where(entry_type: type) }
    scope :recent, -> { order(occurred_at: :desc) }
    scope :with_tag, ->(tag) { where("? = ANY(tags)", tag) }
    scope :expired, -> { where("occurred_at < ?", Railscope.retention_days.days.ago) }

    # Telescope-style scopes
    scope :displayable, -> { where(should_display_on_index: true) }
    scope :for_batch, ->(batch_id) { where(batch_id: batch_id) }
    scope :for_family, ->(family_hash) { where(family_hash: family_hash) }

    # Find by UUID (public identifier)
    def self.find_by_uuid!(uuid)
      find_by!(uuid: uuid)
    end

    def self.find_by_uuid(uuid)
      find_by(uuid: uuid)
    end

    # Get all related entries in the same batch
    def batch_entries
      return self.class.none if batch_id.blank?

      self.class.for_batch(batch_id).where.not(id: id).order(:occurred_at)
    end

    # Get all entries with the same family_hash
    def family_entries
      return self.class.none if family_hash.blank?

      self.class.for_family(family_hash).where.not(id: id).recent
    end

    # Count of similar entries (same family_hash)
    def family_count
      return 0 if family_hash.blank?

      self.class.for_family(family_hash).count
    end
  end
end
