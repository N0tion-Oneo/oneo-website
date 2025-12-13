import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsNewsletter } from '@/services/cms'
import { useToast } from '@/contexts/ToastContext'
import { Loader2, Trash2, Search, Download, Mail, UserCheck, UserX } from 'lucide-react'
import type { CMSNewsletterSubscriber } from '@/types'

export default function CMSNewsletterPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ['cms', 'newsletter', { is_active: showInactive ? undefined : true }],
    queryFn: () => cmsNewsletter.list({ is_active: showInactive ? undefined : true }),
  })

  const deleteMutation = useMutation({
    mutationFn: cmsNewsletter.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'newsletter'] })
      showToast('success', 'Subscriber removed')
    },
    onError: () => {
      showToast('error', 'Failed to remove subscriber')
    },
  })

  const handleDelete = (subscriber: CMSNewsletterSubscriber) => {
    if (confirm(`Remove ${subscriber.email} from the newsletter?`)) {
      deleteMutation.mutate(subscriber.id)
    }
  }

  const filteredSubscribers = subscribers?.filter((sub) =>
    sub.email.toLowerCase().includes(search.toLowerCase()) ||
    sub.name?.toLowerCase().includes(search.toLowerCase())
  )

  const exportCSV = () => {
    if (!filteredSubscribers?.length) return

    const headers = ['Email', 'Name', 'Status', 'Source', 'Subscribed At']
    const rows = filteredSubscribers.map((sub) => [
      sub.email,
      sub.name || '',
      sub.is_active ? 'Active' : 'Inactive',
      sub.source || '',
      new Date(sub.created_at).toISOString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeCount = subscribers?.filter((s) => s.is_active).length || 0
  const totalCount = subscribers?.length || 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Newsletter Subscribers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} active subscribers{totalCount !== activeCount && ` (${totalCount} total)`}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!filteredSubscribers?.length}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{activeCount}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <UserX className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{totalCount - activeCount}</p>
              <p className="text-sm text-gray-500">Unsubscribed</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{totalCount}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary/20"
          />
          <span className="text-sm text-gray-600">Show unsubscribed</span>
        </label>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !filteredSubscribers?.length ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No subscribers found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscribed
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${subscriber.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {subscriber.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {subscriber.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                        subscriber.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {subscriber.is_active ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {subscriber.source || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(subscriber.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(subscriber)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Remove subscriber"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
