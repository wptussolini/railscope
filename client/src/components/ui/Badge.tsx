import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-dark-border text-dark-muted',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
  purple: 'bg-purple-500/20 text-purple-400',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function MethodBadge({ method }: { method: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    PATCH: 'warning',
    DELETE: 'error',
  }
  const variant = variantMap[method] || 'default'

  return <Badge variant={variant}>{method}</Badge>
}

export function StatusBadge({ status }: { status: number }) {
  let variant: BadgeVariant = 'default'
  if (status >= 200 && status < 300) variant = 'success'
  else if (status >= 300 && status < 400) variant = 'warning'
  else if (status >= 400) variant = 'error'

  return <Badge variant={variant}>{status}</Badge>
}

export function TypeBadge({ type }: { type: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    request: 'info',
    query: 'purple',
    exception: 'error',
    job_enqueue: 'success',
    job_perform: 'success',
  }
  const variant = variantMap[type] || 'default'

  return <Badge variant={variant}>{type}</Badge>
}
