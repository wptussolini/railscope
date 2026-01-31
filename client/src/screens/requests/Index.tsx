import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getEntries } from '@/api/entries'
import { Entry } from '@/lib/types'
import { timeAgo, truncate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { MethodBadge, StatusBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'

export default function RequestsIndex() {
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
        type: 'request',
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
        <h1 className="text-2xl font-semibold text-white">Requests</h1>
        <p className="text-dark-muted text-sm mt-1">HTTP requests to your application</p>
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
              <TableHead>Verb</TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Happened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center text-dark-muted py-8" colSpan={5}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-dark-muted py-8" colSpan={5}>
                  {tagFilter ? `No requests found with tag "${tagFilter}".` : 'No requests recorded yet.'}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id} onClick={() => navigate(`/requests/${entry.id}`)}>
                  <TableCell>
                    <MethodBadge method={String(entry.payload.method)} />
                  </TableCell>
                  <TableCell className="font-mono text-sm" title={String(entry.payload.path)}>
                    {truncate(String(entry.payload.path), 50)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={Number(entry.payload.status)} />
                  </TableCell>
                  <TableCell className="text-right text-dark-muted">
                    {String(entry.payload.duration)}ms
                  </TableCell>
                  <TableCell className="text-dark-muted" title={entry.occurred_at}>
                    {timeAgo(entry.occurred_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </Card>
    </div>
  )
}
