# frozen_string_literal: true

# Sample tasks for testing Railscope command capture
# Using "sample:" namespace (not "railscope:") because CommandSubscriber
# skips tasks starting with "railscope:" to avoid recording internal tasks

namespace :sample do
  desc "Echo a message (for testing command capture)"
  task :echo, [:message, :count] => :environment do |_task, args|
    message = args[:message] || "Hello from Railscope!"
    count = (args[:count] || 1).to_i

    count.times do |i|
      puts "[#{i + 1}] #{message}"
    end
  end

  desc "Simulate a failing task (for testing exception capture)"
  task :fail, [:error_message] => :environment do |_task, args|
    message = args[:error_message] || "Simulated error"
    raise StandardError, message
  end

  desc "Task with options (run with -- --verbose --dry-run)"
  task options_demo: :environment do
    puts "ARGV: #{ARGV.inspect}"
    puts "This task demonstrates option capture"
    puts "Run with: rails sample:options_demo -- --verbose --dry-run"
  end
end
