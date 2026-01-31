import PlaceholderPage from '@/components/PlaceholderPage'

export default function EventsIndex() {
  return (
    <PlaceholderPage
      title="Events"
      description="ActiveSupport::Notifications events in your application"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      }
    />
  )
}
