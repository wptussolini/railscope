import PlaceholderPage from '@/components/PlaceholderPage'

export default function CommandsIndex() {
  return (
    <PlaceholderPage
      title="Commands"
      description="Rake tasks and Rails commands executed in your application"
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      }
    />
  )
}
