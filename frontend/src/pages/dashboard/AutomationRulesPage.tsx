import { useState } from 'react'
import {
  Zap,
  FileText,
  Bell,
  Link2,
  History,
} from 'lucide-react'
import RulesTab from '@/components/automations/tabs/RulesTab'
import TemplatesTab from '@/components/automations/tabs/TemplatesTab'
import NotificationsTab from '@/components/automations/tabs/NotificationsTab'
import WebhooksTab from '@/components/automations/tabs/WebhooksTab'
import ExecutionsTab from '@/components/automations/tabs/ExecutionsTab'

type TabType = 'rules' | 'templates' | 'notifications' | 'executions' | 'webhooks'

export default function AutomationRulesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('rules')

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Automations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure automation rules, notification templates, and webhooks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-gray-900 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          Rules
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-gray-900 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-gray-900 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          <Bell className="w-4 h-4" />
          Sent
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'webhooks'
              ? 'border-gray-900 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          <Link2 className="w-4 h-4" />
          Webhooks
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'executions'
              ? 'border-gray-900 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'rules' && <RulesTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'webhooks' && <WebhooksTab />}
      {activeTab === 'executions' && <ExecutionsTab />}
    </div>
  )
}
