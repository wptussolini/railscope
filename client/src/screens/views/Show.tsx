import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/Table'
import { TypeBadge } from '@/components/ui/Badge'
import { JsonViewer } from '@/components/ui/JsonViewer'
import { timeAgo, groupEntriesByType } from '@/lib/utils'

type TabType = 'data' | 'properties'

export default function ViewsShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [batch, setBatch] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('data')

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

  const getTabContent = () => {
    if (activeTab === 'data') {
      return payload.data || {}
    }
    return {
      name: payload.name,
      path: payload.path,
      full_path: payload.full_path,
      view_type: payload.view_type,
      layout: payload.layout,
      duration: payload.duration
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/views')}
          className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block"
        >
          ← Back to views
        </button>
        <h1 className="text-2xl font-semibold text-white">View Details</h1>
      </div>

      {/* Attributes Table */}
      <Card className="mb-5">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="text-dark-muted w-40">Type</TableCell>
              <TableCell>
                {getViewTypeBadge(String(payload.view_type))}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">Name</TableCell>
              <TableCell className="font-mono text-sm text-white">
                {String(payload.name)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">Path</TableCell>
              <TableCell className="font-mono text-sm">{String(payload.path)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-dark-muted">Full Path</TableCell>
              <TableCell className="font-mono text-xs text-dark-muted break-all">{String(payload.full_path)}</TableCell>
            </TableRow>
            {Boolean(payload.layout) && (
              <TableRow>
                <TableCell className="text-dark-muted">Layout</TableCell>
                <TableCell className="font-mono text-sm">{String(payload.layout)}</TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell className="text-dark-muted">Duration</TableCell>
              <TableCell>{String(payload.duration ?? '-')} ms</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Data Card with Tabs */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex border-b border-dark-border">
          <button
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'data'
                ? 'text-white bg-dark-card border-b-2 border-blue-500'
                : 'text-dark-muted hover:text-white'
            }`}
            onClick={() => setActiveTab('data')}
          >
            View Data
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'properties'
                ? 'text-white bg-dark-card border-b-2 border-blue-500'
                : 'text-dark-muted hover:text-white'
            }`}
            onClick={() => setActiveTab('properties')}
          >
            Properties
          </button>
        </div>
        <CardContent className="p-0">
          <JsonViewer data={getTabContent()} className="rounded-t-none border-0" />
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
    command: 'Commands',
    view: 'Views'
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
    command: 'commands',
    view: 'views'
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
    case 'view':
      return String(payload.name || payload.path)
    default:
      return entry.entry_type
  }
}
