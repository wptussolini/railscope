import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEntry } from '@/api/entries'
import { Entry } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function QueriesShow() {
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
            Query not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const payload = entry.payload as Record<string, unknown>
  const isSlow = entry.tags.includes('slow')
  const isCached = Boolean(payload.cached)

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
      {/* Query Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Query Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <tbody>
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap w-32">Time</td>
                <td className="px-4 py-3">{formattedTime} ({timeAgo})</td>
              </tr>
              {payload.connection ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Connection</td>
                  <td className="px-4 py-3">{String(payload.connection)}</td>
                </tr>
              ) : null}
              {payload.name ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Name</td>
                  <td className="px-4 py-3">{String(payload.name)}</td>
                </tr>
              ) : null}
              {payload.file ? (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Location</td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {String(payload.file)}:{String(payload.line)}
                  </td>
                </tr>
              ) : null}
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Duration</td>
                <td className="px-4 py-3">
                  {isSlow ? (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-sm rounded">
                      {String(payload.duration)}ms
                    </span>
                  ) : (
                    <span>{String(payload.duration)}ms</span>
                  )}
                </td>
              </tr>
              {isCached && (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Cached</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-sm rounded">
                      Yes
                    </span>
                  </td>
                </tr>
              )}
              {payload.row_count != null && (
                <tr className="border-t border-dark-border">
                  <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Row Count</td>
                  <td className="px-4 py-3">{String(payload.row_count)}</td>
                </tr>
              )}
              <tr className="border-t border-dark-border">
                <td className="px-4 py-3 text-dark-muted whitespace-nowrap">Occurrences</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/queries?family_hash=${entry.family_hash}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View Similar Queries
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Query SQL Card */}
      <Card>
        <div className="flex border-b border-dark-border">
          <span className="px-4 py-2.5 text-sm font-medium bg-blue-500 text-white">
            Query
          </span>
        </div>
        <div className="bg-[#1a1a2e] p-4 overflow-x-auto">
          <pre className="font-mono text-sm text-purple-300 whitespace-pre-wrap">
            {formatSQL(String(payload.sql))}
          </pre>
        </div>
      </Card>

      {/* Related Entries */}
      {batch.length > 0 && <RelatedEntries entries={batch} navigate={navigate} />}
    </div>
  )
}

// Simple SQL formatter
function formatSQL(sql: string): string {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'INNER JOIN', 'OUTER JOIN', 'ON', 'ORDER BY', 'GROUP BY', 'HAVING',
    'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'INDEX', 'DISTINCT', 'AS',
    'UNION', 'EXCEPT', 'INTERSECT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ]

  let formatted = sql

  // Add newlines before major keywords
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    formatted = formatted.replace(regex, `\n${keyword}`)
  })

  // Clean up multiple newlines and trim
  formatted = formatted.replace(/\n+/g, '\n').trim()

  // Remove leading newline if starts with SELECT/INSERT/UPDATE/DELETE
  if (formatted.startsWith('\n')) {
    formatted = formatted.substring(1)
  }

  return formatted
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
    case 'exception':
      return `${payload.class}: ${String(payload.message || '').substring(0, 50)}`
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
