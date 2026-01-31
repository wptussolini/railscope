# frozen_string_literal: true

# Railscope Configuration
# =======================
#
# Railscope is disabled by default. Enable it by setting
# the RAILSCOPE_ENABLED environment variable:
#
#   RAILSCOPE_ENABLED=true
#

Railscope.configure do |config|
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

  # Sensitive Keys
  # --------------
  # Additional parameter names to filter from payloads.
  # By default, common sensitive keys are filtered (password, token, etc.)
  # plus everything in Rails.application.config.filter_parameters
  #
  # config.add_sensitive_keys(:cpf, :ssn, :bank_account)
end
