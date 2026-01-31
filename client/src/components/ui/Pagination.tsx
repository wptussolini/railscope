import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={cn(
          'px-3 py-1.5 text-sm rounded-md border border-dark-border',
          currentPage <= 1
            ? 'text-dark-muted cursor-not-allowed'
            : 'text-dark-text hover:bg-dark-border'
        )}
      >
        Previous
      </button>

      <span className="text-sm text-dark-muted">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={cn(
          'px-3 py-1.5 text-sm rounded-md border border-dark-border',
          currentPage >= totalPages
            ? 'text-dark-muted cursor-not-allowed'
            : 'text-dark-text hover:bg-dark-border'
        )}
      >
        Next
      </button>
    </div>
  )
}
