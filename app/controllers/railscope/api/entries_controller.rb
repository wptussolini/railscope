# frozen_string_literal: true

module Railscope
  module Api
    class EntriesController < ApplicationController
      skip_forgery_protection

      def index
        entries = filtered_entries.displayable.recent.limit(per_page).offset(offset)
        total_count = filtered_entries.displayable.count

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
        entry = find_entry
        batch_entries = entry.batch_entries.limit(100)

        render json: {
          data: serialize_entry(entry, include_family_count: true),
          batch: batch_entries.map { |e| serialize_entry(e) }
        }
      end

      def batch
        entries = Entry.for_batch(params[:batch_id]).order(:occurred_at)

        render json: {
          data: entries.map { |e| serialize_entry(e) }
        }
      end

      def family
        entries = Entry.for_family(params[:family_hash]).recent.limit(per_page).offset(offset)
        total_count = Entry.for_family(params[:family_hash]).count

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

      def destroy
        Entry.delete_all
        render json: { success: true }
      end

      private

      def find_entry
        # Support both UUID and integer ID for backwards compatibility
        if params[:id].to_s.match?(/\A[0-9a-f-]{36}\z/i)
          Entry.find_by_uuid!(params[:id])
        else
          Entry.find(params[:id])
        end
      end

      def filtered_entries
        entries = Entry.all
        entries = entries.by_type(params[:type]) if params[:type].present?
        entries = entries.with_tag(params[:tag]) if params[:tag].present?
        entries = entries.for_batch(params[:batch_id]) if params[:batch_id].present?
        entries
      end

      def serialize_entry(entry, include_family_count: false)
        result = {
          id: entry.id,
          uuid: entry.uuid,
          batch_id: entry.batch_id,
          family_hash: entry.family_hash,
          entry_type: entry.entry_type,
          payload: entry.payload,
          tags: entry.tags,
          occurred_at: entry.occurred_at.iso8601,
          created_at: entry.created_at.iso8601
        }

        result[:family_count] = entry.family_count if include_family_count

        result
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
