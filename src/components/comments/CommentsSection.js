import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Comment from './Comment';
import { addComment, getComments, toggleCommentExpansion } from '../../services/commentService';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { HiChevronDown, HiChevronRight } from 'react-icons/hi';

const CommentsSection = ({ postId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = {};
      snapshot.docs.forEach(doc => {
        fetchedComments[doc.id] = {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate().toLocaleString()
        };
      });

      // Build comment tree
      const commentTree = [];
      Object.values(fetchedComments).forEach(comment => {
        if (!comment.parentId) {
          commentTree.push(comment);
        } else if (fetchedComments[comment.parentId]) {
          if (!fetchedComments[comment.parentId].replies) {
            fetchedComments[comment.parentId].replies = [];
          }
          fetchedComments[comment.parentId].replies.push(comment);
        }
      });

      setComments(commentTree);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (!newComment.trim()) return;

    try {
      const commentData = {
        content: newComment.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email,
        authorImage: user.photoURL,
        createdAt: new Date(),
        likes: 0,
        likedBy: [],
        isExpanded: true
      };

      await addComment(postId, commentData);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    }
  };

  const handleReply = async (parentId, content) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (!content.trim()) return;

    try {
      const replyData = {
        content: content.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email,
        authorImage: user.photoURL,
        isExpanded: true
      };

      await addComment(postId, replyData, parentId);
    } catch (error) {
      console.error('Error adding reply:', error);
      setError('Failed to add reply');
    }
  };

  const handleDeleteComment = (commentId) => {
    const deleteCommentFromTree = (comments) => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, _isDeleted: true };
        }
        if (comment.replies?.length) {
          return {
            ...comment,
            replies: deleteCommentFromTree(comment.replies)
          };
        }
        return comment;
      });
    };

    setComments(prev => deleteCommentFromTree(prev));
  };

  const handleToggleExpand = async (commentId, isExpanded) => {
    try {
      await toggleCommentExpansion(postId, commentId, !isExpanded);
    } catch (error) {
      console.error('Error toggling comment expansion:', error);
    }
  };

  // Get total comment count including replies
  const getTotalCommentCount = (comments) => {
    let count = 0;
    comments.forEach(comment => {
      if (comment && !comment._isDeleted) {
        count++;
        if (comment.replies?.length) {
          count += getTotalCommentCount(comment.replies.filter(reply => !reply._isDeleted));
        }
      }
    });
    return count;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        Comments ({getTotalCommentCount(comments.filter(comment => !comment._isDeleted))})
      </h2>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-100 text-red-700 rounded-md"
        >
          {error}
        </motion.div>
      )}

      {user ? (
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows="3"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Post Comment
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600 mb-2">
            Please sign in to join the discussion
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: location.pathname } })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign In to Comment
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-6">
            {comments
              .filter(comment => !comment._isDeleted)
              .map(comment => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  postId={postId}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  onToggleExpand={handleToggleExpand}
                  depth={0}
                />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default CommentsSection; 