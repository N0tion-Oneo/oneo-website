import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Play,
  Loader2,
  AlertCircle,
  X,
  Check,
} from 'lucide-react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  ReactFlowProvider,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useWorkflowEditor, WorkflowNode, WorkflowEdge } from '@/hooks/useAutomations'
import TriggerNode from '@/components/automations/nodes/TriggerNode'
import ActionNode from '@/components/automations/nodes/ActionNode'
import NodePalette from '@/components/automations/canvas/NodePalette'
import NodeConfigPanel from '@/components/automations/config-panels/NodeConfigPanel'

// Custom node types
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
}

// Convert workflow nodes to React Flow nodes
function toFlowNodes(workflowNodes: WorkflowNode[]): Node[] {
  return workflowNodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.data.label,
      nodeType: node.node_type,
      config: node.data.config,
    },
  }))
}

// Convert React Flow nodes back to workflow nodes
function toWorkflowNodes(flowNodes: Node[]): WorkflowNode[] {
  return flowNodes.map(node => ({
    id: node.id,
    type: node.type as 'trigger' | 'action',
    node_type: node.data.nodeType || '',
    position: node.position,
    data: {
      label: node.data.label || '',
      config: node.data.config || {},
    },
  }))
}

// Convert workflow edges to React Flow edges
function toFlowEdges(workflowEdges: WorkflowEdge[]): Edge[] {
  return workflowEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'smoothstep',
    animated: true,
  }))
}

// Convert React Flow edges back to workflow edges
function toWorkflowEdges(flowEdges: Edge[]): WorkflowEdge[] {
  return flowEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }))
}

function WorkflowEditorContent() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const {
    workflow,
    models,
    isLoading,
    isSaving,
    isTesting,
    saveWorkflow,
    testWorkflow,
  } = useWorkflowEditor(id || null)

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // UI state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [configPanelOpen, setConfigPanelOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Workflow settings
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [workflowActive, setWorkflowActive] = useState(false)

  // Initialize nodes/edges from workflow
  useEffect(() => {
    if (workflow) {
      setNodes(toFlowNodes(workflow.nodes || []))
      setEdges(toFlowEdges(workflow.edges || []))
      setWorkflowName(workflow.name)
      setWorkflowDescription(workflow.description || '')
      setWorkflowActive(workflow.is_active)
    }
  }, [workflow, setNodes, setEdges])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setConfigPanelOpen(true)
  }, [])

  // Handle edge creation
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds))
      setHasUnsavedChanges(true)
    },
    [setEdges]
  )

  // Handle node changes
  const handleNodesChange: OnNodesChange = useCallback(
    changes => {
      onNodesChange(changes)
      setHasUnsavedChanges(true)
    },
    [onNodesChange]
  )

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback(
    changes => {
      onEdgesChange(changes)
      setHasUnsavedChanges(true)
    },
    [onEdgesChange]
  )

  // Handle node config update
  const handleNodeConfigUpdate = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes(nds =>
        nds.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                config,
              },
            }
          }
          return node
        })
      )
      setHasUnsavedChanges(true)
    },
    [setNodes]
  )

  // Handle node label update
  const handleNodeLabelUpdate = useCallback(
    (nodeId: string, label: string) => {
      setNodes(nds =>
        nds.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label,
              },
            }
          }
          return node
        })
      )
      setHasUnsavedChanges(true)
    },
    [setNodes]
  )

  // Handle adding a new node from palette
  const handleAddNode = useCallback(
    (type: 'trigger' | 'action', nodeType: string, label: string) => {
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: 250, y: nodes.length * 150 + 50 },
        data: {
          label,
          nodeType,
          config: {},
        },
      }
      setNodes(nds => [...nds, newNode])
      setHasUnsavedChanges(true)
      setSelectedNode(newNode)
      setConfigPanelOpen(true)
    },
    [nodes, setNodes]
  )

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await saveWorkflow({
        name: workflowName,
        description: workflowDescription,
        nodes: toWorkflowNodes(nodes),
        edges: toWorkflowEdges(edges),
        is_active: workflowActive,
      })
      setHasUnsavedChanges(false)
      setToast({ message: 'Workflow saved successfully', type: 'success' })
    } catch {
      setToast({ message: 'Failed to save workflow', type: 'error' })
    }
  }, [workflowName, workflowDescription, nodes, edges, workflowActive, saveWorkflow])

  // Handle test
  const handleTest = useCallback(async () => {
    try {
      const result = await testWorkflow()
      if (result?.status === 'success') {
        setToast({ message: 'Test executed successfully', type: 'success' })
      } else {
        setToast({ message: result?.message || 'Test completed', type: 'success' })
      }
    } catch {
      setToast({ message: 'Failed to test workflow', type: 'error' })
    }
  }, [testWorkflow])

  // Handle node delete
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes(nds => nds.filter(n => n.id !== nodeId))
      setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
      setSelectedNode(null)
      setConfigPanelOpen(false)
      setHasUnsavedChanges(true)
    },
    [setNodes, setEdges]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>Workflow not found</span>
        </div>
        <button
          onClick={() => navigate('/dashboard/admin/automations')}
          className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Automations
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Node Palette */}
      <div className="w-60 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate('/dashboard/admin/automations')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 text-sm">
              {workflowName}
            </span>
          </div>
          {hasUnsavedChanges && (
            <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Node Palette */}
        <NodePalette models={models} onAddNode={handleAddNode} />
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap />

          {/* Top toolbar */}
          <Panel position="top-right">
            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={isTesting || nodes.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isTesting ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </Panel>

          {/* Workflow settings panel */}
          <Panel position="top-left">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/40 px-3 py-2 min-w-[160px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workflowActive}
                  onChange={e => {
                    setWorkflowActive(e.target.checked)
                    setHasUnsavedChanges(true)
                  }}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {workflowActive ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Sidebar - Node Config Panel */}
      {configPanelOpen && selectedNode && (
        <div className="w-[360px] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <NodeConfigPanel
            node={selectedNode}
            models={models}
            onClose={() => setConfigPanelOpen(false)}
            onConfigUpdate={handleNodeConfigUpdate}
            onLabelUpdate={handleNodeLabelUpdate}
            onDelete={handleDeleteNode}
          />
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg dark:shadow-gray-900/40 ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-0.5 hover:bg-white/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Wrap with ReactFlowProvider
export default function WorkflowEditorPage() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  )
}
