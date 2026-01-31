# frozen_string_literal: true

Railscope::Engine.routes.draw do
  # API endpoints
  namespace :api do
    resources :entries, only: [:index, :show, :destroy]
  end

  # Serve React SPA for all other routes
  get "*path", to: "application#index", constraints: ->(req) { !req.path.start_with?("/api") }
  root to: "application#index"
end
