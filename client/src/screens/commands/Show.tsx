import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { JsonViewer } from '@/components/ui/JsonViewer'

type TabType = 'arguments' | 'options'

export default function CommandsShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [batch, setBatch] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState<TabType>('arguments')

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
        <Card>
          <CardContent className="py-12 text-center text-dark-muted">
            Fetching...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-dark-muted">
            No entry found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const payload = entry.payload as Record<string, unknown>
  const exitCode = Number(payload.exit_code ?? 0)

  // Always include command in arguments like Telescope does
  const rawArgs = (payload.arguments || {}) as Record<string, unknown>
  const args = Object.keys(rawArgs).length > 0
    ? rawArgs
    : { command: payload.command }

  // Show all options including false/null values (like Telescope does)
  const options = (payload.options || {}) as Record<string, unknown>

  const formattedTime = new Date(entry.occurred_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
  const timeAgo = getTimeAgo(entry.occurred_at)

  return (
    <div className="p-6 space-y-5">
      {/* Command Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Command Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap w-28">Time</td>
                <td className="px-4 py-3">{formattedTime} ({timeAgo})</td>
              </tr>
              {payload.hostname ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Hostname</td>
                  <td className="px-4 py-3">{String(payload.hostname)}</td>
                </tr>
              ) : null}
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Command</td>
                <td className="px-4 py-3">
                  <code className="text-blue-400">{String(payload.command)}</code>
                </td>
              </tr>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Exit Code</td>
                <td className="px-4 py-3">
                  <span className={exitCode === 0 ? 'text-green-400' : 'text-red-400'}>
                    {exitCode}
                  </span>
                </td>
              </tr>
              {payload.duration ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Duration</td>
                  <td className="px-4 py-3">{String(payload.duration)}ms</td>
                </tr>
              ) : null}
              {payload.description ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Description</td>
                  <td className="px-4 py-3 text-dark-muted">{String(payload.description)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Arguments / Options Card */}
      <Card>
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setCurrentTab('arguments')}
            className={`px-4 py-2.5 text-sm font-medium ${
              currentTab === 'arguments'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Arguments ({Object.keys(args).length})
          </button>
          <button
            onClick={() => setCurrentTab('options')}
            className={`px-4 py-2.5 text-sm font-medium ${
              currentTab === 'options'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Options ({Object.keys(options).length})
          </button>
        </div>
        <div className="bg-[#1a1a2e] p-4">
          {currentTab === 'arguments' && Object.keys(args).length === 0 ? (
            <div className="text-dark-muted text-sm">No arguments provided</div>
          ) : currentTab === 'options' && Object.keys(options).length === 0 ? (
            <div className="text-dark-muted text-sm">No options provided</div>
          ) : (
            <JsonViewer
              data={currentTab === 'arguments' ? args : options}
              className="border-0 bg-transparent"
            />
          )}
        </div>
      </Card>

      {/* Related Entries (batch) - exceptions will appear here */}
      {batch.length > 0 && <RelatedEntries entries={batch} navigate={navigate} />}
    </div>
  )
}

function getTimeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

interface RelatedEntriesProps {
  entries: Entry[]
  navigate: ReturnType<typeof useNavigate>
}

function RelatedEntries({ entries, navigate }: RelatedEntriesProps) {
  const [currentTab, setCurrentTab] = useState<string>('')

  const groupedEntries = entries.reduce((acc, entry) => {
    const type = entry.entry_type
    if (!acc[type]) acc[type] = []
    acc[type].push(entry)
    return acc
  }, {} as Record<string, Entry[]>)

  const tabs = Object.entries(groupedEntries).map(([type, items]) => ({
    type,
    label: getTypeLabel(type),
    count: items.length
  }))

  useEffect(() => {
    if (tabs.length > 0 && !currentTab) {
      setCurrentTab(tabs[0].type)
    }
  }, [tabs, currentTab])

  if (tabs.length === 0) return null

  const currentEntries = groupedEntries[currentTab] || []

  return (
    <Card>
      <div className="flex flex-wrap border-b border-dark-border">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setCurrentTab(tab.type)}
            className={`px-4 py-2.5 text-sm font-medium ${
              currentTab === tab.type
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            {currentTab === 'query' && (
              <>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-muted">Query</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark-muted">Duration</th>
                <th className="w-12"></th>
              </>
            )}
            {currentTab === 'exception' && (
              <>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-muted">Message</th>
                <th className="w-12"></th>
              </>
            )}
            {(currentTab === 'job_enqueue' || currentTab === 'job_perform') && (
              <>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-muted">Job</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-muted">Status</th>
                <th className="w-12"></th>
              </>
            )}
            {!['query', 'exception', 'job_enqueue', 'job_perform'].includes(currentTab) && (
              <>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-muted">Entry</th>
                <th className="w-12"></th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {currentEntries.map((entry) => {
            const payload = entry.payload as Record<string, unknown>
            const path = getEntryPath(entry)

            return (
              <tr
                key={entry.id}
                onClick={() => navigate(path)}
                className="border-b border-dark-border hover:bg-white/[0.02] cursor-pointer"
              >
                {currentTab === 'query' && (
                  <>
                    <td className="px-4 py-3" title={String(payload.sql)}>
                      <code className="text-xs text-dark-muted">
                        {String(payload.sql || '').substring(0, 110)}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {entry.tags.includes('slow') ? (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                          {String(payload.duration)}ms
                        </span>
                      ) : (
                        <span className="text-dark-muted">{String(payload.duration)}ms</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ArrowIcon />
                    </td>
                  </>
                )}
                {currentTab === 'exception' && (
                  <>
                    <td className="px-4 py-3" title={String(payload.class)}>
                      <span>{String(payload.class)}</span>
                      <br />
                      <small className="text-dark-muted">
                        {String(payload.message || '').substring(0, 200)}
                      </small>
                    </td>
                    <td className="px-4 py-3">
                      <ArrowIcon />
                    </td>
                  </>
                )}
                {(currentTab === 'job_enqueue' || currentTab === 'job_perform') && (
                  <>
                    <td className="px-4 py-3">
                      <span title={String(payload.job_class)}>
                        {String(payload.job_class)}
                      </span>
                      <br />
                      <small className="text-dark-muted">
                        Queue: {String(payload.queue_name)}
                      </small>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        entry.tags.includes('failed')
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {entry.tags.includes('failed') ? 'failed' : 'processed'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ArrowIcon />
                    </td>
                  </>
                )}
                {!['query', 'exception', 'job_enqueue', 'job_perform'].includes(currentTab) && (
                  <>
                    <td className="px-4 py-3 text-dark-muted">{entry.entry_type}</td>
                    <td className="px-4 py-3">
                      <ArrowIcon />
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function ArrowIcon() {
  return (
    <svg className="w-5 h-5 text-dark-muted" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function getEntryPath(entry: Entry): string {
  switch (entry.entry_type) {
    case 'query': return `/queries/${entry.id}`
    case 'exception': return `/exceptions/${entry.id}`
    case 'job_enqueue':
    case 'job_perform': return `/jobs/${entry.id}`
    case 'request': return `/requests/${entry.id}`
    case 'model': return `/models/${entry.id}`
    default: return `/${entry.entry_type}s/${entry.id}`
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    query: 'Queries',
    exception: 'Exceptions',
    job_enqueue: 'Jobs',
    job_perform: 'Jobs',
    request: 'Requests',
    log: 'Logs',
    cache: 'Cache',
    event: 'Events',
    mail: 'Mail',
    notification: 'Notifications',
    model: 'Models',
    gate: 'Gates',
    redis: 'Redis',
    view: 'Views',
    client_request: 'HTTP Client'
  }
  return labels[type] || type
}
