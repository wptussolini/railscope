import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEntries } from '@/api/entries'
import { Entry } from '@/lib/types'
import { timeAgo } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'

export default function JobsIndex() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<'all' | 'enqueue' | 'perform'>('all')

  useEffect(() => {
    loadEntries()
  }, [page, filter])

  async function loadEntries() {
    setLoading(true)
    try {
      const type = filter === 'all' ? undefined : `job_${filter}`
      const response = await getEntries({ type, tag: filter === 'all' ? 'job' : undefined, page })
      setEntries(response.data)
      setTotalPages(response.meta.total_pages)
    } catch (error) {
      console.error('Failed to load entries:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Jobs</h1>
        <p className="text-dark-muted text-sm mt-1">Background jobs in your application</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'enqueue', 'perform'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
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
                  No jobs recorded yet.
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
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>
    </div>
  )
}
