# frozen_string_literal: true

module Railscope
  class DashboardController < ApplicationController
    PER_PAGE = 25

    def index
      @entries = filtered_entries.recent.limit(PER_PAGE).offset(offset)
      @total_count = filtered_entries.count
      @entry_types = Entry.distinct.pluck(:entry_type).sort
      @current_type = params[:type]
      @current_page = current_page
      @total_pages = (@total_count.to_f / PER_PAGE).ceil
    end

    private

    def filtered_entries
      entries = Entry.all
      entries = entries.by_type(params[:type]) if params[:type].present?
      entries = entries.with_tag(params[:tag]) if params[:tag].present?
      entries
    end

    def current_page
      [params.fetch(:page, 1).to_i, 1].max
    end

    def offset
      (current_page - 1) * PER_PAGE
    end
  end
end
