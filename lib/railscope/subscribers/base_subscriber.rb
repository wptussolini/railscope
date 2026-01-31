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

      def create_entry!(entry_type:, payload:, tags:)
        return unless recording?

        filtered_payload = Railscope.filter(payload.merge(context_payload))

        Entry.create!(
          entry_type: entry_type,
          payload: filtered_payload,
          tags: (tags + context_tags).uniq,
          occurred_at: Time.current
        )
      end
    end
  end
end
