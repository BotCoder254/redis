import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiUpload, HiCheck, HiX, HiLightBulb, HiEye, HiPencil } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../config/firebase';
import { 
  doc,
  getDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate, useParams } from 'react-router-dom';
import { generateContentSuggestions, generateBlogOutline } from '../../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

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

const EditPost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { postId } = useParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [publishingStatus, setPublishingStatus] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [originalPost, setOriginalPost] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          const postData = postSnap.data();
          setOriginalPost(postData);
          setTitle(postData.title);
          setContent(postData.content);
          setTags(postData.tags.join(', '));
          setCategory(postData.category);
          setImagePreviews(postData.imageUrls || []);
          setImages([]);
        } else {
          setError('Post not found');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);

    if (validFiles.length !== files.length) {
      setError('Some images were skipped (max size: 5MB per image)');
    }

    setImages(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const updatePublishingStatus = (status) => {
    setPublishingStatus(status);
    setTimeout(() => setPublishingStatus(''), 3000);
  };

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      updatePublishingStatus('Uploading images...');
      const newImageUrls = await Promise.all(
        images.map(async (image) => {
          const imageRef = ref(storage, `blog-images/${Date.now()}-${image.name}`);
          await uploadBytes(imageRef, image);
          return getDownloadURL(imageRef);
        })
      );

      // Combine existing and new image URLs
      const allImageUrls = [...(originalPost.imageUrls || []), ...newImageUrls];

      updatePublishingStatus('Updating post...');
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        category,
        imageUrls: allImageUrls,
        updatedAt: serverTimestamp(),
        status: isDraft ? 'draft' : 'published',
      });

      setSuccess(true);
      updatePublishingStatus(isDraft ? 'Saved as draft!' : 'Updated successfully!');
      
      setTimeout(() => {
        navigate('/dashboard/my-posts');
      }, 2000);

    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update post. Please try again.');
      updatePublishingStatus('');
    } finally {
      setLoading(false);
    }
  };

  const formatMarkdown = (text) => {
    text = text.replace(/^# /gm, '# ');
    text = text.replace(/^## /gm, '## ');
    text = text.replace(/^### /gm, '### ');
    text = text.replace(/^\* /gm, '* ');
    text = text.replace(/^- /gm, '- ');
    text = text.replace(/\n\n/g, '\n\n');
    return text;
  };

  const handleContentChange = (e) => {
    const formattedContent = formatMarkdown(e.target.value);
    setContent(formattedContent);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Post</h2>

      {/* Status Messages */}
      {publishingStatus && (
        <div className={`mb-4 p-3 rounded ${
          success ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          <div className="flex items-center">
            {success ? (
              <HiCheck className="h-5 w-5 mr-2" />
            ) : (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2" />
            )}
            {publishingStatus}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <HiX className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat.toLowerCase()}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g. react, javascript, web"
            />
          </div>
        </div>

        {/* Content Section with Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Content *
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsPreview(!isPreview)}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isPreview ? (
                  <>
                    <HiPencil className="h-4 w-4 mr-1" />
                    Edit
                  </>
                ) : (
                  <>
                    <HiEye className="h-4 w-4 mr-1" />
                    Preview
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-1 relative">
            {isPreview ? (
              <div className="prose prose-lg max-w-none mb-12 p-4 border rounded-lg min-h-[300px] bg-gray-50">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  className="markdown-content"
                >
                  {content || '_No content yet..._'}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                id="content"
                rows="12"
                value={content}
                onChange={handleContentChange}
                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                placeholder="Write your blog post content here using Markdown..."
                required
              />
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Use Markdown formatting for headings (#), lists (*, -), bold (**), italic (*), and more. Toggle preview to see how it looks.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Images</label>
          <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="h-32 w-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <HiX className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="h-32 flex items-center justify-center border-2 border-gray-300 border-dashed rounded-lg">
              <label className="cursor-pointer text-center p-4">
                <HiUpload className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm text-gray-600">Add Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  multiple
                />
              </label>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">PNG, JPG, GIF up to 5MB each</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Post'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default EditPost; 