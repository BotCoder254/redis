import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiUpload, HiCheck, HiX, HiLightBulb, HiEye, HiPencil } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
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

const NewPost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [publishingStatus, setPublishingStatus] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [generatedContents, setGeneratedContents] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const [collaborators, setCollaborators] = useState([
    {
      userId: user?.uid,
      email: user?.email,
      role: 'OWNER',
      addedAt: new Date()
    }
  ]);
  const [postId, setPostId] = useState(null);

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

  const handleGenerateIdeas = async () => {
    if (!title && !category) {
      setError('Please provide a title or category for AI suggestions');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setSuggestions([]);
    setGeneratedContents([]);

    try {
      const result = await generateContentSuggestions(title || category);
      if (typeof result === 'string') {
        if (result.includes('API key')) {
          setGenerationError('AI service is currently unavailable. Please try again later.');
        } else {
          // Format the result into separate suggestions
          const lines = result.split('\n').filter(line => line.trim());
          const formattedSuggestions = [];
          let currentSuggestion = '';
          
          for (const line of lines) {
            if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) {
              if (currentSuggestion) {
                formattedSuggestions.push(currentSuggestion.trim());
                currentSuggestion = '';
              }
              currentSuggestion = line;
            } else {
              currentSuggestion += '\n' + line;
            }
          }
          
          if (currentSuggestion) {
            formattedSuggestions.push(currentSuggestion.trim());
          }

          // Take up to 3 suggestions
          setSuggestions(formattedSuggestions.slice(0, 3));
        }
      } else {
        setGenerationError('Failed to generate suggestions. Please try again.');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setGenerationError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!title) {
      setError('Please provide a title for the outline');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setSuggestions([]);
    setGeneratedContents([]);

    try {
      const outline = await generateBlogOutline(title);
      if (typeof outline === 'string' && outline.includes('API key')) {
        setGenerationError('AI service is currently unavailable. Please try again later.');
      } else {
        setGeneratedContents([outline]);
      }
    } catch (error) {
      console.error('Error generating outline:', error);
      setGenerationError('Failed to generate outline. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateContent = async (suggestion) => {
    setIsGenerating(true);
    setGenerationError('');

    try {
      const result = await generateBlogOutline(suggestion);
      if (typeof result === 'string') {
        if (result.includes('API key')) {
          setGenerationError('AI service is currently unavailable. Please try again later.');
        } else {
          // Format and add the generated content
          const formattedContent = result.trim();
          setGeneratedContents(prev => [...prev, formattedContent]);
        }
      } else {
        setGenerationError('Failed to generate content. Please try again.');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setGenerationError('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updatePublishingStatus = (status) => {
    setPublishingStatus(status);
    setTimeout(() => setPublishingStatus(''), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      updatePublishingStatus('Creating post...');
      const postData = {
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        category,
        imageUrls,
        authorId: user.uid,
        authorName: user.displayName || user.email,
        authorImage: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'published',
        views: 0,
        likes: 0,
        comments: [],
        collaborators: collaborators.map(c => ({
          userId: c.userId,
          email: c.email,
          role: c.role,
          addedAt: serverTimestamp()
        })),
        createdBy: user.uid,
        lastModified: serverTimestamp(),
      };

      const postRef = await addDoc(collection(db, 'posts'), postData);
      setPostId(postRef.id);

      // Log the post creation activity
      await addDoc(collection(db, 'posts', postRef.id, 'activityLog'), {
        type: 'content_edited',
        timestamp: serverTimestamp(),
        userId: user.uid,
        action: 'Created post'
      });

      setSuccess(true);
      updatePublishingStatus('Published successfully!');
      
      setTimeout(() => {
        setTitle('');
        setContent('');
        setTags('');
        setCategory('');
        setImages([]);
        setImagePreviews([]);
        setSuccess(false);
        navigate(`/dashboard/posts/${postRef.id}`);
      }, 2000);

    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post: ' + error.message);
      updatePublishingStatus('');
    } finally {
      setLoading(false);
    }
  };

  const formatMarkdown = (text) => {
    // Format headings
    text = text.replace(/^# /gm, '# ');
    text = text.replace(/^## /gm, '## ');
    text = text.replace(/^### /gm, '### ');
    
    // Format lists
    text = text.replace(/^\* /gm, '* ');
    text = text.replace(/^- /gm, '- ');
    
    // Ensure proper line breaks
    text = text.replace(/\n\n/g, '\n\n');
    
    return text;
  };

  const handleContentChange = (e) => {
    const formattedContent = formatMarkdown(e.target.value);
    setContent(formattedContent);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h2>

      {/* Status Messages */}
      <AnimatePresence>
        {publishingStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mb-4 p-3 rounded ${
              success ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            <div className="flex items-center">
              {success ? (
                <HiCheck className="h-5 w-5 mr-2" />
              ) : (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2" />
              )}
              {publishingStatus}
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center"
          >
            <HiX className="h-5 w-5 mr-2" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* AI Suggestions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">AI Assistance</h3>
            <div className="space-x-2">
              <button
                type="button"
                onClick={handleGenerateIdeas}
                disabled={isGenerating || !title}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <HiLightBulb className="h-5 w-5 mr-2" />
                Generate Ideas
              </button>
              <button
                type="button"
                onClick={handleGenerateOutline}
                disabled={isGenerating || !title}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Generate Outline
              </button>
            </div>
          </div>

          {isGenerating && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          )}

          {generationError && (
            <div className="bg-red-100 border border-red-400 text-red-700 rounded p-4">
              <h4 className="text-sm font-medium text-red-700">Error</h4>
              <p>{generationError}</p>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Choose a Suggestion</h4>
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700">{suggestion}</pre>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateContent(suggestion)}
                        disabled={isGenerating}
                        className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        Generate Content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedContents.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Generated Content Versions</h4>
              <div className="space-y-4">
                {generatedContents.map((content, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-medium text-gray-500">Version {index + 1}</span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => setContent(prev => prev ? `${prev}\n\n${content}` : content)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Append
                        </button>
                        <button
                          type="button"
                          onClick={() => setContent(content)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Use This Version
                        </button>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 max-h-60 overflow-y-auto">
                      {content}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                placeholder={`Write your blog post content here using Markdown...

# Heading 1
## Heading 2
### Heading 3

* Bullet point
* Another point

1. Numbered item
2. Another item

**Bold text**
*Italic text*

> Blockquote

[Link text](url)
`}
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
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </form>

      {/* Add Collaborators Section */}
      <div className="mt-8">
        <CollaboratorsSection
          postId={postId}
          collaborators={collaborators}
          setCollaborators={setCollaborators}
        />
      </div>

      {/* Show Activity Log if post is saved */}
      {postId && (
        <div className="mt-8">
          <ActivityLog postId={postId} />
        </div>
      )}
    </motion.div>
  );
};

export default NewPost; 