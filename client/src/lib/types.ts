export interface Entry {
  id: number
  uuid: string
  batch_id: string | null
  family_hash: string | null
  entry_type: string
  payload: Record<string, unknown>
  tags: string[]
  occurred_at: string
  created_at: string
  family_count?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}

export interface EntryResponse {
  data: Entry
  batch: Entry[]
}

export interface BatchResponse {
  data: Entry[]
}

export interface FamilyResponse {
  data: Entry[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}

export type EntryType =
  | 'request'
  | 'query'
  | 'exception'
  | 'job_enqueue'
  | 'job_perform'
  | 'command'
  | 'schedule'
  | 'log'
  | 'dump'
  | 'model'
  | 'event'
  | 'mail'
  | 'notification'
  | 'gate'
  | 'cache'
  | 'redis'
  | 'view'
  | 'client_request'
