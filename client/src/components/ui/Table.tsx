import { cn } from '@/lib/utils'

interface TableProps {
  children: React.ReactNode
  className?: string
}

interface TableCellProps extends TableProps {
  colSpan?: number
  title?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead className={cn('bg-black/20', className)}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className }: TableProps) {
  return (
    <tbody className={cn('divide-y divide-dark-border', className)}>
      {children}
    </tbody>
  )
}

export function TableRow({ children, className, onClick }: TableProps & { onClick?: () => void }) {
  return (
    <tr
      className={cn(
        'hover:bg-white/[0.02] transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableHead({ children, className }: TableProps) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold text-dark-muted uppercase tracking-wide', className)}>
      {children}
    </th>
  )
}

export function TableCell({ children, className, colSpan, title }: TableCellProps) {
  return (
    <td className={cn('px-4 py-3 text-sm', className)} colSpan={colSpan} title={title}>
      {children}
    </td>
  )
}
