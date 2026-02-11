import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { MethodBadge, StatusBadge } from '@/components/ui/Badge'
import { JsonViewer } from '@/components/ui/JsonViewer'

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
            Request not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const payload = entry.payload as Record<string, unknown>

  const formattedTime = new Date(entry.occurred_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
  const timeAgoStr = getTimeAgo(entry.occurred_at)

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
    <div className="p-6 space-y-5">
      {/* Request Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap w-32">Time</td>
                <td className="px-4 py-3">{formattedTime} ({timeAgoStr})</td>
              </tr>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Method</td>
                <td className="px-4 py-3">
                  <MethodBadge method={String(payload.method)} />
                </td>
              </tr>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Controller Action</td>
                <td className="px-4 py-3 font-mono text-sm">
                  {String(payload.controller_action || `${payload.controller}@${payload.action}`)}
                </td>
              </tr>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Path</td>
                <td className="px-4 py-3 font-mono text-sm">{String(payload.path)}</td>
              </tr>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Status</td>
                <td className="px-4 py-3">
                  <StatusBadge status={Number(payload.status)} />
                </td>
              </tr>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Duration</td>
                <td className="px-4 py-3">{String(payload.duration ?? '-')}ms</td>
              </tr>
              {payload.ip_address ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">IP Address</td>
                  <td className="px-4 py-3">{String(payload.ip_address)}</td>
                </tr>
              ) : null}
              {payload.hostname ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Hostname</td>
                  <td className="px-4 py-3 font-mono text-sm">{String(payload.hostname)}</td>
                </tr>
              ) : null}
              {payload.db_runtime ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">DB Runtime</td>
                  <td className="px-4 py-3">{String(payload.db_runtime)}ms</td>
                </tr>
              ) : null}
              {payload.view_runtime ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">View Runtime</td>
                  <td className="px-4 py-3">{String(payload.view_runtime)}ms</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Request Card with Tabs */}
      <Card>
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setRequestTab('payload')}
            className={`px-4 py-2.5 text-sm font-medium ${
              requestTab === 'payload'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Payload
          </button>
          <button
            onClick={() => setRequestTab('headers')}
            className={`px-4 py-2.5 text-sm font-medium ${
              requestTab === 'headers'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Headers
          </button>
        </div>
        <div className="bg-[#1a1a2e]">
          <JsonViewer data={getRequestTabContent()} className="border-0 bg-transparent" />
        </div>
      </Card>

      {/* Response Card with Tabs */}
      <Card>
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setResponseTab('response')}
            className={`px-4 py-2.5 text-sm font-medium ${
              responseTab === 'response'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Response
          </button>
          <button
            onClick={() => setResponseTab('response_headers')}
            className={`px-4 py-2.5 text-sm font-medium ${
              responseTab === 'response_headers'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Headers
          </button>
          <button
            onClick={() => setResponseTab('session')}
            className={`px-4 py-2.5 text-sm font-medium ${
              responseTab === 'session'
                ? 'bg-blue-500 text-white'
                : 'text-dark-muted hover:text-dark-text'
            }`}
          >
            Session
          </button>
        </div>
        <div className="bg-[#1a1a2e]">
          <JsonViewer data={getResponseTabContent()} className="border-0 bg-transparent" />
        </div>
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
    case 'view': return `/views/${entry.id}`
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
    case 'view':
      return `${payload.view_type}: ${payload.name || payload.path}`
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
