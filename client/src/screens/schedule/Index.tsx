import PlaceholderPage from '@/components/PlaceholderPage'

export default function ScheduleIndex() {
  return (
    <PlaceholderPage
      title="Schedule"
      description="Scheduled tasks and cron jobs in your application"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  )
}
