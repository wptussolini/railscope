# frozen_string_literal: true

namespace :railscope do
  desc "Flush buffered entries from Redis to database"
  task flush: :environment do
    count = Railscope::FlushService.call
    puts "Flushed #{count} entries"
  end

  desc "Purge expired entries"
  task purge: :environment do
    count = Railscope.storage.destroy_expired!
    puts "Purged #{count} entries"
  end
end
