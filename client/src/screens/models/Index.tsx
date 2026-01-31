import PlaceholderPage from '@/components/PlaceholderPage'

export default function ModelsIndex() {
  return (
    <PlaceholderPage
      title="Models"
      description="ActiveRecord model events (create, update, delete)"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      }
    />
  )
}
