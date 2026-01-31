import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { MethodBadge, StatusBadge, TypeBadge, Badge } from '@/components/ui/Badge'
import { JsonViewer } from '@/components/ui/JsonViewer'

export default function RequestsShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [batch, setBatch] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/requests')}
          className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block"
        >
          ← Back to requests
        </button>
        <div className="flex items-center gap-3">
          <MethodBadge method={String(payload.method)} />
          <h1 className="text-xl font-mono text-white">{String(payload.path)}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Method</dt>
                  <dd className="mt-1"><MethodBadge method={String(payload.method)} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Status</dt>
                  <dd className="mt-1"><StatusBadge status={Number(payload.status)} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Controller</dt>
                  <dd className="mt-1 font-mono text-sm">{String(payload.controller)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Action</dt>
                  <dd className="mt-1 font-mono text-sm">{String(payload.action)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Duration</dt>
                  <dd className="mt-1">{String(payload.duration)}ms</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">DB Runtime</dt>
                  <dd className="mt-1">{payload.db_runtime ? String(payload.db_runtime) : '-'}ms</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">View Runtime</dt>
                  <dd className="mt-1">{payload.view_runtime ? String(payload.view_runtime) : '-'}ms</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Request ID</dt>
                  <dd className="mt-1 font-mono text-xs text-dark-muted">{String(payload.request_id)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payload</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <JsonViewer data={payload} className="rounded-t-none border-0" />
            </CardContent>
          </Card>
        </div>

        <div>
          {batch.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Request Timeline ({batch.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {batch.map((r) => (
                    <Link
                      key={r.id}
                      to={`/${r.entry_type === 'query' ? 'queries' : r.entry_type + 's'}/${r.id}`}
                      className="flex items-center gap-2 p-2 rounded hover:bg-white/[0.02] transition-colors"
                    >
                      <TypeBadge type={r.entry_type} />
                      <span className="text-xs text-dark-muted flex-1 truncate">
                        {getEntrySummary(r)}
                      </span>
                      <span className="text-xs text-dark-muted">
                        {r.payload.duration ? `${Number(r.payload.duration).toFixed(0)}ms` : ''}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function getEntrySummary(entry: Entry): string {
  const payload = entry.payload as Record<string, unknown>
  switch (entry.entry_type) {
    case 'query':
      return String(payload.sql || '').substring(0, 40) + '...'
    case 'exception':
      return String(payload.class)
    case 'job_enqueue':
    case 'job_perform':
      return String(payload.job_class)
    default:
      return entry.entry_type
  }
}
