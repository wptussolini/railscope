# frozen_string_literal: true

module Railscope
  class ApplicationRecord < ActiveRecord::Base
    self.abstract_class = true
  end
end
