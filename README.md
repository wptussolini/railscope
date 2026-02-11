# Railscope

An elegant debug assistant for Rails applications. Inspired by [Laravel Telescope](https://laravel.com/docs/telescope).

Railscope provides insight into the requests, exceptions, database queries, jobs, and more coming into your application. It's an essential companion during local development and a powerful debugging tool in production.

## Features

- **Request Monitoring** - Track all HTTP requests with timing, status, and parameters
- **Query Logging** - Capture SQL queries with execution time and identify slow queries
- **Exception Tracking** - Log unhandled exceptions with full stack traces
- **Job Monitoring** - Monitor background jobs (enqueue and perform)
- **Context Correlation** - Link all events from the same request via `request_id`
- **Sensitive Data Filtering** - Automatic masking of passwords, tokens, and secrets
- **Dark Mode UI** - Beautiful GitHub-inspired dark interface
- **Storage Backends** - Direct database writes or Redis buffer with batch flush
- **Zero Dependencies** - Works with any Rails 7+ application (Redis optional)

## Installation

Add to your Gemfile:

```ruby
gem "railscope", path: "railscope"  # or from git/rubygems
```

Then run:

```bash
bundle install
rails db:migrate
```

Mount the engine in `config/routes.rb`:

```ruby
Rails.application.routes.draw do
  mount Railscope::Engine, at: "/railscope"
end
```

## Configuration

### Enable Railscope

Railscope only runs when explicitly enabled via environment variable:

```bash
# .env or environment
RAILSCOPE_ENABLED=true
```

### Full Configuration

Create `config/initializers/railscope.rb`:

```ruby
Railscope.configure do |config|
  # Storage backend: :database (default) or :redis (buffer)
  config.storage_backend = :database

  # Data retention (default: 7 days)
  config.retention_days = 30

  # Paths to ignore (defaults: /railscope, /assets, /packs, /cable)
  config.add_ignore_paths("/health", "/ping", "/metrics")

  # Additional sensitive keys to filter
  config.add_sensitive_keys(:cpf, :ssn, :bank_account)
end
```

### Storage Backends

Railscope supports two storage modes:

| Mode | Write | Read | Requires |
|------|-------|------|----------|
| `:database` | Direct INSERT (sync) | PostgreSQL | PostgreSQL |
| `:redis` | Redis buffer (async) | PostgreSQL | PostgreSQL + Redis |

**`:database`** (default) -- Entries are written directly to PostgreSQL during the request. Simplest setup, no Redis needed.

**`:redis`** -- Entries are buffered in Redis (~0.1ms per write) and batch-flushed to PostgreSQL periodically. Reduces request latency in high-throughput applications.

When using `:redis`, you need to flush the buffer periodically:

```ruby
# From a background job (Sidekiq, GoodJob, SolidQueue, etc.)
class RailscopeFlushJob < ApplicationJob
  queue_as :low

  def perform
    Railscope::FlushService.call
  end
end

# From a cron/scheduler
every 5.seconds do
  runner "Railscope::FlushService.call"
end

# Or via rake
# $ rake railscope:flush
```

> **Note:** Entries only appear in the dashboard after being flushed to PostgreSQL.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RAILSCOPE_ENABLED` | Enable/disable recording | `false` |
| `RAILSCOPE_STORAGE` | Storage backend (`database` or `redis`) | `database` |
| `RAILSCOPE_REDIS_URL` | Redis connection URL | Falls back to `REDIS_URL` |
| `RAILSCOPE_RETENTION_DAYS` | Days to keep entries | `7` |

## Authorization

Protect the dashboard in production using Rails routing constraints:

```ruby
# With Devise
authenticate :user, ->(u) { u.admin? } do
  mount Railscope::Engine, at: "/railscope"
end

# With HTTP Basic Auth
Railscope::Engine.middleware.use(Rack::Auth::Basic) do |user, pass|
  ActiveSupport::SecurityUtils.secure_compare(user, ENV["RAILSCOPE_USER"]) &
  ActiveSupport::SecurityUtils.secure_compare(pass, ENV["RAILSCOPE_PASSWORD"])
end
mount Railscope::Engine, at: "/railscope"

# Development only
mount Railscope::Engine, at: "/railscope" if Rails.env.development?
```

## Usage

### Dashboard

Access the dashboard at `/railscope` to view:

- All recorded entries with filtering by type
- Click any entry for detailed view
- Timeline showing related events from the same request
- Full payload inspection with JSON viewer

### Entry Types

| Type | Description |
|------|-------------|
| `request` | HTTP requests with path, method, status, duration |
| `query` | SQL queries with execution time |
| `exception` | Unhandled exceptions with backtrace |
| `job_enqueue` | Background jobs when enqueued |
| `job_perform` | Background jobs when executed |

### Adding Context

Add custom context during a request:

```ruby
class ApplicationController < ActionController::Base
  before_action :set_railscope_context

  private

  def set_railscope_context
    return unless Railscope.enabled?

    Railscope.context.user_id = current_user&.id
    Railscope.context.add_tag("api_v2") if request.path.start_with?("/api/v2")
    Railscope.context[:tenant_id] = current_tenant&.id
  end
end
```

### Automatic Tags

Entries are automatically tagged:

- **Requests**: `request`, method (`get`, `post`), `error` (4xx/5xx), `slow` (>1s)
- **Queries**: `query`, type (`select`, `insert`, `update`, `delete`), `cached`, `slow` (>100ms)
- **Exceptions**: `exception`, exception class name
- **Jobs**: `job`, `enqueue`/`perform`, queue name, `failed`

### Rake Tasks

```bash
# Flush buffered entries from Redis to database (redis mode only)
rake railscope:flush

# Purge expired entries (older than retention_days)
rake railscope:purge
```

### Purging Old Entries

Run the purge job to remove entries older than `retention_days`:

```ruby
# Manually
Railscope::PurgeJob.perform_now

# Schedule with your job scheduler (sidekiq-cron, solid_queue, etc.)
Railscope::PurgeJob.perform_later
```

## Filtered Parameters

Railscope automatically filters sensitive data:

**Default filtered keys:**
- `password`, `password_confirmation`
- `secret`, `token`, `api_key`
- `access_token`, `refresh_token`
- `authorization`, `credential`
- `credit_card`, `cvv`, `ssn`
- All keys from `Rails.application.config.filter_parameters`

**Auto-detected patterns:**
- Bearer tokens
- JWT tokens
- Base64 encoded secrets (40+ chars)

## API

### Check if enabled

```ruby
Railscope.enabled?  # => true/false
```

### Access current context

```ruby
Railscope.context.request_id   # Current request UUID
Railscope.context.user_id      # Set user ID
Railscope.context.add_tag(tag) # Add custom tag
Railscope.context[:custom]     # Custom attributes
```

### Query entries

```ruby
# By type
Railscope::Entry.by_type("request")
Railscope::Entry.by_type("exception")

# By tag
Railscope::Entry.with_tag("slow")
Railscope::Entry.with_tag("error")

# Recent entries
Railscope::Entry.recent.limit(10)

# Expired entries (for cleanup)
Railscope::Entry.expired
```

## Performance

Railscope is designed to have minimal impact:

- Ignored paths skip all processing
- Sensitive data filtering is done once before save
- Purge job removes old entries to control database size

**With `:database` backend:**
- Entries are written synchronously via INSERT during the request

**With `:redis` backend:**
- Writes go to Redis (~0.1ms per entry), near-zero impact on request latency
- `Entry.insert_all` batches up to 1000 records per flush for efficient persistence
- Flush is safe to run concurrently (Redis `LPOP` is atomic)

For high-traffic production environments, consider:
- Using `:redis` backend for lower request latency
- Shorter retention periods
- Adding high-traffic paths to ignore list
- Running purge job more frequently

## License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
