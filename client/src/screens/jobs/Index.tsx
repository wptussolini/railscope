import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getEntries } from '@/api/entries'
import { Entry } from '@/lib/types'
import { timeAgo } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'

export default function JobsIndex() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<'all' | 'enqueue' | 'perform'>('all')

  const tagFilter = searchParams.get('tag') || ''

  useEffect(() => {
    loadEntries()
  }, [page, filter, tagFilter])

  async function loadEntries() {
    setLoading(true)
    try {
      const type = filter === 'all' ? undefined : `job_${filter}`
      const response = await getEntries({
        type,
        tag: tagFilter || (filter === 'all' ? 'job' : undefined),
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

  function handleFilterChange(newFilter: 'all' | 'enqueue' | 'perform') {
    setFilter(newFilter)
    setPage(1)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Jobs</h1>
        <p className="text-dark-muted text-sm mt-1">Background jobs in your application</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex gap-2">
          {(['all', 'enqueue', 'perform'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                filter === f
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-dark-border text-dark-muted hover:text-dark-text'
              }`}
            >
              {f === 'all' ? 'All' : f === 'enqueue' ? 'Enqueued' : 'Performed'}
            </button>
          ))}
        </div>
        <SearchInput
          placeholder="Search by tag (failed, queue name...)"
          value={tagFilter}
          onChange={handleSearch}
          className="flex-1 max-w-sm"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Queue</TableHead>
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
                  {tagFilter ? `No jobs found with tag "${tagFilter}".` : 'No jobs recorded yet.'}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const payload = entry.payload as Record<string, unknown>
                const isFailed = entry.tags.includes('failed')
                return (
                  <TableRow key={entry.id} onClick={() => navigate(`/jobs/${entry.id}`)}>
                    <TableCell>
                      <Badge variant={entry.entry_type === 'job_enqueue' ? 'info' : 'success'}>
                        {entry.entry_type === 'job_enqueue' ? 'enqueue' : 'perform'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={isFailed ? 'text-red-400' : 'text-green-400'}>
                        {String(payload.job_class)}
                      </span>
                    </TableCell>
                    <TableCell className="text-dark-muted">
                      {String(payload.queue_name)}
                    </TableCell>
                    <TableCell className="text-right text-dark-muted">
                      {payload.duration ? `${String(payload.duration)}ms` : '-'}
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
