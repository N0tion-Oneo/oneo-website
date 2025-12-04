import React from 'react'
import { Settings } from 'lucide-react'
import { CalendarConnections } from '@/components/settings'

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-gray-500" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Calendar Integration Section */}
        <CalendarConnections />

        {/* Additional settings sections can be added here */}
      </div>
    </div>
  )
}
