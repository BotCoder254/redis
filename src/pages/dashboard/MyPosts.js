import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPencil, HiTrash, HiEye, HiX } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, postTitle }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <HiX className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete "{postTitle}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const MyPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('published');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, postId: null, postTitle: '' });

  useEffect(() => {
    if (!user) return;

    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(postsQuery, 
      (snapshot) => {
        const fetchedPosts = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toLocaleDateString(),
          }))
          .filter(post => post.status === activeTab)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        setPosts(fetchedPosts);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setError('Failed to fetch posts');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeTab]);

  const handleView = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleEdit = (postId) => {
    navigate(`/dashboard/edit-post/${postId}`);
  };

  const handleDelete = async (postId) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setDeleteModal({ isOpen: false, postId: null, postTitle: '' });
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    }
  };

  const handleStatusChange = async (postId, newStatus) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        status: newStatus,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating post status:', error);
      setError('Failed to update post status');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow"
    >
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, postId: null, postTitle: '' })}
        onConfirm={() => handleDelete(deleteModal.postId)}
        postTitle={deleteModal.postTitle}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('published')}
            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'published'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Published Posts
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'draft'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Drafts
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {activeTab} posts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Likes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {post.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {post.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.createdAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.views}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.likes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleView(post.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View"
                        >
                          <HiEye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(post.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <HiPencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ 
                            isOpen: true, 
                            postId: post.id,
                            postTitle: post.title
                          })}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <HiTrash className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MyPosts; 