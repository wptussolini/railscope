# frozen_string_literal: true

# Railscope Configuration
# =======================
#
# Railscope is disabled by default. Enable it via environment variable:
#
#   RAILSCOPE_ENABLED=true
#
# Or programmatically (useful with application.yml, credentials, etc.):
#
#   config.enabled = true
#

Railscope.configure do |config|
  # Enable/Disable
  # --------------
  # Set this directly if your project doesn't use ENV variables
  # (e.g., application.yml without Figaro, Rails credentials, etc.)
  #
  # config.enabled = true

  # Storage Backend
  # ---------------
  # :database - Direct writes to PostgreSQL (simpler, no Redis needed)
  # :redis    - Buffer in Redis, batch flush to PostgreSQL (faster requests)
  #
  # When using :redis, entries are buffered in Redis during requests and
  # flushed to PostgreSQL periodically via Railscope::FlushService.
  # You can trigger the flush with:
  #   - Railscope::FlushService.call (from a job, cron, etc.)
  #   - rake railscope:flush
  #
  # Can also be set via RAILSCOPE_STORAGE env var.
  #
  # config.storage_backend = :database

  # Retention Period
  # ----------------
  # Number of days to keep entries before purging.
  # Can also be set via RAILSCOPE_RETENTION_DAYS env var.
  #
  # config.retention_days = 7

  # Ignored Paths
  # -------------
  # Requests to these paths will not be recorded.
  # Default: /railscope, /assets, /packs, /cable
  #
  # config.add_ignore_paths("/health", "/ping", "/metrics")

  # Ignored Jobs
  # ------------
  # Jobs matching these patterns will not be recorded.
  # Accepts class names or regex patterns.
  #
  # config.add_ignore_jobs("SomeFrequentJob", "Turbo::Streams::.*")

  # Ignored Commands
  # ----------------
  # Rake tasks matching these patterns will not be recorded.
  # Accepts task names or regex patterns.
  #
  # config.add_ignore_commands("db:.*", "assets:.*", "tmp:.*")

  # Redis Connection
  # ----------------
  # By default, Railscope creates its own Redis connection from
  # RAILSCOPE_REDIS_URL or REDIS_URL. You can pass an existing
  # Redis instance instead (useful for SSL/connection sharing):
  #
  # config.redis = $redis

  # Sensitive Keys
  # --------------
  # Additional parameter names to filter from payloads.
  # By default, common sensitive keys are filtered (password, token, etc.)
  # plus everything in Rails.application.config.filter_parameters
  #
  # config.add_sensitive_keys(:cpf, :ssn, :bank_account)
end
