import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getEntries } from '@/api/entries'
import { Entry } from '@/lib/types'
import { timeAgo, truncate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'

export default function ExceptionsIndex() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const tagFilter = searchParams.get('tag') || ''

  useEffect(() => {
    loadEntries()
  }, [page, tagFilter])

  async function loadEntries() {
    setLoading(true)
    try {
      const response = await getEntries({
        type: 'exception',
        tag: tagFilter || undefined,
        page
      })
      setEntries(response.data)
      setTotalPages(response.meta.total_pages)
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Exceptions</h1>
        <p className="text-dark-muted text-sm mt-1">Unhandled exceptions in your application</p>
      </div>

      <div className="mb-4">
        <SearchInput
          placeholder="Search by tag..."
          value={tagFilter}
          onChange={handleSearch}
          className="max-w-sm"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exception</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Happened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center text-dark-muted py-8" colSpan={3}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-dark-muted py-8" colSpan={3}>
                  {tagFilter ? `No exceptions found with tag "${tagFilter}".` : "No exceptions recorded. That's a good thing!"}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const payload = entry.payload as Record<string, unknown>
                const location = payload.source === 'command'
                  ? `command: ${String(payload.command)}`
                  : `${String(payload.controller)}#${String(payload.action)}`
                return (
                  <TableRow key={entry.id} onClick={() => navigate(`/exceptions/${entry.id}`)}>
                    <TableCell>
                      <div className="text-red-400 font-medium">{String(payload.class)}</div>
                      <div className="text-dark-muted text-sm">
                        {truncate(String(payload.message), 60)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-dark-muted">
                      {location}
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
