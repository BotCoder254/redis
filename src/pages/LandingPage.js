import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiSearch, FiGithub, FiTwitter, FiLinkedin, FiFilter } from 'react-icons/fi';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HiEye, HiHeart, HiChat, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { getCategories, getTags } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import BookmarkButton from '../components/blog/BookmarkButton';

// Define the categories constant to match blog creation
const CATEGORIES = [
  'Technology',
  'Lifestyle',
  'Travel',
  'Food',
  'Health',
  'Business',
  'Art',
  'Education'
];

const LandingPage = () => {
  const { user } = useAuth();
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [featuredAuthors, setFeaturedAuthors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [latestPosts, setLatestPosts] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchTrendingPosts(),
          fetchCategories(),
          fetchTags(),
          fetchFeaturedAuthors(),
          fetchLatestPosts()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [trendingPosts, selectedCategory, selectedTags, searchQuery]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % (latestPosts.length || 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [latestPosts.length]);

  const fetchTrendingPosts = async () => {
    try {
      const q = query(
        collection(db, 'posts'),
        where('status', '==', 'published')
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const postsPromises = snapshot.docs.map(async (doc) => {
          const data = doc.data();
          // Get comments count - only count non-deleted comments
          const commentsSnapshot = await getDocs(collection(db, 'posts', doc.id, 'comments'));
          const commentsCount = commentsSnapshot.docs.filter(doc => !doc.data()._isDeleted).length;

          return {
            id: doc.id,
            ...data,
            imageUrls: data.imageUrls || [],
            imageUrl: data.imageUrl || null,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            authorName: data.authorName || 'Anonymous',
            views: data.views || 0,
            likes: data.likes || 0,
            commentsCount,
            tags: data.tags || [],
            category: data.category || ''
          };
        });

        const posts = await Promise.all(postsPromises);
        const sortedPosts = posts.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 12);

        setTrendingPosts(sortedPosts);
        setFilteredPosts(sortedPosts);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching trending posts:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const fetchedTags = await getTags();
      setTags(fetchedTags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchFeaturedAuthors = async () => {
    try {
      // Simplified query to avoid index requirement
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const authors = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(author => (author.postCount || 0) > 0)
          .sort((a, b) => (b.postCount || 0) - (a.postCount || 0))
          .slice(0, 4);

        setFeaturedAuthors(authors);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching featured authors:', error);
    }
  };

  const fetchLatestPosts = async () => {
    try {
      const q = query(
        collection(db, 'posts'),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            imageUrls: data.imageUrls || [],
            imageUrl: data.imageUrl || null,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          };
        });
        setLatestPosts(posts);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching latest posts:', error);
    }
  };

  const filterPosts = () => {
    let filtered = [...trendingPosts];

    if (selectedCategory) {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(post => 
        selectedTags.every(tag => post.tags.includes(tag))
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredPosts(filtered);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    filterPosts();
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Filter Panel Component
  const FilterPanel = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white shadow-lg rounded-lg p-4 mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category.toLowerCase()}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Animation and Slideshow */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-[70vh] overflow-hidden"
      >
        {/* Navigation Bar for Authenticated Users */}
        {user && (
          <div className="absolute top-4 right-4 z-50">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg backdrop-blur-md bg-opacity-80"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Background Slideshow */}
        <AnimatePresence mode="wait">
          {latestPosts.map((post, index) => (
            index === currentSlide && (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <div className="absolute inset-0 bg-black opacity-60 z-10" />
                <img
                  src={post.imageUrls?.[0] || post.imageUrl || `https://source.unsplash.com/random/${post.id}?blog,article`}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )
          ))}
        </AnimatePresence>

        {/* Slideshow Navigation */}
        {latestPosts.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlide(prev => (prev - 1 + latestPosts.length) % latestPosts.length)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            >
              <HiChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => setCurrentSlide(prev => (prev + 1) % latestPosts.length)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            >
              <HiChevronRight className="h-6 w-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
              {latestPosts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'bg-white w-4' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Content Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white">
          <motion.h1
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold text-center mb-6"
          >
            Welcome to ModernBlog
          </motion.h1>
          <motion.p
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-center mb-12"
          >
            Discover amazing stories and share your own
          </motion.p>

          {/* Search Bar with Filter Toggle */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-2xl px-4"
          >
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for stories..."
                  className="w-full h-14 pl-12 pr-4 rounded-full bg-white bg-opacity-20 backdrop-blur-md text-white placeholder-white placeholder-opacity-70 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="h-14 px-6 rounded-full bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30 hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all"
              >
                <FiFilter className="h-5 w-5 text-white" />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.header>

      {/* Filter Panel */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <AnimatePresence>
          {showFilters && <FilterPanel />}
        </AnimatePresence>
      </div>

      {/* Trending Posts - Pinterest Style Layout */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">
          {filteredPosts.length === trendingPosts.length 
            ? 'Trending Posts' 
            : 'Filtered Posts'}
          <span className="text-gray-500 text-lg ml-2">
            ({filteredPosts.length} posts)
          </span>
        </h2>
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          <AnimatePresence>
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                layout
                className="break-inside-avoid mb-4"
              >
                <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  <Link
                    to={`/post/${post.id}`}
                    className="block"
                  >
                    <div className="relative group aspect-w-16 aspect-h-9">
                      <img
                        src={post.imageUrls?.[0] || post.imageUrl || `https://source.unsplash.com/random/${post.id}?blog,article`}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://source.unsplash.com/random/${post.id}?blog,article`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300" />
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
                        <span className="ml-2 text-sm font-medium text-gray-700">{post.authorName}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {post.createdAt instanceof Date 
                          ? post.createdAt.toLocaleDateString()
                          : post.createdAt?.toDate?.()?.toLocaleDateString() || 'No date'}
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
                        <BookmarkButton postId={post.id} className="text-gray-500 hover:text-indigo-600" />
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
                          <span className="text-xs text-gray-500">+{post.tags.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Explore Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-lg p-6 text-center cursor-pointer shadow-md"
              >
                <h3 className="text-lg font-semibold">{category.name}</h3>
                <p className="text-sm text-gray-500 mt-2">{category.postCount || 0} posts</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Authors */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Featured Authors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredAuthors.map((author) => (
            <motion.div
              key={author.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-white rounded-lg p-6 text-center shadow-lg"
            >
              <img
                src={author.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.displayName || 'User')}`}
                alt={author.displayName}
                className="w-24 h-24 rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold">{author.displayName}</h3>
              <p className="text-gray-600 mt-2">{author.postCount || 0} posts</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">ModernBlog</h3>
              <p className="text-gray-400">Share your stories with the world.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-400 hover:text-white">About</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <FiTwitter className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <FiGithub className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <FiLinkedin className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} ModernBlog. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 