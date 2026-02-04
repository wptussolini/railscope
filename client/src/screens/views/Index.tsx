import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getEntries } from '@/api/entries'
import { Entry } from '@/lib/types'
import { timeAgo, truncate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'

export default function ViewsIndex() {
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
        type: 'view',
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

  function getViewTypeBadge(viewType: string) {
    const colors: Record<string, string> = {
      template: 'bg-blue-500/20 text-blue-400',
      partial: 'bg-purple-500/20 text-purple-400',
      layout: 'bg-green-500/20 text-green-400'
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[viewType] || 'bg-gray-500/20 text-gray-400'}`}>
        {viewType}
      </span>
    )
  }

  function getDurationColor(duration: number) {
    if (duration > 100) return 'text-red-400'
    if (duration > 50) return 'text-yellow-400'
    return 'text-dark-muted'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Views</h1>
        <p className="text-dark-muted text-sm mt-1">View templates rendered by ActionView</p>
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
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Path</TableHead>
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
                  {tagFilter ? `No views found with tag "${tagFilter}".` : 'No views recorded yet.'}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id} onClick={() => navigate(`/views/${entry.id}`)}>
                  <TableCell>
                    {getViewTypeBadge(String(entry.payload.view_type))}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-white" title={String(entry.payload.name)}>
                    {truncate(String(entry.payload.name), 40)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-dark-muted" title={String(entry.payload.path)}>
                    {truncate(String(entry.payload.path), 40)}
                  </TableCell>
                  <TableCell className={`text-right ${getDurationColor(Number(entry.payload.duration))}`}>
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
