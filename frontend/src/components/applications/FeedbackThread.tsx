import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Star,
  Send,
  Trash2,
  Pencil,
  User,
  X,
  Loader2,
} from 'lucide-react'
import type { StageFeedback, StageFeedbackCreateInput } from '@/types'
import { StageFeedbackType } from '@/types'
import {
  useStatusFeedback,
  useStageInstanceFeedback,
  useCreateFeedback,
  useUpdateFeedback,
  useDeleteFeedback,
} from '@/hooks'

interface FeedbackThreadProps {
  applicationId: string
  // For status stages (Applied/Shortlisted)
  stageType?: StageFeedbackType.APPLIED | StageFeedbackType.SHORTLISTED
  // For interview stages
  stageInstanceId?: string
  isRecruiterView: boolean
  currentUserId?: string
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function FeedbackComment({
  feedback,
  applicationId,
  currentUserId,
  isRecruiterView,
  onUpdated,
  onDeleted,
}: {
  feedback: StageFeedback
  applicationId: string
  currentUserId?: string
  isRecruiterView: boolean
  onUpdated: () => void
  onDeleted: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(feedback.comment)
  const [editScore, setEditScore] = useState<string>(feedback.score?.toString() || '')
  const { updateFeedback, isUpdating } = useUpdateFeedback()
  const { deleteFeedback, isDeleting } = useDeleteFeedback()

  const isOwner = currentUserId && feedback.author?.id === currentUserId
  const canEdit = isOwner && isRecruiterView

  const handleSave = async () => {
    try {
      await updateFeedback(applicationId, feedback.id, {
        comment: editText,
        score: editScore ? parseInt(editScore, 10) : null,
      })
      setIsEditing(false)
      onUpdated()
    } catch (err) {
      console.error('Failed to update feedback:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    try {
      await deleteFeedback(applicationId, feedback.id)
      onDeleted()
    } catch (err) {
      console.error('Failed to delete feedback:', err)
    }
  }

  if (isEditing) {
    return (
      <div className="p-3 bg-white rounded border border-gray-200 space-y-3">
        {/* Score */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Score (1-10)</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setEditScore(editScore === num.toString() ? '' : num.toString())}
                className={`w-6 h-6 text-xs rounded transition-colors ${
                  editScore === num.toString()
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Comment text */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Comment</label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setEditText(feedback.comment)
              setEditScore(feedback.score?.toString() || '')
            }}
            className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800"
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUpdating || !editText.trim()}
            className="px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
          >
            {isUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group py-2">
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
          {feedback.author?.first_name ? (
            <span className="text-xs font-medium text-gray-600">
              {feedback.author.first_name.charAt(0)}
            </span>
          ) : (
            <User className="w-3 h-3 text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-900">
              {feedback.author
                ? `${feedback.author.first_name} ${feedback.author.last_name}`
                : 'Unknown'}
            </span>
            <span className="text-xs text-gray-400">
              {formatRelativeTime(feedback.created_at)}
            </span>
            {feedback.score !== null && (
              <span className="flex items-center gap-0.5 text-xs text-amber-600">
                <Star className="w-3 h-3 fill-amber-500" />
                {feedback.score}/10
              </span>
            )}
          </div>
          <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{feedback.comment}</p>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Edit"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Delete"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FeedbackThread({
  applicationId,
  stageType,
  stageInstanceId,
  isRecruiterView,
  currentUserId,
}: FeedbackThreadProps) {
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newScore, setNewScore] = useState<string>('')

  // Use the appropriate hook based on whether this is for a status stage or interview stage
  const statusFeedback = useStatusFeedback(
    stageType ? applicationId : null,
    stageType || StageFeedbackType.APPLIED
  )
  const instanceFeedback = useStageInstanceFeedback(
    stageInstanceId ? applicationId : null,
    stageInstanceId || null
  )

  const { feedbacks, isLoading, error, refetch } = stageType ? statusFeedback : instanceFeedback
  const { createFeedback, isCreating } = useCreateFeedback()

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    const input: StageFeedbackCreateInput = {
      comment: newComment.trim(),
      score: newScore ? parseInt(newScore, 10) : null,
    }

    if (stageType) {
      input.stage_type = stageType
    } else if (stageInstanceId) {
      input.stage_instance_id = stageInstanceId
    }

    try {
      await createFeedback(applicationId, input)
      setNewComment('')
      setNewScore('')
      setIsAddingComment(false)
      refetch()
    } catch (err) {
      console.error('Failed to create feedback:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-600 py-2">
        {error}
      </div>
    )
  }

  const hasComments = feedbacks.length > 0

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          Comments {hasComments && `(${feedbacks.length})`}
        </span>
      </div>

      {/* Comments list */}
      {hasComments && (
        <div className="divide-y divide-gray-100 mb-2 bg-white/60 rounded border border-gray-200 px-2">
          {feedbacks.map((feedback) => (
            <FeedbackComment
              key={feedback.id}
              feedback={feedback}
              applicationId={applicationId}
              currentUserId={currentUserId}
              isRecruiterView={isRecruiterView}
              onUpdated={refetch}
              onDeleted={refetch}
            />
          ))}
        </div>
      )}

      {/* Add comment form */}
      {isRecruiterView && (
        <>
          {isAddingComment ? (
            <div className="p-3 bg-white rounded border border-gray-200 space-y-3">
              {/* Score */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Score (optional, 1-10)</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNewScore(newScore === num.toString() ? '' : num.toString())}
                      className={`w-6 h-6 text-xs rounded transition-colors ${
                        newScore === num.toString()
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment text */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Comment</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your comment..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
                  rows={3}
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingComment(false)
                    setNewComment('')
                    setNewScore('')
                  }}
                  className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={isCreating || !newComment.trim()}
                  className="px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
                >
                  {isCreating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Post
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingComment(true)}
              className="w-full px-2 py-2 text-xs font-medium text-gray-500 bg-white/60 border border-dashed border-gray-300 rounded hover:bg-white hover:text-gray-700 flex items-center justify-center gap-1 transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              Add Comment
            </button>
          )}
        </>
      )}

      {/* No comments message for non-recruiters */}
      {!hasComments && !isRecruiterView && (
        <p className="text-xs text-gray-400 py-2">No comments yet.</p>
      )}
    </div>
  )
}
