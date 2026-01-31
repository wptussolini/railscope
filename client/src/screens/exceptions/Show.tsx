import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge, MethodBadge } from '@/components/ui/Badge'

export default function ExceptionsShow() {
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
  const backtrace = payload.backtrace as string[] | undefined

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/exceptions')}
          className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block"
        >
          ← Back to exceptions
        </button>
        <h1 className="text-xl font-semibold text-red-400">{payload.class as string}</h1>
        <p className="text-dark-muted mt-1">{payload.message as string}</p>
      </div>

      <div className="space-y-6">
        {payload.source === 'command' ? (
          <Card>
            <CardHeader>
              <CardTitle>Command Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Source</dt>
                  <dd className="mt-1"><Badge variant="info">Command</Badge></dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Command</dt>
                  <dd className="mt-1 font-mono text-sm text-blue-400">{payload.command as string}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Method</dt>
                  <dd className="mt-1"><MethodBadge method={payload.method as string} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Path</dt>
                  <dd className="mt-1 font-mono text-sm">{payload.path as string}</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Controller</dt>
                  <dd className="mt-1 font-mono text-sm">{payload.controller as string}</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-muted uppercase">Action</dt>
                  <dd className="mt-1 font-mono text-sm">{payload.action as string}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant={tag === 'exception' ? 'error' : 'default'}>{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {backtrace && backtrace.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stack Trace</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-black/20 overflow-auto max-h-96">
                {backtrace.map((line, i) => (
                  <div
                    key={i}
                    className="flex gap-4 px-4 py-1 hover:bg-white/[0.02] font-mono text-xs"
                  >
                    <span className="text-dark-muted w-6 text-right flex-shrink-0">{i + 1}</span>
                    <code className="text-dark-text whitespace-pre">{line}</code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
