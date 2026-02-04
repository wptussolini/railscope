import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import { MethodBadge, StatusBadge, TypeBadge } from '@/components/ui/Badge'
import { JsonViewer } from '@/components/ui/JsonViewer'
import { timeAgo, groupEntriesByType } from '@/lib/utils'

type TabType = 'payload' | 'headers'
type ResponseTabType = 'response' | 'response_headers' | 'session'

export default function RequestsShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [batch, setBatch] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [requestTab, setRequestTab] = useState<TabType>('payload')
  const [responseTab, setResponseTab] = useState<ResponseTabType>('response')

  useEffect(() => {
    loadEntry()
  }, [id])

  async function loadEntry() {
    if (!id) return
    setLoading(true)
    try {
      const response = await getEntry(id)
      setEntry(response.data)
      setBatch(response.batch || [])
    } catch (error) {
      console.error('Failed to load entry:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-dark-muted">Loading...</div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="p-6">
        <div className="text-dark-muted">Entry not found</div>
      </div>
    )
  }

  const payload = entry.payload as Record<string, unknown>
  const groupedBatch = groupEntriesByType(batch)

  // Get tab content
  const getRequestTabContent = () => {
    if (requestTab === 'payload') {
      return payload.payload || {}
    }
    return payload.headers || {}
  }

  const getResponseTabContent = () => {
    if (responseTab === 'response') {
      return payload.response || {}
    }
    if (responseTab === 'response_headers') {
      return payload.response_headers || {}
    }
    return payload.session || {}
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/requests')}
          className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block"
        >
          ← Back to requests
        </button>
        <h1 className="text-2xl font-semibold text-white">Request Details</h1>
      </div>

      {/* Attributes Table */}
      <Card className="mb-5">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="text-dark-muted w-40">Method</TableCell>
              <TableCell>
                <MethodBadge method={String(payload.method)} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">Controller Action</TableCell>
              <TableCell className="font-mono text-sm">
                {String(payload.controller_action || `${payload.controller}@${payload.action}`)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">Path</TableCell>
              <TableCell className="font-mono text-sm">{String(payload.path)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">Status</TableCell>
              <TableCell>
                <StatusBadge status={Number(payload.status)} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">Duration</TableCell>
              <TableCell>{String(payload.duration ?? '-')} ms</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">IP Address</TableCell>
              <TableCell>{String(payload.ip_address || '-')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">Hostname</TableCell>
              <TableCell className="font-mono text-sm">{String(payload.hostname || '-')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">DB Runtime</TableCell>
              <TableCell>{payload.db_runtime ? `${payload.db_runtime} ms` : '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">View Runtime</TableCell>
              <TableCell>{payload.view_runtime ? `${payload.view_runtime} ms` : '-'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Request Card with Tabs */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex border-b border-dark-border">
          <button
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              requestTab === 'payload'
                ? 'text-white bg-dark-card border-b-2 border-blue-500'
                : 'text-dark-muted hover:text-white'
            }`}
            onClick={() => setRequestTab('payload')}
          >
            Payload
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              requestTab === 'headers'
                ? 'text-white bg-dark-card border-b-2 border-blue-500'
                : 'text-dark-muted hover:text-white'
            }`}
            onClick={() => setRequestTab('headers')}
          >
            Headers
          </button>
        </div>
        <CardContent className="p-0">
          <JsonViewer data={getRequestTabContent()} className="rounded-t-none border-0" />
        </CardContent>
      </Card>

      {/* Response Card with Tabs */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex border-b border-dark-border">
          <button
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              responseTab === 'response'
                ? 'text-white bg-dark-card border-b-2 border-blue-500'
                : 'text-dark-muted hover:text-white'
            }`}
            onClick={() => setResponseTab('response')}
          >
            Response
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              responseTab === 'response_headers'
                ? 'text-white bg-dark-card border-b-2 border-blue-500'
                : 'text-dark-muted hover:text-white'
            }`}
            onClick={() => setResponseTab('response_headers')}
          >
            Headers
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              responseTab === 'session'
                ? 'text-white bg-dark-card border-b-2 border-blue-500'
                : 'text-dark-muted hover:text-white'
            }`}
            onClick={() => setResponseTab('session')}
          >
            Session
          </button>
        </div>
        <CardContent className="p-0">
          <JsonViewer data={getResponseTabContent()} className="rounded-t-none border-0" />
        </CardContent>
      </Card>

      {/* Related Entries */}
      {batch.length > 0 && (
        <Card>
          <div className="p-4 border-b border-dark-border">
            <h3 className="text-lg font-medium text-white">Related Entries</h3>
          </div>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(groupedBatch).map(([type, entries]) => (
                <span
                  key={type}
                  className="px-2 py-1 text-xs bg-dark-bg rounded text-dark-muted"
                >
                  {formatEntryType(type)} ({entries.length})
                </span>
              ))}
            </div>
            <div className="space-y-1">
              {batch.map((r) => (
                <Link
                  key={r.id}
                  to={getEntryLink(r)}
                  className="flex items-center gap-3 p-2 rounded hover:bg-white/[0.02] transition-colors"
                >
                  <TypeBadge type={r.entry_type} />
                  <span className="text-sm text-dark-muted flex-1 truncate font-mono">
                    {getEntrySummary(r)}
                  </span>
                  <span className="text-xs text-dark-muted">
                    {timeAgo(r.occurred_at)}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatEntryType(type: string): string {
  const typeMap: Record<string, string> = {
    query: 'Queries',
    exception: 'Exceptions',
    job_enqueue: 'Enqueued',
    job_perform: 'Performed',
    request: 'Requests',
    command: 'Commands'
  }
  return typeMap[type] || type
}

function getEntryLink(entry: Entry): string {
  const typeRouteMap: Record<string, string> = {
    query: 'queries',
    exception: 'exceptions',
    job_enqueue: 'jobs',
    job_perform: 'jobs',
    request: 'requests',
    command: 'commands'
  }
  const route = typeRouteMap[entry.entry_type] || entry.entry_type + 's'
  return `/${route}/${entry.uuid || entry.id}`
}

function getEntrySummary(entry: Entry): string {
  const payload = entry.payload as Record<string, unknown>
  switch (entry.entry_type) {
    case 'query':
      return String(payload.sql || '').substring(0, 60) + (String(payload.sql || '').length > 60 ? '...' : '')
    case 'exception':
      return `${payload.class}: ${String(payload.message || '').substring(0, 40)}`
    case 'job_enqueue':
    case 'job_perform':
      return String(payload.job_class)
    default:
      return entry.entry_type
  }
}
