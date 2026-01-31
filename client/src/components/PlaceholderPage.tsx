import { Card, CardContent } from '@/components/ui/Card'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: React.ReactNode
}

export default function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-dark-muted text-sm mt-1">{description}</p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-dark-border/50 flex items-center justify-center mb-4 text-dark-muted">
              {icon}
            </div>
            <h2 className="text-lg font-medium text-white mb-2">To Implement</h2>
            <p className="text-dark-muted text-sm max-w-md">
              This feature is planned but not yet implemented. It will capture and display {title.toLowerCase()} from your Rails application.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
