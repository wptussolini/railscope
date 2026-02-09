# frozen_string_literal: true

module Railscope
  module Subscribers
    class ViewSubscriber < BaseSubscriber
      TEMPLATE_EVENT = "render_template.action_view"
      PARTIAL_EVENT = "render_partial.action_view"
      LAYOUT_EVENT = "render_layout.action_view"

      def self.subscribe
        return if @subscribed

        @subscribed = true

        # Include controller tracking in ApplicationController
        setup_controller_tracking

        ActiveSupport::Notifications.subscribe(TEMPLATE_EVENT) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record_template(event)
        end

        ActiveSupport::Notifications.subscribe(PARTIAL_EVENT) do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          new.record_partial(event)
        end
      end

      def self.setup_controller_tracking
        return if @controller_tracking_setup

        @controller_tracking_setup = true

        controller_module = Module.new do
          extend ActiveSupport::Concern

          included do
            around_action :railscope_track_controller
          end

          private

          def railscope_track_controller
            Thread.current[:railscope_current_controller] = self
            yield
          ensure
            Thread.current[:railscope_current_controller] = nil
          end
        end

        if defined?(ActionController::Base)
          ActionController::Base.include(controller_module)
        else
          ActiveSupport.on_load(:action_controller_base) do
            include controller_module
          end
        end
      end

      def record_template(event)
        return unless Railscope.enabled?
        return unless Railscope.ready?
        return if ignore_view?(event)

        create_entry!(
          entry_type: "view",
          payload: build_payload(event, "template"),
          tags: build_tags(event, "template"),
          family_hash: build_family_hash(event),
          should_display_on_index: true
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record view template: #{e.message}")
      end

      def record_partial(event)
        return unless Railscope.enabled?
        return unless Railscope.ready?
        return if ignore_view?(event)

        create_entry!(
          entry_type: "view",
          payload: build_payload(event, "partial"),
          tags: build_tags(event, "partial"),
          family_hash: build_family_hash(event),
          should_display_on_index: false # Partials don't show in index, only in related entries
        )
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record view partial: #{e.message}")
      end

      private

      def build_payload(event, view_type)
        identifier = event.payload[:identifier] || ""
        layout = event.payload[:layout]

        {
          name: extract_view_name(identifier),
          path: extract_relative_path(identifier),
          full_path: identifier,
          view_type: view_type,
          layout: layout,
          duration: event.duration.round(2),
          # View data (instance variables) - extracted from controller if available
          data: extract_view_data
        }.compact
      end

      def extract_view_name(identifier)
        return "" if identifier.blank?

        # Extract view name from path like:
        # /app/views/posts/index.html.erb -> posts/index
        if identifier.include?("/app/views/")
          identifier.split("/app/views/").last&.sub(/\.\w+\.\w+$/, "") || identifier
        elsif identifier.include?("/views/")
          identifier.split("/views/").last&.sub(/\.\w+\.\w+$/, "") || identifier
        else
          File.basename(identifier, ".*").sub(/\.\w+$/, "")
        end
      end

      def extract_relative_path(identifier)
        return "" if identifier.blank?

        if identifier.include?(Rails.root.to_s)
          identifier.sub(Rails.root.join("").to_s, "")
        else
          identifier
        end
      end

      def extract_view_data
        # Try to get instance variables from the current controller
        controller = Thread.current[:railscope_current_controller]
        return nil unless controller

        # Get instance variables that were set in the controller
        ivars = {}
        controller.instance_variables.each do |ivar|
          name = ivar.to_s.sub("@", "")
          # Skip internal Rails variables
          next if name.start_with?("_")
          next if %w[request response performed_redirect marked_for_same_origin_verification].include?(name)

          value = controller.instance_variable_get(ivar)
          ivars[name] = safe_serialize(value)
        end

        ivars.presence
      rescue StandardError
        nil
      end

      def safe_serialize(value)
        case value
        when String, Numeric, TrueClass, FalseClass, NilClass
          value
        when Array
          value.first(10).map { |v| safe_serialize(v) }
        when Hash
          value.transform_values { |v| safe_serialize(v) }
        when ActiveRecord::Base
          { class: value.class.name, id: value.try(:id) }
        when ActiveRecord::Relation
          { class: value.klass.name, count: value.size, sql: value.to_sql[0..200] }
        else
          value.class.name
        end
      rescue StandardError
        value.class.name
      end

      def build_tags(event, view_type)
        tags = ["view", view_type]
        tags << "slow" if event.duration > 100
        tags
      end

      def build_family_hash(event)
        identifier = event.payload[:identifier] || ""
        view_name = extract_view_name(identifier)
        generate_family_hash("view", view_name)
      end

      def ignore_view?(event)
        identifier = event.payload[:identifier].to_s

        # Ignore Railscope's own views
        return true if identifier.include?("railscope")

        # Ignore Rails internal views
        return true if identifier.include?("actionmailer")
        return true if identifier.include?("action_mailbox")

        false
      end
    end
  end
end
