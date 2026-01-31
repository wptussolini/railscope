# frozen_string_literal: true

module Railscope
  module Subscribers
    class BaseSubscriber
      private

      def context
        Railscope::Context.current
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
        Entry.create!(
          entry_type: entry_type,
          payload: payload.merge(context_payload),
          tags: (tags + context_tags).uniq,
          occurred_at: Time.current
        )
      end
    end
  end
end
