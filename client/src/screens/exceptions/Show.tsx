import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge, MethodBadge } from '@/components/ui/Badge'

type TabType = 'message' | 'location' | 'context' | 'stacktrace'

export default function ExceptionsShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [batch, setBatch] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState<TabType>('message')
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
    return <div className="p-6 text-dark-muted">Loading...</div>
  }

  if (!entry) {
    return <div className="p-6 text-dark-muted">Entry not found</div>
  }

  const payload = entry.payload as Record<string, unknown>
  const backtrace = (payload.backtrace as string[] | undefined) || []
  const context = payload.context as Record<string, unknown> | undefined
  const source = payload.source as string | undefined // 'command', 'job', or undefined (request)

  // Use file and line from payload (extracted by backend)
  const file = payload.file ? String(payload.file) : ''
  const line = payload.line ? String(payload.line) : ''

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

  // Limit trace lines unless showing all
  const displayedTrace = showAllTrace ? backtrace : backtrace.slice(0, 5)

  return (
    <div className="p-6 space-y-5">
      {/* Exception Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Exception Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap w-32">Time</td>
                <td className="px-4 py-3">{formattedTime} ({timeAgo})</td>
              </tr>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Type</td>
                <td className="px-4 py-3">
                  <span className="text-red-400 font-medium">{String(payload.class)}</span>
                </td>
              </tr>
              {file && (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Location</td>
                  <td className="px-4 py-3 font-mono text-sm">{file}:{line}</td>
                </tr>
              )}
              {source === 'command' ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Command</td>
                  <td className="px-4 py-3">
                    <code className="text-blue-400">{String(payload.command)}</code>
                  </td>
                </tr>
              ) : source === 'job' ? (
                <>
                  <tr className="border-t border-dark-border">
                    <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Job</td>
                    <td className="px-4 py-3">
                      <code className="text-blue-400">{String(payload.job_class)}</code>
                    </td>
                  </tr>
                  {payload.queue_name ? (
                    <tr className="border-t border-dark-border">
                      <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Queue</td>
                      <td className="px-4 py-3">{String(payload.queue_name)}</td>
                    </tr>
                  ) : null}
                </>
              ) : (
                <>
                  {payload.method ? (
                    <tr className="border-t border-dark-border">
                      <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Request</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <MethodBadge method={String(payload.method)} />
                        <span className="font-mono text-sm">{String(payload.path)}</span>
                      </td>
                    </tr>
                  ) : null}
                  {payload.controller ? (
                    <tr className="border-t border-dark-border">
                      <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Controller</td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {String(payload.controller)}#{String(payload.action)}
                      </td>
                    </tr>
                  ) : null}
                </>
              )}
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Occurrences</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/exceptions?family_hash=${entry.family_hash}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View Other Occurrences
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Message / Location / Context / Stacktrace Card */}
      <Card>
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setCurrentTab('message')}
            className={`px-4 py-2.5 text-sm font-medium ${
              currentTab === 'message'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Message
          </button>
          {file && (
            <button
              onClick={() => setCurrentTab('location')}
              className={`px-4 py-2.5 text-sm font-medium ${
                currentTab === 'location'
                  ? 'bg-blue-500 text-white'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              Location
            </button>
          )}
          {context && Object.keys(context).length > 0 && (
            <button
              onClick={() => setCurrentTab('context')}
              className={`px-4 py-2.5 text-sm font-medium ${
                currentTab === 'context'
                  ? 'bg-blue-500 text-white'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              Context
            </button>
          )}
          <button
            onClick={() => setCurrentTab('stacktrace')}
            className={`px-4 py-2.5 text-sm font-medium ${
              currentTab === 'stacktrace'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Stacktrace
          </button>
        </div>

        {currentTab === 'message' && (
          <div className="bg-[#1a1a2e] p-4">
            <pre className="text-red-400 whitespace-pre-wrap break-words font-mono text-sm">
              {String(payload.message)}
            </pre>
          </div>
        )}

        {currentTab === 'location' && file && (
          <div className="bg-[#1a1a2e]">
            <CodePreview
              file={file}
              line={Number(line)}
              linePreview={payload.line_preview as Record<string, string> | undefined}
            />
          </div>
        )}

        {currentTab === 'context' && context && (
          <div className="bg-[#1a1a2e] p-4">
            <pre className="text-dark-text whitespace-pre-wrap font-mono text-sm">
              {JSON.stringify(context, null, 2)}
            </pre>
          </div>
        )}

        {currentTab === 'stacktrace' && (
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
                {!showAllTrace && backtrace.length > 5 && (
                  <tr>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setShowAllTrace(true)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Show All ({backtrace.length} lines)
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Tags Card */}
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

      {/* Related Entries */}
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
                  <span className="text-dark-muted text-sm">{getEntryDescription(relatedEntry, relPayload)}</span>
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
    default: return `/${entry.entry_type}s/${entry.id}`
  }
}

function getEntryDescription(entry: Entry, payload: Record<string, unknown>): string {
  switch (entry.entry_type) {
    case 'query':
      return String(payload.sql || '').substring(0, 80)
    case 'request':
      return `${payload.method} ${payload.path}`
    case 'command':
      return `Command: ${payload.command}`
    case 'job_enqueue':
    case 'job_perform':
      return `Job: ${payload.job_class}`
    default:
      return entry.entry_type
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    query: 'Queries',
    exception: 'Exceptions',
    job_enqueue: 'Jobs',
    job_perform: 'Jobs',
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

interface CodePreviewProps {
  file: string
  line: number
  linePreview?: Record<string, string>
}

function CodePreview({ file, line, linePreview }: CodePreviewProps) {
  if (!linePreview || Object.keys(linePreview).length === 0) {
    // Fallback when no line preview available
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
