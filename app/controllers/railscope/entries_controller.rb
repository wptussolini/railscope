# frozen_string_literal: true

module Railscope
  class EntriesController < ApplicationController
    def show
      @entry = Entry.find(params[:id])
      @related_entries = find_related_entries
    end

    private

    def find_related_entries
      return Entry.none if @entry.payload["request_id"].blank?

      Entry
        .where("payload->>'request_id' = ?", @entry.payload["request_id"])
        .where.not(id: @entry.id)
        .order(:occurred_at)
    end
  end
end
