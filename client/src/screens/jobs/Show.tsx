import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { JsonViewer } from '@/components/ui/JsonViewer'

export default function JobsShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<Entry | null>(null)
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
    } catch (error) {
      console.error('Failed to load entry:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-dark-muted">Loading...</div>
  }

  if (!entry) {
    return <div className="p-6 text-dark-muted">Entry not found</div>
  }

  const payload = entry.payload as Record<string, unknown>
  const isFailed = entry.tags.includes('failed')
  const exception = payload.exception as Record<string, unknown> | undefined

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/jobs')}
          className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block"
        >
          ← Back to jobs
        </button>
        <div className="flex items-center gap-3">
          <Badge variant={entry.entry_type === 'job_enqueue' ? 'info' : 'success'}>
            {entry.entry_type === 'job_enqueue' ? 'enqueue' : 'perform'}
          </Badge>
          <h1 className={`text-xl font-semibold ${isFailed ? 'text-red-400' : 'text-green-400'}`}>
            {String(payload.job_class)}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-xs text-dark-muted uppercase">Queue</dt>
                <dd className="mt-1">{String(payload.queue_name)}</dd>
              </div>
              <div>
                <dt className="text-xs text-dark-muted uppercase">Job ID</dt>
                <dd className="mt-1 font-mono text-xs text-dark-muted">{String(payload.job_id)}</dd>
              </div>
              {payload.duration != null && (
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Duration</dt>
                  <dd className="mt-1">{String(payload.duration)}ms</dd>
                </div>
              )}
              {payload.executions != null && (
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Executions</dt>
                  <dd className="mt-1">{String(payload.executions)}</dd>
                </div>
              )}
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
                <Badge key={tag} variant={tag === 'failed' ? 'error' : 'default'}>{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {payload.arguments != null && (
          <Card>
            <CardHeader>
              <CardTitle>Arguments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <JsonViewer data={payload.arguments} className="rounded-t-none border-0" />
            </CardContent>
          </Card>
        )}

        {exception && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-400">Exception</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-red-400 font-medium">{String(exception.class)}</div>
              <div className="text-dark-muted mt-1">{String(exception.message)}</div>
              {Array.isArray(exception.backtrace) && exception.backtrace.length > 0 ? (
                <div className="mt-4 bg-black/20 rounded overflow-auto max-h-48">
                  {(exception.backtrace as string[]).map((line, i) => (
                    <div key={i} className="px-3 py-0.5 font-mono text-xs text-dark-muted">
                      {line}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
