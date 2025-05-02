import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Comment from './Comment';
import { addComment, getComments } from '../../services/commentService';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const CommentsSection = ({ postId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Set up real-time listener for comments
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleString()
      }));
      setComments(fetchedComments);
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
        likedBy: []
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
      };

      await addComment(postId, replyData, parentId);
    } catch (error) {
      console.error('Error adding reply:', error);
      setError('Failed to add reply');
    }
  };

  const handleDeleteComment = (commentId) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  };

  // Get root-level comments (no parentId)
  const rootComments = comments.filter(comment => !comment.parentId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-100 text-red-700 rounded-md"
        >
          {error}
        </motion.div>
      )}

      {/* New Comment Form */}
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

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-6">
            {rootComments.map(comment => (
              <Comment
                key={comment.id}
                comment={comment}
                postId={postId}
                onReply={handleReply}
                onDelete={handleDeleteComment}
                allComments={comments}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default CommentsSection; 