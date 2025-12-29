import { useState, useMemo } from 'react'
import {
  Plus,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Pencil,
  History,
  Loader2,
  AlertCircle,
  Zap,
  Check,
  Activity,
  Briefcase,
  FileText,
  Gift,
  Users,
  Mail,
  Clock,
  LayoutGrid,
} from 'lucide-react'
import {
  useWorkflows,
  useUpdateWorkflow,
  useDeleteWorkflow,
  Workflow,
} from '@/hooks/useAutomations'
import { formatDistanceToNow } from 'date-fns'
import RuleDrawer from '@/components/automations/RuleDrawer'

type TabType = 'rules' | 'activity'
type CategoryType = 'all' | 'jobs' | 'applications' | 'offers' | 'stages' | 'invitations' | 'reminders'

// Category definitions with matching logic
const CATEGORIES: { id: CategoryType; label: string; icon: React.ElementType; match: (name: string) => boolean }[] = [
  { id: 'all', label: 'All', icon: LayoutGrid, match: () => true },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, match: (name) => name.includes('Job ') && !name.includes('Assessment') },
  { id: 'applications', label: 'Applications', icon: FileText, match: (name) => name.includes('Application ') },
  { id: 'offers', label: 'Offers', icon: Gift, match: (name) => name.includes('Offer ') },
  { id: 'stages', label: 'Stages', icon: Users, match: (name) => name.includes('Stage ') || name.includes('Advanced to ') || name.includes('Assessment ') },
  { id: 'invitations', label: 'Invitations', icon: Mail, match: (name) => name.includes('Invitation ') },
  { id: 'reminders', label: 'Reminders', icon: Clock, match: (name) => name.includes('Reminder') },
]

export default function AutomationsPage() {
  const { workflows, isLoading, error, refetch } = useWorkflows()
  const { update } = useUpdateWorkflow()
  const { delete: deleteWorkflow, isDeleting } = useDeleteWorkflow()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('rules')

  // Category filter state
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all')

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)

  // Menu state
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Filter workflows by category
  const filteredWorkflows = useMemo(() => {
    if (activeCategory === 'all') return workflows
    const category = CATEGORIES.find(c => c.id === activeCategory)
    if (!category) return workflows
    return workflows.filter(w => category.match(w.name))
  }, [workflows, activeCategory])

  // Count workflows per category
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryType, number> = {
      all: workflows.length,
      jobs: 0,
      applications: 0,
      offers: 0,
      stages: 0,
      invitations: 0,
      reminders: 0,
    }
    workflows.forEach(w => {
      CATEGORIES.forEach(cat => {
        if (cat.id !== 'all' && cat.match(w.name)) {
          counts[cat.id]++
        }
      })
    })
    return counts
  }, [workflows])

  // Open drawer for new rule
  const handleNewRule = () => {
    setSelectedRuleId(null)
    setDrawerOpen(true)
  }

  // Open drawer for editing
  const handleEditRule = (ruleId: string) => {
    setSelectedRuleId(ruleId)
    setDrawerOpen(true)
  }

  // Close drawer and refetch
  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setSelectedRuleId(null)
  }

  const handleDrawerSaved = () => {
    setDrawerOpen(false)
    setSelectedRuleId(null)
    refetch()
  }

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      await update({
        id: workflow.id,
        data: { is_active: !workflow.is_active },
      })
      refetch()
    } catch (err) {
      console.error('Failed to toggle workflow:', err)
    }
    setMenuOpen(null)
  }

  const handleDeleteWorkflow = async () => {
    if (!selectedWorkflow) return

    try {
      await deleteWorkflow(selectedWorkflow.id)
      setDeleteDialogOpen(false)
      setSelectedWorkflow(null)
      refetch()
    } catch (err) {
      console.error('Failed to delete workflow:', err)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  // Stats calculations
  const totalRules = workflows.length
  const activeRules = workflows.filter(w => w.is_active).length
  const totalExecutions = workflows.reduce((sum, w) => sum + w.total_executions, 0)
  const totalSuccess = workflows.reduce((sum, w) => sum + w.total_success, 0)
  const successRate = totalExecutions > 0 ? ((totalSuccess / totalExecutions) * 100).toFixed(1) : '0'

  const tabs = [
    { id: 'rules' as TabType, label: 'Automation Rules' },
    { id: 'activity' as TabType, label: 'Recent Activity' },
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-[13px]">Failed to load automations: {String(error)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Automations</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Create automated workflows triggered by events
          </p>
        </div>
        <button
          onClick={handleNewRule}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[12px] text-gray-500 font-medium">Total Rules</p>
              <p className="text-xl font-semibold text-gray-900">
                {isLoading ? '—' : totalRules}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-[12px] text-gray-500 font-medium">Active</p>
              <p className="text-xl font-semibold text-gray-900">
                {isLoading ? '—' : activeRules}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[12px] text-gray-500 font-medium">Executions</p>
              <p className="text-xl font-semibold text-gray-900">
                {isLoading ? '—' : totalExecutions.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[12px] text-gray-500 font-medium">Success Rate</p>
              <p className="text-xl font-semibold text-gray-900">
                {isLoading ? '—' : `${successRate}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'rules' && (
        <>
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((category) => {
              const Icon = category.icon
              const count = categoryCounts[category.id]
              const isActive = activeCategory === category.id
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {category.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-[14px] font-medium text-gray-900 mb-1">
                  {activeCategory === 'all' ? 'No automation rules yet' : `No ${CATEGORIES.find(c => c.id === activeCategory)?.label.toLowerCase()} rules`}
                </h3>
                <p className="text-[13px] text-gray-500 mb-4">
                  {activeCategory === 'all'
                    ? 'Create your first rule to automate actions based on triggers'
                    : 'No rules match this category filter'
                  }
                </p>
                {activeCategory === 'all' && (
                  <button
                    onClick={handleNewRule}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4" />
                    Create Rule
                  </button>
                )}
              </div>
            ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Rule
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Executions
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Success
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredWorkflows.map((workflow) => (
                  <tr
                    key={workflow.id}
                    onClick={() => handleEditRule(workflow.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">
                          {workflow.name}
                        </p>
                        {workflow.description && (
                          <p className="text-[12px] text-gray-500 truncate max-w-xs">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          workflow.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            workflow.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-500">
                        {formatDate(workflow.last_executed_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[13px] font-medium text-gray-900">
                        {workflow.total_executions}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-[12px] text-green-600 font-medium">
                          {workflow.total_success}
                        </span>
                        <span className="text-gray-300">/</span>
                        <span className="text-[12px] text-red-600 font-medium">
                          {workflow.total_failed}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === workflow.id ? null : workflow.id)
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {menuOpen === workflow.id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditRule(workflow.id)
                                setMenuOpen(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleActive(workflow)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                            >
                              {workflow.is_active ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditRule(workflow.id)
                                setMenuOpen(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                            >
                              <History className="w-3.5 h-3.5" />
                              View History
                            </button>
                            <div className="my-1 border-t border-gray-100" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedWorkflow(workflow)
                                setDeleteDialogOpen(true)
                                setMenuOpen(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-[14px] font-medium text-gray-900 mb-1">
              Recent Activity
            </h3>
            <p className="text-[13px] text-gray-500">
              View execution logs by clicking on a specific rule
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-sm mx-4 shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">Delete Rule</h2>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-gray-600">
                Are you sure you want to delete <span className="font-medium">"{selectedWorkflow.name}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorkflow}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu when clicking outside */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setMenuOpen(null)}
        />
      )}

      {/* Rule Drawer */}
      {drawerOpen && (
        <RuleDrawer
          ruleId={selectedRuleId}
          onClose={handleDrawerClose}
          onSaved={handleDrawerSaved}
        />
      )}
    </div>
  )
}
