# frozen_string_literal: true

module Railscope
  module DashboardHelper
    def entry_title(entry)
      case entry.entry_type
      when "request"
        "#{entry.payload["method"]} #{entry.payload["path"]}"
      when "query"
        entry.payload["name"] || entry.payload["sql"].to_s.truncate(50)
      when "exception"
        entry.payload["class"]
      when "job_enqueue", "job_perform"
        entry.payload["job_class"]
      else
        entry.entry_type.titleize
      end
    end

    def timeline_summary(entry)
      case entry.entry_type
      when "request"
        "#{entry.payload["method"]} #{entry.payload["path"]}"
      when "query"
        entry.payload["sql"].to_s.truncate(40)
      when "exception"
        entry.payload["class"]
      when "job_enqueue", "job_perform"
        entry.payload["job_class"]
      else
        entry.entry_type
      end
    end

    def render_json(hash, indent: 0)
      return content_tag(:span, "null", class: "json-null") if hash.nil?

      content_tag(:div, class: "json-object") do
        safe_join(hash.map do |key, value|
          content_tag(:div, class: "json-row", style: "padding-left: #{indent * 16}px") do
            key_tag = content_tag(:span, "#{key}:", class: "json-key")
            value_tag = render_json_value(value, indent: indent)
            safe_join([key_tag, value_tag], " ")
          end
        end)
      end
    end

    def render_json_value(value, indent: 0)
      case value
      when nil
        content_tag(:span, "null", class: "json-null")
      when true, false
        content_tag(:span, value.to_s, class: "json-boolean")
      when Numeric
        content_tag(:span, value.to_s, class: "json-number")
      when String
        if value.length > 100
          content_tag(:span, class: "json-string long") do
            content_tag(:code, value)
          end
        else
          content_tag(:span, "\"#{value}\"", class: "json-string")
        end
      when Array
        if value.empty?
          content_tag(:span, "[]", class: "json-array-empty")
        else
          content_tag(:div, class: "json-array") do
            safe_join([
                        content_tag(:span, "[", class: "json-bracket"),
                        content_tag(:div, class: "json-array-items") do
                          safe_join(value.map { |v| render_json_value(v, indent: indent + 1) })
                        end,
                        content_tag(:span, "]", class: "json-bracket")
                      ])
          end
        end
      when Hash
        if value.empty?
          content_tag(:span, "{}", class: "json-object-empty")
        else
          render_json(value, indent: indent + 1)
        end
      else
        content_tag(:span, value.to_s, class: "json-string")
      end
    end

    def render_entry_summary(entry)
      case entry.entry_type
      when "request"
        render_request_summary(entry.payload)
      when "query"
        render_query_summary(entry.payload)
      when "exception"
        render_exception_summary(entry.payload)
      when "job_enqueue", "job_perform"
        render_job_summary(entry.payload)
      else
        entry.payload.to_json.truncate(100)
      end
    end

    private

    def render_request_summary(payload)
      status_class = case payload["status"].to_i
                     when 200..299 then "success"
                     when 300..399 then "redirect"
                     when 400..499 then "client-error"
                     when 500..599 then "server-error"
                     else "unknown"
                     end

      content_tag(:span, class: "request-summary") do
        safe_join([
                    content_tag(:span, payload["method"], class: "method"),
                    content_tag(:span, payload["path"], class: "path"),
                    content_tag(:span, payload["status"], class: "status #{status_class}"),
                    content_tag(:span, "#{payload["duration"]}ms", class: "duration")
                  ], " ")
      end
    end

    def render_query_summary(payload)
      sql = payload["sql"].to_s.truncate(80)
      duration = payload["duration"]

      content_tag(:span, class: "query-summary") do
        safe_join([
                    content_tag(:code, sql, class: "sql"),
                    content_tag(:span, "#{duration}ms", class: "duration")
                  ], " ")
      end
    end

    def render_exception_summary(payload)
      content_tag(:span, class: "exception-summary") do
        safe_join([
                    content_tag(:span, payload["class"], class: "exception-class"),
                    content_tag(:span, payload["message"].to_s.truncate(60), class: "exception-message")
                  ], ": ")
      end
    end

    def render_job_summary(payload)
      content_tag(:span, class: "job-summary") do
        safe_join([
          content_tag(:span, payload["job_class"], class: "job-class"),
          content_tag(:span, "[#{payload["queue_name"]}]", class: "queue-name"),
          payload["duration"] ? content_tag(:span, "#{payload["duration"]}ms", class: "duration") : nil
        ].compact, " ")
      end
    end
  end
end
