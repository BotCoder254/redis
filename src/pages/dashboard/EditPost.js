import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiUpload, HiCheck, HiX, HiLightBulb, HiEye, HiPencil } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../config/firebase';
import { 
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  addDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate, useParams } from 'react-router-dom';
import { generateContentSuggestions, generateBlogOutline } from '../../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import CollaboratorsSection from '../../components/blog/CollaboratorsSection';
import ActivityLog from '../../components/blog/ActivityLog';

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
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [collaborators, setCollaborators] = useState([]);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!user || !postId) return;

    const postRef = doc(db, 'posts', postId);
    const unsubscribe = onSnapshot(postRef, (doc) => {
      if (!doc.exists()) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      const postData = doc.data();
      setTitle(postData.title);
      setContent(postData.content);
      setTags(postData.tags.join(','));
      setCategory(postData.category);
      setImagePreviews(postData.imageUrls || []);
      setCollaborators(postData.collaborators || []);

      // Check if user is the owner or has edit permissions
      const userCollaborator = postData.collaborators?.find(c => c.userId === user.uid);
      const isOwner = postData.authorId === user.uid;
      const canEditPost = isOwner || userCollaborator?.role === 'OWNER' || userCollaborator?.role === 'EDITOR';
      setCanEdit(canEditPost);

      if (!canEditPost) {
        setError('You do not have permission to edit this post');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, user]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      setError('You do not have permission to edit this post');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      updatePublishingStatus('Uploading images...');
      const imageUrls = await Promise.all(
        images.map(async (image) => {
          const imageRef = ref(storage, `blog-images/${Date.now()}-${image.name}`);
          await uploadBytes(imageRef, image);
          return getDownloadURL(imageRef);
        })
      );

      updatePublishingStatus('Updating post...');
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        category,
        imageUrls: [...imagePreviews, ...imageUrls],
        updatedAt: serverTimestamp(),
        collaborators: collaborators.map(c => ({
          userId: c.userId,
          email: c.email,
          role: c.role,
          addedAt: c.addedAt || serverTimestamp()
        })),
        lastModified: serverTimestamp(),
        lastModifiedBy: user.uid
      });

      // Log the edit activity
      await addDoc(collection(db, 'posts', postId, 'activityLog'), {
        type: 'content_edited',
        timestamp: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email,
        action: 'Updated post content'
      });

      setSuccess(true);
      updatePublishingStatus('Updated successfully!');
      
      setTimeout(() => {
        navigate(`/dashboard/posts/${postId}`);
      }, 2000);

    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update post: ' + error.message);
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

  if (!canEdit) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">You do not have permission to edit this post.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto p-6"
    >
      <h1 className="text-3xl font-bold mb-8">Edit Post</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Post updated successfully!
        </div>
      )}

      {publishingStatus && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          {publishingStatus}
        </div>
      )}

      <div className="flex justify-end space-x-4 mb-6">
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {isPreview ? <HiPencil className="mr-2" /> : <HiEye className="mr-2" />}
          {isPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Add Collaborators Section */}
        <div className="mt-8 border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Manage Collaborators</h2>
          <CollaboratorsSection
            postId={postId}
            collaborators={collaborators}
            setCollaborators={setCollaborators}
          />
        </div>

        {/* Show Activity Log */}
        <div className="mt-8 border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
          <ActivityLog postId={postId} />
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Post'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default EditPost; 