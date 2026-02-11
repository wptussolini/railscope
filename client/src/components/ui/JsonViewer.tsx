import { cn } from '@/lib/utils'

interface JsonViewerProps {
  data: unknown
  className?: string
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  return (
    <div className={cn('font-mono text-sm bg-black/20 rounded-md p-4 overflow-auto', className)}>
      <JsonValue value={data} />
    </div>
  )
}

function JsonValue({ value, indent = 0 }: { value: unknown; indent?: number }) {
  if (value === null) {
    return <span className="text-dark-muted italic">null</span>
  }

  if (typeof value === 'boolean') {
    return <span className="text-purple-400">{value.toString()}</span>
  }

  if (typeof value === 'number') {
    return <span className="text-yellow-400">{value}</span>
  }

  if (typeof value === 'string') {
    if (value.length > 100) {
      return (
        <span className="text-green-400 block whitespace-pre-wrap break-all">
          "{value}"
        </span>
      )
    }
    return <span className="text-green-400">"{value}"</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-dark-muted">[]</span>
    }
    return (
      <div>
        <span className="text-dark-muted">[</span>
        <div className="pl-4">
          {value.map((item, i) => (
            <div key={i}>
              <JsonValue value={item} indent={indent + 1} />
              {i < value.length - 1 && <span className="text-dark-muted">,</span>}
            </div>
          ))}
        </div>
        <span className="text-dark-muted">]</span>
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return <span className="text-dark-muted">{'{}'}</span>
    }
    return (
      <div>
        <span className="text-dark-muted">{'{'}</span>
        <div className="pl-4">
          {entries.map(([key, val], i) => {
            const isComplex = val !== null && typeof val === 'object'
            return (
              <div key={key}>
                <span className="text-blue-400">"{key}"</span>
                <span className="text-dark-muted mr-1">:</span>
                {isComplex ? (
                  <JsonValue value={val} indent={indent + 1} />
                ) : (
                  <>
                    <JsonValue value={val} indent={indent + 1} />
                  </>
                )}
                {i < entries.length - 1 && <span className="text-dark-muted">,</span>}
              </div>
            )
          })}
        </div>
        <span className="text-dark-muted">{'}'}</span>
      </div>
    )
  }

  return <span className="text-dark-text">{String(value)}</span>
}
