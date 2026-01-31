export interface Entry {
  id: number
  entry_type: string
  payload: Record<string, unknown>
  tags: string[]
  occurred_at: string
  created_at: string
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

export type EntryType = 'request' | 'query' | 'exception' | 'job_enqueue' | 'job_perform'
