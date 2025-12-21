import { XeroIntegration } from '@/components/settings'

export default function IntegrationsPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect external services to automate your workflow
        </p>
      </div>
      <XeroIntegration />
    </div>
  )
}
