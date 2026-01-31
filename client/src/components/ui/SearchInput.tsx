import { useState, useCallback } from 'react'
import { useDebouncedCallback } from '@/lib/hooks'

interface SearchInputProps {
  placeholder?: string
  value?: string
  onChange: (value: string) => void
  className?: string
}

export function SearchInput({
  placeholder = 'Search...',
  value = '',
  onChange,
  className = ''
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState(value)

  const debouncedOnChange = useDebouncedCallback((val: string) => {
    onChange(val)
  }, 300)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    debouncedOnChange(newValue)
  }, [debouncedOnChange])

  const handleClear = useCallback(() => {
    setInputValue('')
    onChange('')
  }, [onChange])

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-4 w-4 text-dark-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 bg-dark-surface border border-dark-border rounded-md text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-muted hover:text-dark-text"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
