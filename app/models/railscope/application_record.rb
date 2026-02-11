# frozen_string_literal: true

module Railscope
  class ApplicationRecord < ActiveRecord::Base
    self.abstract_class = true

    # Support for separate database connection.
    # Activated when a "railscope" database is defined in database.yml
    # or when RAILSCOPE_DATABASE_URL is set.
    #
    # Example database.yml:
    #   development:
    #     primary:
    #       <<: *default
    #       database: myapp_development
    #       migrations_paths: db/migrate
    #     railscope:
    #       <<: *default
    #       database: myapp_railscope_development
    #       migrations_paths: db/railscope_migrate
    #
    def self.railscope_separate_database?
      return true if ENV["RAILSCOPE_DATABASE_URL"].present?

      configs = ActiveRecord::Base.configurations.configs_for(env_name: Rails.env)
      configs.any? { |c| c.name == "railscope" }
    rescue StandardError
      false
    end

    connects_to database: { writing: :railscope, reading: :railscope } if railscope_separate_database?
  end
end
