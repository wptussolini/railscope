import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEntries } from '@/api/entries'
import { Entry } from '@/lib/types'
import { timeAgo, truncate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'

export default function ExceptionsIndex() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadEntries()
  }, [page])

  async function loadEntries() {
    setLoading(true)
    try {
      const response = await getEntries({ type: 'exception', page })
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
        <h1 className="text-2xl font-semibold text-white">Exceptions</h1>
        <p className="text-dark-muted text-sm mt-1">Unhandled exceptions in your application</p>
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
                  No exceptions recorded. That's a good thing!
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const payload = entry.payload as Record<string, unknown>
                return (
                  <TableRow key={entry.id} onClick={() => navigate(`/exceptions/${entry.id}`)}>
                    <TableCell>
                      <div className="text-red-400 font-medium">{String(payload.class)}</div>
                      <div className="text-dark-muted text-sm">
                        {truncate(String(payload.message), 60)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-dark-muted">
                      {String(payload.controller)}#{String(payload.action)}
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
