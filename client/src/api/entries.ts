import { api } from './client'
import type { Entry, PaginatedResponse } from '@/lib/types'

export interface EntriesParams {
  type?: string
  tag?: string
  page?: number
}

export async function getEntries(params: EntriesParams = {}): Promise<PaginatedResponse<Entry>> {
  const searchParams = new URLSearchParams()
  if (params.type) searchParams.set('type', params.type)
  if (params.tag) searchParams.set('tag', params.tag)
  if (params.page) searchParams.set('page', params.page.toString())

  const query = searchParams.toString()
  return api.get(`/entries${query ? `?${query}` : ''}`)
}

export async function getEntry(id: number | string): Promise<{ data: Entry; related: Entry[] }> {
  return api.get(`/entries/${id}`)
}

export async function deleteAllEntries(): Promise<void> {
  return api.delete('/entries')
}
