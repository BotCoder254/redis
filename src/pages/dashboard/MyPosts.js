import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiPencil, 
  HiTrash, 
  HiEye, 
  HiOutlineCalendar,
  HiOutlineUserGroup,
  HiOutlineTag,
  HiOutlineFolder
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  deleteDoc,
  or
} from 'firebase/firestore';

const MyPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'owned', 'collaborated'

  useEffect(() => {
    if (!user) return;

    // Simplified query to avoid complex indexes
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      setPosts(postsData);
      setLoading(false);
    });

    // Fetch collaborated posts separately
    const collaboratedQuery = query(
      collection(db, 'posts'),
      where('collaborators', 'array-contains', { userId: user.uid })
    );

    const collaboratedUnsubscribe = onSnapshot(collaboratedQuery, (snapshot) => {
      const collaboratedData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      setPosts(prev => [...prev, ...collaboratedData]);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      collaboratedUnsubscribe();
    };
  }, [user]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'owned') return post.authorId === user?.uid;
    if (filter === 'collaborated') return post.authorId !== user?.uid;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Posts</h2>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Posts</option>
            <option value="owned">My Posts</option>
            <option value="collaborated">Collaborated Posts</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <AnimatePresence>
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">
                    <Link
                      to={`/dashboard/posts/${post.id}`}
                      className="hover:text-indigo-600"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <HiOutlineCalendar className="h-4 w-4 mr-1" />
                      {post.createdAt?.toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <HiOutlineUserGroup className="h-4 w-4 mr-1" />
                      {post.collaborators?.length || 0} collaborators
                    </div>
                    <div className="flex items-center">
                      <HiOutlineFolder className="h-4 w-4 mr-1" />
                      {post.category}
                    </div>
                    {post.tags?.length > 0 && (
                      <div className="flex items-center">
                        <HiOutlineTag className="h-4 w-4 mr-1" />
                        {post.tags.join(', ')}
                      </div>
                    )}
                  </div>
                  {post.authorId !== user?.uid && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Collaborator: {post.collaborators.find(c => c.userId === user?.uid)?.role}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    to={`/dashboard/posts/${post.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <HiEye className="h-5 w-5" />
                  </Link>
                  {(post.authorId === user?.uid || post.collaborators?.find(c => c.userId === user?.uid)?.role === 'EDITOR') && (
                    <Link
                      to={`/dashboard/posts/${post.id}/edit`}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <HiPencil className="h-5 w-5" />
                    </Link>
                  )}
                  {post.authorId === user?.uid && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <HiTrash className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {filter === 'collaborated'
                ? "You haven't been added as a collaborator to any posts yet."
                : filter === 'owned'
                ? "You haven't created any posts yet."
                : "No posts found."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPosts; 