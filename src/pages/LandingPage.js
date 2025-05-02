import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiSearch, FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HiEye, HiHeart, HiChat } from 'react-icons/hi';

const LandingPage = () => {
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredAuthors, setFeaturedAuthors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchTrendingPosts(),
          fetchCategories(),
          fetchFeaturedAuthors()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchTrendingPosts = async () => {
    try {
      // Simplified query to avoid index requirement
      const q = query(
        collection(db, 'posts'),
        where('status', '==', 'published')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            height: Math.floor(Math.random() * (450 - 200 + 1) + 200)
          }))
          // Client-side sorting by views
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          // Take only the top 12 posts
          .slice(0, 12);

        setTrendingPosts(posts);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching trending posts:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) || [];
        setCategories(cats);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching categories:', error);
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

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Animation */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-[70vh] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 overflow-hidden"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute inset-0 bg-black opacity-10"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
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

          {/* Search Bar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-2xl px-4"
          >
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for stories..."
                className="w-full pl-12 pr-4 py-4 rounded-full bg-white bg-opacity-20 backdrop-blur-md text-white placeholder-white placeholder-opacity-70 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all"
              />
            </div>
          </motion.div>
        </div>
      </motion.header>

      {/* Trending Posts - Pinterest Style Layout */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Trending Posts</h2>
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {trendingPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="break-inside-avoid mb-4"
            >
              <Link
                to={`/post/${post.id}`}
                className="block bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="relative group">
                  <img
                    src={post.imageUrl || `https://source.unsplash.com/random/${post.id}`}
                    alt={post.title}
                    className="w-full object-cover"
                    style={{ height: `${post.height}px` }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300" />
                </div>
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
                      {post.createdAt?.toDate().toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.content}
                  </p>

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
                        {post.comments?.length || 0}
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
                        <span className="text-xs text-gray-500">+{post.tags.length - 2}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
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