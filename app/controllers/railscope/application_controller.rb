# frozen_string_literal: true

module Railscope
  class ApplicationController < ActionController::Base
    protect_from_forgery with: :exception
    layout "railscope/application"

    def index
      render :index
    end
  end
end
