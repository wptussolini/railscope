# frozen_string_literal: true

Railscope::Engine.routes.draw do
  root to: "dashboard#index"

  resources :entries, only: [:show]
end
