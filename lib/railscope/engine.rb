# frozen_string_literal: true

require_relative "subscribers/base_subscriber"
require_relative "subscribers/request_subscriber"
require_relative "subscribers/query_subscriber"
require_relative "subscribers/exception_subscriber"
require_relative "subscribers/job_subscriber"
require_relative "subscribers/command_subscriber"

module Railscope
  class Engine < ::Rails::Engine
    isolate_namespace Railscope

    initializer "railscope.static_assets" do |app|
      # Serve static assets from public/railscope
      app.middleware.insert_before(
        ActionDispatch::Static,
        Rack::Static,
        urls: ["/railscope/assets"],
        root: Railscope::Engine.root.join("public").to_s
      )
    end

    initializer "railscope.middleware" do |app|
      app.middleware.insert_before(0, Railscope::Middleware)
    end

    initializer "railscope.migrations" do |app|
      unless app.root.to_s.match?(root.to_s)
        config.paths["db/migrate"].expanded.each do |expanded_path|
          app.config.paths["db/migrate"] << expanded_path
        end
      end
    end

    initializer "railscope.subscribers", after: :load_config_initializers do
      ActiveSupport.on_load(:action_controller) do
        Railscope::Subscribers::RequestSubscriber.subscribe
        Railscope::Subscribers::ExceptionSubscriber.subscribe
      end

      ActiveSupport.on_load(:active_record) do
        Railscope::Subscribers::QuerySubscriber.subscribe
      end

      ActiveSupport.on_load(:active_job) do
        Railscope::Subscribers::JobSubscriber.subscribe
      end
    end

    rake_tasks do
      # Load sample tasks for testing
      load Railscope::Engine.root.join("lib/tasks/railscope_sample.rake")

      # Subscribe to rake tasks after they're loaded
      Railscope::Subscribers::CommandSubscriber.subscribe
    end
  end
end
