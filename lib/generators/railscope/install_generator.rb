# frozen_string_literal: true

require "rails/generators"
require "rails/generators/base"

module Railscope
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)

      desc "Creates a Railscope initializer and mounts the engine."

      def copy_initializer
        template "initializer.rb", "config/initializers/railscope.rb"
      end

      def mount_engine
        route 'mount Railscope::Engine, at: "/railscope"'
      end

      def show_post_install_message
        say ""
        say "Railscope installed successfully!", :green
        say ""
        say "Next steps:"
        say "  1. Run migrations: rails db:migrate"
        say "  2. Enable Railscope: set RAILSCOPE_ENABLED=true in your environment"
        say "     or set config.enabled = true in config/initializers/railscope.rb"
        say "  3. Start your server and visit /railscope"
        say ""
      end
    end
  end
end
