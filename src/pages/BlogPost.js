import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiHeart, 
  HiOutlineHeart, 
  HiShare, 
  HiClock, 
  HiTag,
  HiChat,
  HiArrowLeft
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  limit, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  getDocs
} from 'firebase/firestore';
import ImageSlider from '../components/ImageSlider';

const BlogPost = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          const postData = { id: postSnap.id, ...postSnap.data() };
          setPost(postData);
          setIsLiked(postData.likedBy?.includes(user?.uid));
          fetchRelatedPosts(postData.category);
          setShareUrl(window.location.href);

          // Update view count
          if (user?.uid !== postData.authorId) {
            await updateDoc(postRef, {
              views: (postData.views || 0) + 1
            });
          }
        } else {
          setError('Post not found');
        }
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();

    // Set up real-time listener for comments
    const commentsQuery = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleString()
      }));
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [postId, user]);

  const fetchRelatedPosts = async (category) => {
    try {
      const relatedQuery = query(
        collection(db, 'posts'),
        where('category', '==', category),
        where('status', '==', 'published'),
        limit(3)
      );

      const querySnapshot = await getDocs(relatedQuery);
      const relatedPostsData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post => post.id !== postId);
      
      setRelatedPosts(relatedPostsData);
    } catch (err) {
      console.error('Error fetching related posts:', err);
    }
  };

  const handleLike = async () => {
    if (!user) return;

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: isLiked ? post.likes - 1 : post.likes + 1,
        likedBy: isLiked 
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid)
      });
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Error updating like:', err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;

    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        content: comment.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email,
        authorImage: user.photoURL,
        createdAt: serverTimestamp()
      });
      setComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-500">
          Return to Home
        </Link>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <HiArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative w-full h-[60vh] overflow-hidden">
        <ImageSlider 
          images={post.imageUrls || [post.imageUrl || `https://source.unsplash.com/random/${post.id}`]} 
        />
        <div className="absolute inset-0 bg-black bg-opacity-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-16">
            <div className="text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
              <div className="flex items-center space-x-4">
                <img
                  src={post.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}`}
                  alt={post.authorName}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{post.authorName}</p>
                  <div className="flex items-center text-sm opacity-80">
                    <HiClock className="h-4 w-4 mr-1" />
                    {new Date(post.createdAt?.toDate()).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tags and Metadata */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className="flex items-center text-gray-600">
                <HiChat className="h-5 w-5 mr-1" />
                {comments.length} comments
              </div>
              <div className="flex items-center text-gray-600">
                <HiTag className="h-5 w-5 mr-1" />
                {post.category}
              </div>
              {post.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Post Content */}
            <div className="prose max-w-none mb-12">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Interactive Buttons */}
            <div className="flex items-center space-x-4 mb-12">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                  isLiked
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {isLiked ? (
                  <HiHeart className="h-5 w-5" />
                ) : (
                  <HiOutlineHeart className="h-5 w-5" />
                )}
                <span>{post.likes || 0}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-gray-600 bg-gray-50 hover:bg-gray-100"
              >
                <HiShare className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Comments Section */}
            <div className="border-t pt-12">
              <h2 className="text-2xl font-bold mb-6">Comments</h2>
              
              {user ? (
                <form onSubmit={handleComment} className="mb-8">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  />
                  <button
                    type="submit"
                    disabled={!comment.trim()}
                    className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Post Comment
                  </button>
                </form>
              ) : (
                <p className="mb-8 text-gray-600">
                  Please <Link to="/login" className="text-indigo-600 hover:text-indigo-500">login</Link> to comment
                </p>
              )}

              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-4">
                    <img
                      src={comment.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.authorName)}`}
                      alt={comment.authorName}
                      className="h-10 w-10 rounded-full"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{comment.authorName}</span>
                        <span className="text-gray-500 text-sm">{comment.createdAt}</span>
                      </div>
                      <p className="mt-1 text-gray-800">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="sticky top-24">
                <h2 className="text-xl font-bold mb-6">Related Posts</h2>
                <div className="space-y-6">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      to={`/post/${relatedPost.id}`}
                      className="group block"
                    >
                      <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden mb-3">
                        <img
                          src={relatedPost.imageUrl || `https://source.unsplash.com/random/${relatedPost.id}`}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <h3 className="font-semibold group-hover:text-indigo-600 transition-colors duration-200">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {relatedPost.content}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BlogPost; 