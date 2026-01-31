# frozen_string_literal: true

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
  end
end
