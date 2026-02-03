# frozen_string_literal: true

module Railscope
  class EntriesController < ApplicationController
    def show
      @entry = storage.find!(params[:id])
      @related_entries = find_related_entries
    end

    private

    def storage
      Railscope.storage
    end

    def find_related_entries
      request_id = @entry.payload["request_id"]
      return [] if request_id.blank?

      # For database storage, we can query by payload
      # For Redis storage, we use batch_id instead
      if @entry.batch_id.present?
        storage.for_batch(@entry.batch_id).reject { |e| e.uuid == @entry.uuid }
      else
        []
      end
    end
  end
end
