import { api } from './client'
import type { Entry, PaginatedResponse, EntryResponse, BatchResponse, FamilyResponse } from '@/lib/types'

export interface EntriesParams {
  type?: string
  tag?: string
  batch_id?: string
  page?: number
}

export async function getEntries(params: EntriesParams = {}): Promise<PaginatedResponse<Entry>> {
  const searchParams = new URLSearchParams()
  if (params.type) searchParams.set('type', params.type)
  if (params.tag) searchParams.set('tag', params.tag)
  if (params.batch_id) searchParams.set('batch_id', params.batch_id)
  if (params.page) searchParams.set('page', params.page.toString())

  const query = searchParams.toString()
  return api.get(`/entries${query ? `?${query}` : ''}`)
}

export async function getEntry(id: number | string): Promise<EntryResponse> {
  return api.get(`/entries/${id}`)
}

export async function getBatchEntries(batchId: string): Promise<BatchResponse> {
  return api.get(`/entries/batch/${batchId}`)
}

export async function getFamilyEntries(familyHash: string, page = 1): Promise<FamilyResponse> {
  return api.get(`/entries/family/${familyHash}?page=${page}`)
}

export async function deleteAllEntries(): Promise<void> {
  return api.delete('/entries')
}
