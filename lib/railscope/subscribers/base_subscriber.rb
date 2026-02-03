# frozen_string_literal: true

module Railscope
  module Subscribers
    class BaseSubscriber
      private

      def context
        Railscope::Context.current
      end

      def recording?
        context[:recording] != false
      end

      def context_payload
        {
          request_id: context.request_id,
          user_id: context.user_id
        }.compact
      end

      def context_tags
        context.tags.dup
      end

      def create_entry!(entry_type:, payload:, tags:, family_hash: nil, should_display_on_index: true)
        return unless recording?

        filtered_payload = Railscope.filter(payload.merge(context_payload))

        Railscope.storage.write(
          entry_type: entry_type,
          batch_id: context.batch_id,
          family_hash: family_hash,
          should_display_on_index: should_display_on_index,
          payload: filtered_payload,
          tags: (tags + context_tags).uniq,
          occurred_at: Time.current
        )
      end

      # Generate a family hash for grouping similar entries
      # Override in subclasses for specific hashing logic
      def generate_family_hash(*components)
        return nil if components.compact.empty?

        Digest::SHA256.hexdigest(components.compact.join("::"))[0, 16]
      end
    end
  end
end
