# frozen_string_literal: true

module Railscope
  class PurgeJob < ApplicationJob
    queue_as :default

    def perform
      return unless Railscope.enabled?

      deleted_count = Entry.expired.delete_all
      Rails.logger.info("[Railscope] Purged #{deleted_count} expired entries")
      deleted_count
    end
  end
end
