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
  HiPencil
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

  useEffect(() => {
    const questionsQuery = query(
      collection(db, 'posts', postId, 'questions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(questionsQuery, (snapshot) => {
      const questionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toLocaleString(),
        likes: doc.data().likes || 0,
        likedBy: doc.data().likedBy || [],
        isReported: doc.data().isReported || false,
        reports: doc.data().reports || 0
      }));

      // Apply sorting
      const sortedQuestions = [...questionsData].sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (sortBy === 'likes') {
          return b.likes - a.likes;
        }
        return 0;
      });

      // Apply filtering
      const filteredQuestions = sortedQuestions.filter(q => {
        if (filter === 'all') return true;
        if (filter === 'answered') return q.isAnswered;
        if (filter === 'unanswered') return !q.isAnswered;
        return true;
      });

      setQuestions(filteredQuestions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, sortBy, filter]);

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!user || !newQuestion.trim()) return;

    try {
      await addDoc(collection(db, 'posts', postId, 'questions'), {
        content: newQuestion.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email,
        authorImage: user.photoURL,
        createdAt: serverTimestamp(),
        isAnswered: false,
        likes: 0,
        likedBy: [],
        isReported: false,
        reports: 0
      });
      setNewQuestion('');
    } catch (error) {
      console.error('Error adding question:', error);
      setError('Failed to submit question');
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

      {user && (
        <form onSubmit={handleSubmitQuestion} className="space-y-4">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask a question... (Markdown supported)"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows="3"
          />
          <button
            type="submit"
            disabled={!newQuestion.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Question
          </button>
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
                    <span className="text-sm text-gray-500">{question.createdAt}</span>
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
                            setEditContent(question.content);
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
                    <ReactMarkdown>{question.content}</ReactMarkdown>
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
            No questions yet. Be the first to ask!
          </div>
        )}
      </div>
    </div>
  );
};

export default QASection; 