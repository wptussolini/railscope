# frozen_string_literal: true

Railscope::Engine.routes.draw do
  # API endpoints
  namespace :api do
    resources :entries, only: %i[index show destroy] do
      collection do
        get "batch/:batch_id", action: :batch, as: :batch
        get "family/:family_hash", action: :family, as: :family
      end
    end
  end

  # Serve React SPA for all other routes
  get "*path", to: "application#index", constraints: ->(req) { !req.path.start_with?("/api") }
  root to: "application#index"
end
