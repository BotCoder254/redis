import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiQuestionMarkCircle, 
  HiCheck, 
  HiReply, 
  HiThumbUp, 
  HiOutlineThumbUp,
  HiFlag,
  HiX,
  HiPencil,
  HiOutlinePlusCircle
} from 'react-icons/hi';
import { db } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';

const QASection = ({ postId, authorId }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filter, setFilter] = useState('all');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!postId) return;

    // Check if user is post owner
    const postRef = doc(db, 'posts', postId);
    const unsubscribePost = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        const postData = doc.data();
        setIsOwner(postData.authorId === user?.uid);
      }
    });

    // Fetch questions
    const questionsQuery = query(collection(db, 'posts', postId, 'questions'));
    const unsubscribeQuestions = onSnapshot(questionsQuery, (snapshot) => {
      const questionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setQuestions(questionsData);
      setLoading(false);
    });

    return () => {
      unsubscribePost();
      unsubscribeQuestions();
    };
  }, [postId, user]);

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!user || !isOwner) return;

    try {
      const questionRef = await addDoc(collection(db, 'posts', postId, 'questions'), {
        text: newQuestion.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email,
        authorImage: user.photoURL,
        createdAt: serverTimestamp(),
        likes: [],
        isAnswered: false
      });

      setNewQuestion('');
    } catch (error) {
      console.error('Error adding question:', error);
      setError('Failed to add question');
    }
  };

  const handleSubmitReply = async (questionId) => {
    if (!user || !replyContent.trim()) return;

    try {
      const questionRef = doc(db, 'posts', postId, 'questions', questionId);
      await updateDoc(questionRef, {
        answer: {
          content: replyContent.trim(),
          authorId: user.uid,
          authorName: user.displayName || user.email,
          authorImage: user.photoURL,
          createdAt: serverTimestamp(),
          likes: 0,
          likedBy: []
        },
        isAnswered: true
      });
      setReplyingTo(null);
      setReplyContent('');
    } catch (error) {
      console.error('Error adding reply:', error);
      setError('Failed to submit reply');
    }
  };

  const handleLikeQuestion = async (questionId, isLiked) => {
    if (!user) return;

    try {
      const questionRef = doc(db, 'posts', postId, 'questions', questionId);
      await updateDoc(questionRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleReportQuestion = async (questionId) => {
    if (!user) return;

    try {
      const questionRef = doc(db, 'posts', postId, 'questions', questionId);
      await updateDoc(questionRef, {
        isReported: true,
        reports: arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error reporting question:', error);
    }
  };

  const handleEditQuestion = async (questionId) => {
    if (!user || !editContent.trim()) return;

    try {
      const questionRef = doc(db, 'posts', postId, 'questions', questionId);
      await updateDoc(questionRef, {
        content: editContent.trim(),
        lastEdited: serverTimestamp()
      });
      setEditingQuestion(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing question:', error);
      setError('Failed to edit question');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'posts', postId, 'questions', questionId));
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('Failed to delete question');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center">
          <HiQuestionMarkCircle className="h-6 w-6 mr-2" />
          Questions & Answers
        </h3>
        <div className="flex space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="likes">Most Liked</option>
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Questions</option>
            <option value="answered">Answered</option>
            <option value="unanswered">Unanswered</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg">
          {error}
        </div>
      )}

      {isOwner && (
        <form onSubmit={handleSubmitQuestion} className="space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700">
              Add a Question
            </label>
            <textarea
              id="question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              rows="3"
              placeholder="Type your question here..."
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Question
            </button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {questions.map((question) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            {/* Question */}
            <div className="flex items-start space-x-4">
              <img
                src={question.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(question.authorName)}`}
                alt={question.authorName}
                className="h-10 w-10 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{question.authorName}</h4>
                    <span className="text-sm text-gray-500">{question.createdAt?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleLikeQuestion(question.id, question.likedBy?.includes(user?.uid))}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-md ${
                        question.likedBy?.includes(user?.uid)
                          ? 'text-indigo-600 bg-indigo-50'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {question.likedBy?.includes(user?.uid) ? (
                        <HiThumbUp className="h-5 w-5" />
                      ) : (
                        <HiOutlineThumbUp className="h-5 w-5" />
                      )}
                      <span>{question.likes}</span>
                    </button>
                    {user?.uid === question.authorId && (
                      <>
                        <button
                          onClick={() => {
                            setEditingQuestion(question.id);
                            setEditContent(question.text);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <HiPencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <HiX className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    {user && user.uid !== question.authorId && (
                      <button
                        onClick={() => handleReportQuestion(question.id)}
                        className={`text-gray-500 hover:text-red-500 ${
                          question.isReported ? 'text-red-500' : ''
                        }`}
                      >
                        <HiFlag className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                {editingQuestion === question.id ? (
                  <div className="mt-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows="3"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => {
                          setEditingQuestion(null);
                          setEditContent('');
                        }}
                        className="px-3 py-1 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditQuestion(question.id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 prose prose-sm max-w-none">
                    <ReactMarkdown>{question.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>

            {/* Answer */}
            {question.isAnswered ? (
              <div className="mt-4 ml-14 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-4">
                  <img
                    src={question.answer.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(question.answer.authorName)}`}
                    alt={question.answer.authorName}
                    className="h-8 w-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium flex items-center">
                        {question.answer.authorName}
                        {question.answer.authorId === authorId && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Author
                          </span>
                        )}
                      </h5>
                      <span className="text-sm text-gray-500">
                        {new Date(question.answer.createdAt?.toDate()).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 prose prose-sm max-w-none">
                      <ReactMarkdown>{question.answer.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ) : user?.uid === authorId && (
              <div className="mt-4 ml-14">
                {replyingTo === question.id ? (
                  <div className="space-y-4">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write your answer... (Markdown supported)"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows="3"
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleSubmitReply(question.id)}
                        disabled={!replyContent.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Answer
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingTo(question.id)}
                    className="flex items-center text-indigo-600 hover:text-indigo-700"
                  >
                    <HiReply className="h-5 w-5 mr-2" />
                    Answer this question
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}

        {questions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {isOwner ? 'Add your first question!' : 'No questions available yet.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default QASection; 