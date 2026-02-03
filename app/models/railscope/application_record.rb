# frozen_string_literal: true

module Railscope
  class ApplicationRecord < ActiveRecord::Base
    self.abstract_class = true

    # Support for separate database connection when RAILSCOPE_DATABASE_URL is configured
    # This isolates Railscope's writes from the main application database,
    # preventing lock contention during high-traffic periods.
    if ENV["RAILSCOPE_DATABASE_URL"].present?
      connects_to database: { writing: :railscope, reading: :railscope }
    end
  end
end
