# frozen_string_literal: true

module Railscope
  module Subscribers
    class ModelSubscriber < BaseSubscriber
      IGNORED_MODEL_PREFIXES = %w[Railscope:: ActiveRecord::].freeze

      def self.subscribe
        return if @subscribed

        @subscribed = true

        Rails.logger.info("[Railscope] ModelSubscriber.subscribe called - registering callbacks on ActiveRecord::Base")

        ActiveRecord::Base.after_create_commit do
          Rails.logger.debug("[Railscope] after_create_commit fired for #{self.class.name}:#{self.id}")
          Railscope::Subscribers::ModelSubscriber.track("created", self)
        end

        ActiveRecord::Base.after_update_commit do
          Rails.logger.debug("[Railscope] after_update_commit fired for #{self.class.name}:#{self.id}")
          Railscope::Subscribers::ModelSubscriber.track("updated", self)
        end

        ActiveRecord::Base.after_destroy_commit do
          Rails.logger.debug("[Railscope] after_destroy_commit fired for #{self.class.name}:#{self.id}")
          Railscope::Subscribers::ModelSubscriber.track("deleted", self)
        end
      end

      def self.track(action, model)
        Rails.logger.debug("[Railscope] ModelSubscriber.track(#{action}, #{model.class.name}:#{model.id})")
        new.record(action: action, model: model)
      end

      def record(action:, model:)
        Rails.logger.debug("[Railscope] ModelSubscriber.record - enabled=#{Railscope.enabled?} ready=#{Railscope.ready?} recording=#{recording?}")

        return unless Railscope.enabled?
        return unless Railscope.ready?

        model_name = model.class.name
        return if model_name.nil?
        return if IGNORED_MODEL_PREFIXES.any? { |prefix| model_name.start_with?(prefix) }
        return unless Railscope.should_track_model?(model_name)

        create_entry!(
          entry_type: "model",
          payload: build_payload(action, model),
          tags: build_tags(action, model),
          family_hash: build_family_hash(action, model),
          should_display_on_index: true
        )

        # Conditional recording: flush buffered entries when trigger matches
        if Railscope.conditional_recording? && !context.triggered? && Railscope.matches_trigger?(model_name, action)
          context.trigger!
          context.flush_pending!
        end

        Rails.logger.debug("[Railscope] ModelSubscriber - entry created for #{model_name}")
      rescue StandardError => e
        Rails.logger.error("[Railscope] Failed to record model event: #{e.class}: #{e.message}")
        Rails.logger.error(e.backtrace&.first(5)&.join("\n"))
      end

      private

      def build_payload(action, model)
        payload = {
          action: action,
          model: "#{model.class.name}:#{model.id}"
        }

        if action != "deleted" && model.respond_to?(:saved_changes)
          changes = model.saved_changes.except("updated_at", "created_at")
          payload[:changes] = changes if changes.present?
        end

        payload
      end

      def build_tags(action, model)
        ["model", action, model.class.name.underscore.gsub("/", "_")]
      end

      def build_family_hash(action, model)
        generate_family_hash("model", model.class.name, action)
      end
    end
  end
end
