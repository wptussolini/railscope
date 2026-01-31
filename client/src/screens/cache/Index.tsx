import PlaceholderPage from '@/components/PlaceholderPage'

export default function CacheIndex() {
  return (
    <PlaceholderPage
      title="Cache"
      description="Rails.cache operations (read, write, delete, fetch)"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      }
    />
  )
}
