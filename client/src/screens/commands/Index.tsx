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

export default function CommandsIndex() {
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
        type: 'command',
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
        <h1 className="text-2xl font-semibold text-white">Commands</h1>
        <p className="text-dark-muted text-sm mt-1">Rake tasks executed in your application</p>
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
              <TableHead>Command</TableHead>
              <TableHead>Exit Code</TableHead>
              <TableHead className="text-right">Duration</TableHead>
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
                  {tagFilter ? `No commands found with tag "${tagFilter}".` : 'No commands recorded yet.'}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const payload = entry.payload as Record<string, unknown>
                const isFailed = entry.tags.includes('failed')
                const exitCode = Number(payload.exit_code ?? 0)
                return (
                  <TableRow key={entry.id} onClick={() => navigate(`/commands/${entry.id}`)}>
                    <TableCell>
                      <span className={`font-mono ${isFailed ? 'text-red-400' : 'text-green-400'}`}>
                        {String(payload.command)}
                      </span>
                      {payload.description ? (
                        <div className="text-dark-muted text-xs mt-0.5">
                          {String(payload.description)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exitCode === 0 ? 'success' : 'error'}>
                        {exitCode}
                      </Badge>
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
