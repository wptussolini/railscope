import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getEntries, getFamilyEntries } from '@/api/entries'
import { Entry } from '@/lib/types'
import { timeAgo } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'

const actionVariant: Record<string, BadgeVariant> = {
  created: 'success',
  updated: 'info',
  deleted: 'error',
}

export default function ModelsIndex() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const tagFilter = searchParams.get('tag') || ''
  const familyHashFilter = searchParams.get('family_hash') || ''

  useEffect(() => {
    loadEntries()
  }, [page, tagFilter, familyHashFilter])

  async function loadEntries() {
    setLoading(true)
    try {
      if (familyHashFilter) {
        const response = await getFamilyEntries(familyHashFilter, page)
        setEntries(response.data)
        setTotalPages(response.meta.total_pages)
      } else {
        const response = await getEntries({
          type: 'model',
          tag: tagFilter || undefined,
          page
        })
        setEntries(response.data)
        setTotalPages(response.meta.total_pages)
      }
    } catch (error) {
      console.error('Failed to load entries:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(value: string) {
    setPage(1)
    if (value) {
      setSearchParams({ tag: value })
    } else {
      setSearchParams({})
    }
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
  }

  function clearFamilyFilter() {
    setSearchParams({})
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Models</h1>
        <p className="text-dark-muted text-sm mt-1">
          {familyHashFilter
            ? 'Viewing similar model events'
            : 'ActiveRecord model events (create, update, delete)'}
        </p>
      </div>

      {familyHashFilter ? (
        <div className="mb-4">
          <button
            onClick={clearFamilyFilter}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            &larr; Back to all models
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <SearchInput
            placeholder="Search by tag (created, updated, deleted, user...)"
            value={tagFilter}
            onChange={handleSearch}
            className="max-w-sm"
          />
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Happened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center text-dark-muted py-8" colSpan={4}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-dark-muted py-8" colSpan={4}>
                  {familyHashFilter
                    ? 'No similar model events found.'
                    : tagFilter
                      ? `No model events found with tag "${tagFilter}".`
                      : 'No model events recorded yet.'}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const payload = entry.payload as Record<string, unknown>
                const action = String(payload.action || '')
                return (
                  <TableRow key={entry.id} onClick={() => navigate(`/models/${entry.id}`)}>
                    <TableCell className="font-mono text-sm">
                      {String(payload.model || '')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant[action] || 'default'}>
                        {action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="default">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-dark-muted" title={entry.occurred_at}>
                      {timeAgo(entry.occurred_at)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </Card>
    </div>
  )
}
