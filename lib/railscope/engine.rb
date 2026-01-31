# frozen_string_literal: true

require_relative "subscribers/request_subscriber"
require_relative "subscribers/query_subscriber"
require_relative "subscribers/exception_subscriber"

module Railscope
  class Engine < ::Rails::Engine
    isolate_namespace Railscope

    initializer "railscope.assets" do |app|
      if app.config.respond_to?(:assets)
        app.config.assets.precompile += %w[railscope/application.css railscope/application.js]
      end
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
    end
  end
end
