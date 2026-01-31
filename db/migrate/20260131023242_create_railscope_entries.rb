# frozen_string_literal: true

class CreateRailscopeEntries < ActiveRecord::Migration[7.0]
  def change
    create_table :railscope_entries do |t|
      # UUID as public identifier
      t.uuid :uuid, default: "gen_random_uuid()", null: false

      # Batch ID groups all entries from a single request/job
      t.uuid :batch_id

      # Family hash groups similar entries (e.g., same SQL pattern)
      t.string :family_hash

      # Entry type (request, query, exception, job_perform, etc.)
      t.string :entry_type, null: false

      # Payload data as JSONB
      t.jsonb :payload, default: {}

      # Tags array for categorization
      t.string :tags, array: true, default: []

      # Control visibility on index pages
      t.boolean :should_display_on_index, default: true, null: false

      # When the event occurred
      t.datetime :occurred_at, null: false

      t.timestamps
    end

    add_index :railscope_entries, :uuid, unique: true
    add_index :railscope_entries, :batch_id
    add_index :railscope_entries, :family_hash
    add_index :railscope_entries, :entry_type
    add_index :railscope_entries, :occurred_at
    add_index :railscope_entries, :tags, using: :gin
    add_index :railscope_entries, [:entry_type, :should_display_on_index], name: "idx_railscope_type_displayable"
  end
end
