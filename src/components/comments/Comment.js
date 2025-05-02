import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { HiReply, HiTrash, HiHeart, HiChevronDown, HiChevronRight } from 'react-icons/hi';
import { deleteComment, likeComment, unlikeComment } from '../../services/commentService';

const MAX_DEPTH = 3;

const Comment = ({ comment, postId, onReply, onDelete, onToggleExpand, depth = 0 }) => {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isLiked, setIsLiked] = useState(comment.likedBy?.includes(user?.uid));

  const handleLike = async () => {
    if (!user) return;
    try {
      if (isLiked) {
        await unlikeComment(postId, comment.id, user.uid);
      } else {
        await likeComment(postId, comment.id, user.uid);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteComment(postId, comment.id);
      onDelete(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    await onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  const hasReplies = comment.replies?.length > 0;
  const canNest = depth < MAX_DEPTH;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative"
    >
      <div className={`flex space-x-4 ${depth > 0 ? 'ml-6' : ''}`}>
        {/* Thread line */}
        {depth > 0 && (
          <div className="absolute left-[-24px] top-0 bottom-0 w-px bg-gray-200" />
        )}
        
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={comment.authorImage || `https://ui-avatars.com/api/?name=${comment.authorName}`}
            alt={comment.authorName}
            className="h-10 w-10 rounded-full"
          />
        </div>

        {/* Comment content */}
        <div className="flex-grow space-y-2">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{comment.authorName}</h4>
                <p className="text-sm text-gray-500">{comment.createdAt}</p>
              </div>
              {hasReplies && (
                <button
                  onClick={() => onToggleExpand(comment.id, comment.isExpanded)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {comment.isExpanded ? (
                    <HiChevronDown className="h-5 w-5" />
                  ) : (
                    <HiChevronRight className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
            <p className="text-gray-700">{comment.content}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 text-sm ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <HiHeart className="h-4 w-4" />
              <span>{comment.likes?.length || 0}</span>
            </button>
            
            {canNest && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <HiReply className="h-4 w-4" />
                <span>Reply</span>
              </button>
            )}

            {(user?.uid === comment.authorId || user?.isAdmin) && (
              <button
                onClick={handleDelete}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-500"
              >
                <HiTrash className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )}
          </div>

          {/* Reply form */}
          <AnimatePresence>
            {showReplyForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmitReply}
                className="space-y-2"
              >
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="2"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowReplyForm(false)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!replyContent.trim()}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Nested replies */}
          <AnimatePresence>
            {hasReplies && comment.isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 mt-4"
              >
                {comment.replies.map(reply => (
                  <Comment
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    onReply={onReply}
                    onDelete={onDelete}
                    onToggleExpand={onToggleExpand}
                    depth={depth + 1}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default Comment; 