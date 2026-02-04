import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Entry } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function groupEntriesByType(entries: Entry[]): Record<string, Entry[]> {
  return entries.reduce((acc, entry) => {
    const type = entry.entry_type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(entry)
    return acc
  }, {} as Record<string, Entry[]>)
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
