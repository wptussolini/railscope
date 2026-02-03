# frozen_string_literal: true

module Railscope
  module Api
    class EntriesController < ApplicationController
      skip_forgery_protection

      def index
        filters = extract_filters
        entries = storage.all(filters: filters, page: current_page, per_page: per_page)
        total_count = storage.count(filters: filters)

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
        entry = storage.find!(params[:id])
        batch_entries = storage.for_batch(entry.batch_id).reject { |e| e.uuid == entry.uuid }.first(100)

        render json: {
          data: serialize_entry(entry, include_family_count: true),
          batch: batch_entries.map { |e| serialize_entry(e) }
        }
      end

      def batch
        entries = storage.for_batch(params[:batch_id])

        render json: {
          data: entries.map { |e| serialize_entry(e) }
        }
      end

      def family
        entries = storage.for_family(params[:family_hash], page: current_page, per_page: per_page)
        total_count = storage.family_count(params[:family_hash])

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
        storage.destroy_all!
        render json: { success: true }
      end

      private

      def storage
        Railscope.storage
      end

      def extract_filters
        {}.tap do |filters|
          filters[:type] = params[:type] if params[:type].present?
          filters[:tag] = params[:tag] if params[:tag].present?
          filters[:batch_id] = params[:batch_id] if params[:batch_id].present?
        end
      end

      def serialize_entry(entry, include_family_count: false)
        result = {
          id: entry.uuid,
          uuid: entry.uuid,
          batch_id: entry.batch_id,
          family_hash: entry.family_hash,
          entry_type: entry.entry_type,
          payload: entry.payload,
          tags: entry.tags,
          occurred_at: entry.occurred_at&.iso8601,
          created_at: entry.created_at&.iso8601
        }

        result[:family_count] = storage.family_count(entry.family_hash) if include_family_count && entry.family_hash

        result
      end

      def current_page
        [params.fetch(:page, 1).to_i, 1].max
      end

      def per_page
        25
      end
    end
  end
end
