import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { JsonViewer } from '@/components/ui/JsonViewer'

type TabType = 'data' | 'exception' | 'location' | 'stacktrace'

export default function JobsShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [batch, setBatch] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState<TabType>('data')
  const [showAllTrace, setShowAllTrace] = useState(false)

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
            Loading...
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
            Job not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const payload = entry.payload as Record<string, unknown>
  const isFailed = entry.tags.includes('failed')
  const isPerform = entry.entry_type === 'job_perform'
  const exception = payload.exception as Record<string, unknown> | undefined

  // Determine status
  const status = isFailed ? 'failed' : isPerform ? 'processed' : 'pending'
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    processed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400'
  }

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

  // Exception data
  const exceptionBacktrace = (exception?.backtrace as string[] | undefined) || []
  const exceptionLinePreview = exception?.line_preview as Record<string, string> | undefined
  const exceptionFile = exception?.file ? String(exception.file) : ''
  const exceptionLine = exception?.line ? Number(exception.line) : 0
  const displayedTrace = showAllTrace ? exceptionBacktrace : exceptionBacktrace.slice(0, 5)

  // Find related request/command in batch
  const relatedRequest = batch.find(e => e.entry_type === 'request')
  const relatedCommand = batch.find(e => e.entry_type === 'command')

  return (
    <div className="p-6 space-y-5">
      {/* Job Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap w-32">Time</td>
                <td className="px-4 py-3">{formattedTime} ({timeAgo})</td>
              </tr>
              {payload.hostname ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Hostname</td>
                  <td className="px-4 py-3">{String(payload.hostname)}</td>
                </tr>
              ) : null}
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Status</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-sm rounded ${statusColors[status]}`}>
                    {status}
                  </span>
                </td>
              </tr>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Job</td>
                <td className="px-4 py-3">
                  <span className={isFailed ? 'text-red-400' : 'text-green-400'}>
                    {String(payload.job_class)}
                  </span>
                </td>
              </tr>
              {payload.connection ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Connection</td>
                  <td className="px-4 py-3">{String(payload.connection)}</td>
                </tr>
              ) : null}
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Queue</td>
                <td className="px-4 py-3">{String(payload.queue_name)}</td>
              </tr>
              {payload.executions ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Attempts</td>
                  <td className="px-4 py-3">{String(payload.executions)}</td>
                </tr>
              ) : null}
              {payload.duration ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Duration</td>
                  <td className="px-4 py-3">{String(payload.duration)}ms</td>
                </tr>
              ) : null}
              {payload.scheduled_at ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Scheduled At</td>
                  <td className="px-4 py-3">{String(payload.scheduled_at)}</td>
                </tr>
              ) : null}
              {relatedRequest ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Request</td>
                  <td className="px-4 py-3">
                    <Link to={`/requests/${relatedRequest.id}`} className="text-blue-400 hover:text-blue-300">
                      View Request
                    </Link>
                  </td>
                </tr>
              ) : null}
              {relatedCommand ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Command</td>
                  <td className="px-4 py-3">
                    <Link to={`/commands/${relatedCommand.id}`} className="text-blue-400 hover:text-blue-300">
                      View Command
                    </Link>
                  </td>
                </tr>
              ) : null}
              {entry.tags.length > 0 ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Tags</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <Link key={tag} to={`/jobs?tag=${tag}`}>
                          <Badge variant={tag === 'failed' ? 'error' : 'info'}>{tag}</Badge>
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Data / Exception Tabs Card */}
      <Card>
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setCurrentTab('data')}
            className={`px-4 py-2.5 text-sm font-medium ${
              currentTab === 'data'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Data
          </button>
          {exception ? (
            <>
              <button
                onClick={() => setCurrentTab('exception')}
                className={`px-4 py-2.5 text-sm font-medium ${
                  currentTab === 'exception'
                    ? 'bg-red-500 text-white'
                    : 'text-dark-muted hover:text-dark-text'
                }`}
              >
                Exception Message
              </button>
              {exceptionLinePreview ? (
                <button
                  onClick={() => setCurrentTab('location')}
                  className={`px-4 py-2.5 text-sm font-medium ${
                    currentTab === 'location'
                      ? 'bg-red-500 text-white'
                      : 'text-dark-muted hover:text-dark-text'
                  }`}
                >
                  Exception Location
                </button>
              ) : null}
              <button
                onClick={() => setCurrentTab('stacktrace')}
                className={`px-4 py-2.5 text-sm font-medium ${
                  currentTab === 'stacktrace'
                    ? 'bg-red-500 text-white'
                    : 'text-dark-muted hover:text-dark-text'
                }`}
              >
                Stacktrace
              </button>
            </>
          ) : null}
        </div>

        {currentTab === 'data' && (
          <div className="bg-[#1a1a2e]">
            {payload.arguments && (Array.isArray(payload.arguments) ? (payload.arguments as unknown[]).length > 0 : Object.keys(payload.arguments as object).length > 0) ? (
              <JsonViewer
                data={payload.arguments}
                className="border-0 bg-transparent"
              />
            ) : (
              <div className="p-4 text-dark-muted text-sm">No arguments</div>
            )}
          </div>
        )}

        {currentTab === 'exception' && exception ? (
          <div className="bg-[#1a1a2e] p-4">
            <div className="text-red-400 font-medium mb-2">{String(exception.class)}</div>
            <pre className="text-dark-muted whitespace-pre-wrap break-words font-mono text-sm">
              {String(exception.message)}
            </pre>
          </div>
        ) : null}

        {currentTab === 'location' && exceptionLinePreview ? (
          <div className="bg-[#1a1a2e]">
            <CodePreview
              file={exceptionFile}
              line={exceptionLine}
              linePreview={exceptionLinePreview}
            />
          </div>
        ) : null}

        {currentTab === 'stacktrace' && exception ? (
          <div className="bg-[#1a1a2e]">
            <table className="w-full">
              <tbody>
                {displayedTrace.map((traceLine, i) => (
                  <tr key={i} className="border-b border-dark-border/50">
                    <td className="px-4 py-2">
                      <code className="text-dark-muted text-xs font-mono">{traceLine}</code>
                    </td>
                  </tr>
                ))}
                {!showAllTrace && exceptionBacktrace.length > 5 ? (
                  <tr>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setShowAllTrace(true)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Show All ({exceptionBacktrace.length} lines)
                      </button>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {/* Related Entries */}
      {batch.length > 0 && <RelatedEntries entries={batch} currentEntryId={entry.id} navigate={navigate} />}
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

interface CodePreviewProps {
  file: string
  line: number
  linePreview?: Record<string, string>
}

function CodePreview({ file, line, linePreview }: CodePreviewProps) {
  if (!linePreview || Object.keys(linePreview).length === 0) {
    return (
      <div className="p-4 font-mono text-sm">
        <div className="text-dark-muted mb-2">File:</div>
        <div className="text-blue-400 mb-4 break-all">{file}</div>
        <div className="text-dark-muted mb-2">Line:</div>
        <div className="inline-block px-3 py-1 bg-red-500/20 text-red-400 rounded">
          {line}
        </div>
      </div>
    )
  }

  const lineNumbers = Object.keys(linePreview).map(Number).sort((a, b) => a - b)

  return (
    <div className="overflow-x-auto">
      <pre className="text-sm">
        {lineNumbers.map((lineNum) => {
          const isHighlighted = lineNum === line
          const code = linePreview[lineNum] || ''

          return (
            <div
              key={lineNum}
              className={`flex ${isHighlighted ? 'bg-red-500/30' : ''}`}
            >
              <span
                className={`px-3 py-0.5 text-right select-none min-w-[3rem] ${
                  isHighlighted ? 'text-red-400 font-bold' : 'text-dark-muted'
                }`}
              >
                {lineNum}
              </span>
              <code
                className={`px-3 py-0.5 flex-1 whitespace-pre ${
                  isHighlighted ? 'text-white' : 'text-dark-text'
                }`}
              >
                {code}
              </code>
            </div>
          )
        })}
      </pre>
    </div>
  )
}

interface RelatedEntriesProps {
  entries: Entry[]
  currentEntryId: number
  navigate: ReturnType<typeof useNavigate>
}

function RelatedEntries({ entries, currentEntryId, navigate }: RelatedEntriesProps) {
  const [currentTab, setCurrentTab] = useState<string>('')

  // Filter out the current entry from related entries
  const filteredEntries = entries.filter(e => e.id !== currentEntryId)

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
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
  }, [tabs.length])

  if (tabs.length === 0) return null

  const currentEntries = groupedEntries[currentTab] || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Entries</CardTitle>
      </CardHeader>
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
        <tbody>
          {currentEntries.map((relatedEntry) => {
            const relPayload = relatedEntry.payload as Record<string, unknown>
            const path = getEntryPath(relatedEntry)

            return (
              <tr
                key={relatedEntry.id}
                onClick={() => navigate(path)}
                className="border-b border-dark-border hover:bg-white/[0.02] cursor-pointer"
              >
                <td className="px-4 py-3">
                  <span className="text-dark-text text-sm">{getEntryDescription(relatedEntry, relPayload)}</span>
                </td>
                <td className="px-4 py-3 text-right text-dark-muted text-xs">
                  {getTimeAgo(relatedEntry.occurred_at)}
                </td>
                <td className="px-4 py-3 w-12">
                  <ArrowIcon />
                </td>
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
    case 'command': return `/commands/${entry.id}`
    case 'model': return `/models/${entry.id}`
    default: return `/${entry.entry_type}s/${entry.id}`
  }
}

function getEntryDescription(entry: Entry, payload: Record<string, unknown>): string {
  switch (entry.entry_type) {
    case 'query':
      return String(payload.sql || '').substring(0, 100)
    case 'request':
      return `${payload.method} ${payload.path}`
    case 'command':
      return `Command: ${payload.command}`
    case 'exception':
      return `${payload.class}: ${String(payload.message || '').substring(0, 50)}`
    case 'job_enqueue':
    case 'job_perform':
      return `Job: ${payload.job_class}`
    case 'model':
      return `${payload.action} ${payload.model}`
    default:
      return entry.entry_type
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    query: 'Queries',
    exception: 'Exceptions',
    job_enqueue: 'Enqueued',
    job_perform: 'Performed',
    request: 'Requests',
    command: 'Commands',
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
