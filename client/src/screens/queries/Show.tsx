import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function QueriesShow() {
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/queries')}
          className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block"
        >
          ← Back to queries
        </button>
        <h1 className="text-xl font-semibold text-white">{String(payload.name || 'SQL Query')}</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-xs text-dark-muted uppercase">Duration</dt>
                <dd className="mt-1 text-lg">{String(payload.duration)}ms</dd>
              </div>
              <div>
                <dt className="text-xs text-dark-muted uppercase">Cached</dt>
                <dd className="mt-1">{payload.cached ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-xs text-dark-muted uppercase">Row Count</dt>
                <dd className="mt-1">{payload.row_count != null ? String(payload.row_count) : '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-dark-muted uppercase">Request ID</dt>
                <dd className="mt-1 font-mono text-xs text-dark-muted truncate">
                  {String(payload.request_id)}
                </dd>
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
                <Badge key={tag} variant={tag === 'slow' ? 'error' : 'default'}>{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SQL</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="bg-black/20 p-4 overflow-auto font-mono text-sm text-purple-300 whitespace-pre-wrap">
              {String(payload.sql)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
