import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiEye, HiHeart, HiChat } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  where
} from 'firebase/firestore';

const Bookmarks = () => {
  const { user } = useAuth();
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
      const q = query(bookmarksRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        try {
          const postsData = await Promise.all(
            snapshot.docs.map(async (bookmarkDoc) => {
              const postRef = doc(db, 'posts', bookmarkDoc.data().postId);
              const postSnap = await getDoc(postRef);
              
              if (postSnap.exists()) {
                const postData = postSnap.data();
                return {
                  id: postSnap.id,
                  ...postData,
                  bookmarkedAt: bookmarkDoc.data().createdAt?.toDate(),
                };
              }
              return null;
            })
          );

          setBookmarkedPosts(postsData.filter(Boolean));
          setLoading(false);
        } catch (err) {
          console.error('Error processing bookmarks:', err);
          setError('Failed to load bookmarked posts');
          setLoading(false);
        }
      }, (err) => {
        console.error('Snapshot error:', err);
        setError('Failed to load bookmarked posts');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Setup error:', err);
      setError('Failed to load bookmarked posts');
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Bookmarked Posts
          <span className="text-gray-500 text-lg ml-2">
            ({bookmarkedPosts.length})
          </span>
        </h2>
      </div>

      {bookmarkedPosts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No bookmarked posts yet</p>
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Explore posts to bookmark
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <Link to={`/post/${post.id}`} className="block">
                <div className="relative aspect-w-16 aspect-h-9">
                  <img
                    src={post.imageUrls?.[0] || post.imageUrl || `https://source.unsplash.com/random/${post.id}?blog,article`}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://source.unsplash.com/random/${post.id}?blog,article`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300" />
                </div>
              </Link>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <img
                      src={post.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'User')}`}
                      alt={post.authorName}
                      className="h-8 w-8 rounded-full"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {post.authorName}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {post.bookmarkedAt?.toLocaleDateString()}
                  </span>
                </div>

                <Link to={`/post/${post.id}`}>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-indigo-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.content}
                  </p>
                </Link>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <HiEye className="h-4 w-4 mr-1" />
                      {post.views || 0}
                    </div>
                    <div className="flex items-center">
                      <HiHeart className="h-4 w-4 mr-1" />
                      {post.likes || 0}
                    </div>
                    <div className="flex items-center">
                      <HiChat className="h-4 w-4 mr-1" />
                      {post.commentsCount || 0}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {post.tags?.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        #{tag}
                      </span>
                    ))}
                    {post.tags?.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{post.tags.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Bookmarks; 