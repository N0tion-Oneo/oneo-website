/**
 * CommentSection Component
 *
 * Displays comments for a feed post with the ability to add new comments
 * and reply to existing ones.
 */
import { useState } from 'react'
import { MessageCircle, Send, ChevronDown, Trash2, Loader2 } from 'lucide-react'
import { useComments, useCreateComment, useDeleteComment } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import type { Comment } from '@/types'

interface CommentSectionProps {
  postId: string
  initialCommentCount?: number
  expanded?: boolean
  autoExpandIfComments?: boolean
}

export default function CommentSection({
  postId,
  initialCommentCount = 0,
  expanded = false,
  autoExpandIfComments = false,
}: CommentSectionProps) {
  const { user } = useAuth()
  // Auto-expand if there are comments and autoExpandIfComments is true
  const shouldAutoExpand = autoExpandIfComments && initialCommentCount > 0
  const [isExpanded, setIsExpanded] = useState(expanded || shouldAutoExpand)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const {
    comments,
    totalCount,
    isLoading,
    hasMore,
    loadMore,
    refetch,
  } = useComments({
    contentType: 'feed.feedpost',
    objectId: postId,
    enabled: isExpanded,
  })

  const { mutate: createComment, isPending: isCreating } = useCreateComment()
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment()

  const displayCount = isExpanded ? totalCount : initialCommentCount

  const handleSubmitComment = () => {
    if (!newComment.trim()) return

    createComment(
      {
        content_type: 'feed.feedpost',
        object_id: postId,
        content: newComment.trim(),
      },
      {
        onSuccess: () => {
          setNewComment('')
          refetch()
        },
      }
    )
  }

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) return

    createComment(
      {
        content_type: 'feed.feedpost',
        object_id: postId,
        content: replyContent.trim(),
        parent: parentId,
      },
      {
        onSuccess: () => {
          setReplyContent('')
          setReplyingTo(null)
          refetch()
        },
      }
    )
  }

  const handleDelete = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteComment(commentId, {
        onSuccess: () => refetch(),
      })
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? 'ml-8 mt-3' : 'py-4'} ${!isReply ? 'border-b border-gray-100 last:border-0' : ''}`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[11px] font-medium text-gray-600 flex-shrink-0">
          {comment.author.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Author & Time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-medium text-gray-900">
              {comment.author.full_name}
            </span>
            <span className="text-[11px] text-gray-400">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>

          {/* Content */}
          <p className="text-[13px] text-gray-700 whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            {!isReply && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-[12px] text-gray-500 hover:text-gray-700"
              >
                Reply
              </button>
            )}
            {comment.author.id === user?.id && (
              <button
                onClick={() => handleDelete(comment.id)}
                disabled={isDeleting}
                className="text-[12px] text-gray-400 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitReply(comment.id)
                  }
                }}
              />
              <button
                onClick={() => handleSubmitReply(comment.id)}
                disabled={isCreating || !replyContent.trim()}
                className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* Replies */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="border-t border-gray-100">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {displayCount} {displayCount === 1 ? 'comment' : 'comments'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Comment Input */}
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-[11px] font-medium text-white flex-shrink-0">
              {user?.first_name?.[0]?.toUpperCase()}
              {user?.last_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitComment()
                  }
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={isCreating || !newComment.trim()}
                className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Comments List */}
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-gray-400">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {comments.map((comment) => renderComment(comment))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="w-full py-2 text-[13px] text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Load more comments
            </button>
          )}
        </div>
      )}
    </div>
  )
}
