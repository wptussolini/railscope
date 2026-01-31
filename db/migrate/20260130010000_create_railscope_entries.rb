# frozen_string_literal: true

class CreateRailscopeEntries < ActiveRecord::Migration[7.0]
  def change
    create_table :railscope_entries do |t|
      t.string :entry_type, null: false
      t.jsonb :payload, default: {}
      t.string :tags, array: true, default: []
      t.datetime :occurred_at, null: false

      t.timestamps
    end

    add_index :railscope_entries, :entry_type
    add_index :railscope_entries, :occurred_at
    add_index :railscope_entries, :tags, using: :gin
  end
end
