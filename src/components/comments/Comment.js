import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiHeart, HiOutlineHeart, HiReply, HiTrash } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { likeComment, unlikeComment, deleteComment } from '../../services/commentService';

const Comment = ({ 
  comment, 
  postId, 
  onReply, 
  onDelete, 
  depth = 0,
  replies = [],
  allComments = []
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(comment.likedBy?.includes(user?.uid));
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const maxDepth = 3;

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
    if (!user || (user.uid !== comment.authorId && !user.isAdmin)) return;

    try {
      await deleteComment(postId, comment.id);
      onDelete(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleSubmitReply = (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  // Get nested replies for this comment
  const nestedReplies = comment.replies
    ?.map(replyId => allComments.find(c => c.id === replyId))
    .filter(Boolean) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative ${depth > 0 ? 'ml-6' : ''}`}
    >
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 -ml-3" />
      )}
      
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <img
              src={comment.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.authorName)}`}
              alt={comment.authorName}
              className="h-8 w-8 rounded-full"
            />
            <div className="ml-2">
              <span className="font-medium text-gray-900">{comment.authorName}</span>
              <span className="text-sm text-gray-500 ml-2">{comment.createdAt}</span>
            </div>
          </div>
          
          {user && (user.uid === comment.authorId || user.isAdmin) && (
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-600"
            >
              <HiTrash className="h-5 w-5" />
            </button>
          )}
        </div>

        <p className="text-gray-800 mb-3">{comment.content}</p>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            disabled={!user}
            className={`flex items-center space-x-1 text-sm ${
              isLiked ? 'text-red-500' : 'text-gray-500'
            } hover:text-red-600 transition-colors`}
          >
            {isLiked ? (
              <HiHeart className="h-5 w-5" />
            ) : (
              <HiOutlineHeart className="h-5 w-5" />
            )}
            <span>{comment.likes || 0}</span>
          </button>

          {depth < maxDepth && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              disabled={!user}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <HiReply className="h-5 w-5" />
              <span>Reply</span>
            </button>
          )}
        </div>

        <AnimatePresence>
          {showReplyForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmitReply}
              className="mt-4"
            >
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="2"
              />
              <div className="flex justify-end space-x-2 mt-2">
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
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Nested Replies */}
      <AnimatePresence>
        {nestedReplies.map(reply => (
          <Comment
            key={reply.id}
            comment={reply}
            postId={postId}
            onReply={onReply}
            onDelete={onDelete}
            depth={depth + 1}
            replies={reply.replies}
            allComments={allComments}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default Comment; 