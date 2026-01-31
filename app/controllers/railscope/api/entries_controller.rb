# frozen_string_literal: true

module Railscope
  module Api
    class EntriesController < ApplicationController
      skip_forgery_protection

      def index
        entries = filtered_entries.recent.limit(per_page).offset(offset)
        total_count = filtered_entries.count

        render json: {
          data: entries.map { |e| serialize_entry(e) },
          meta: {
            current_page: current_page,
            total_pages: (total_count.to_f / per_page).ceil,
            total_count: total_count,
            per_page: per_page
          }
        }
      end

      def show
        entry = Entry.find(params[:id])
        related = find_related_entries(entry)

        render json: {
          data: serialize_entry(entry),
          related: related.map { |e| serialize_entry(e) }
        }
      end

      def destroy
        Entry.delete_all
        render json: { success: true }
      end

      private

      def filtered_entries
        entries = Entry.all
        entries = entries.by_type(params[:type]) if params[:type].present?
        entries = entries.with_tag(params[:tag]) if params[:tag].present?
        entries
      end

      def find_related_entries(entry)
        return Entry.none if entry.payload["request_id"].blank?

        Entry
          .where("payload->>'request_id' = ?", entry.payload["request_id"])
          .where.not(id: entry.id)
          .order(:occurred_at)
      end

      def serialize_entry(entry)
        {
          id: entry.id,
          entry_type: entry.entry_type,
          payload: entry.payload,
          tags: entry.tags,
          occurred_at: entry.occurred_at.iso8601,
          created_at: entry.created_at.iso8601
        }
      end

      def current_page
        [params.fetch(:page, 1).to_i, 1].max
      end

      def per_page
        25
      end

      def offset
        (current_page - 1) * per_page
      end
    end
  end
end
