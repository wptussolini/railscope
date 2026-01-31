# frozen_string_literal: true

module Railscope
  class Entry < ApplicationRecord
    self.table_name = "railscope_entries"

    validates :entry_type, presence: true
    validates :occurred_at, presence: true

    scope :by_type, ->(type) { where(entry_type: type) }
    scope :recent, -> { order(occurred_at: :desc) }
    scope :with_tag, ->(tag) { where("? = ANY(tags)", tag) }
    scope :expired, -> { where("occurred_at < ?", Railscope.retention_days.days.ago) }
  end
end
