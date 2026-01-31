# frozen_string_literal: true

module Railscope
  class Engine < ::Rails::Engine
    isolate_namespace Railscope

    initializer "railscope.assets" do |app|
      if app.config.respond_to?(:assets)
        app.config.assets.precompile += %w[railscope/application.css railscope/application.js]
      end
    end
  end
end
