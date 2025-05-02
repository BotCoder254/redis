import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiX, HiCheck, HiOutlineChartBar } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import AddPollForm from './AddPollForm';

const PollSection = ({ postId, authorId }) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userVotes, setUserVotes] = useState({});
  const [pollStats, setPollStats] = useState({});

  useEffect(() => {
    if (!postId) return;

    const pollsQuery = query(
      collection(db, 'posts', postId, 'polls'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(pollsQuery, async (snapshot) => {
      const pollsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Get vote counts for each poll
      const statsPromises = pollsData.map(async (poll) => {
        const votesSnapshot = await getDocs(collection(db, 'posts', postId, 'polls', poll.id, 'votes'));
        const votesByOption = {};
        votesSnapshot.docs.forEach(voteDoc => {
          const { optionId } = voteDoc.data();
          votesByOption[optionId] = (votesByOption[optionId] || 0) + 1;
        });
        return { pollId: poll.id, votesByOption };
      });

      const stats = await Promise.all(statsPromises);
      const statsObj = {};
      stats.forEach(({ pollId, votesByOption }) => {
        statsObj[pollId] = votesByOption;
      });
      setPollStats(statsObj);

      // Get user's votes if logged in
      if (user) {
        const userVotesPromises = pollsData.map(async (poll) => {
          const userVoteQuery = query(
            collection(db, 'posts', postId, 'polls', poll.id, 'votes'),
            where('userId', '==', user.uid)
          );
          const userVoteSnapshot = await getDocs(userVoteQuery);
          if (!userVoteSnapshot.empty) {
            return { pollId: poll.id, optionId: userVoteSnapshot.docs[0].data().optionId };
          }
          return null;
        });

        const userVotesResults = await Promise.all(userVotesPromises);
        const votesObj = {};
        userVotesResults.forEach(vote => {
          if (vote) {
            votesObj[vote.pollId] = vote.optionId;
          }
        });
        setUserVotes(votesObj);
      }

      setPolls(pollsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, user]);

  const handleVote = async (pollId, optionId, currentOptionId) => {
    if (!user) return;

    try {
      const pollRef = doc(db, 'posts', postId, 'polls', pollId);
      const votesRef = collection(pollRef, 'votes');
      
      // Remove existing vote if any
      if (currentOptionId) {
        const oldVoteQuery = query(votesRef, where('userId', '==', user.uid));
        const oldVoteSnapshot = await getDocs(oldVoteQuery);
        if (!oldVoteSnapshot.empty) {
          await deleteDoc(oldVoteSnapshot.docs[0].ref);
        }
      }

      // Add new vote
      await addDoc(votesRef, {
        userId: user.uid,
        optionId,
        timestamp: serverTimestamp()
      });

      // Update user's local vote state
      setUserVotes(prev => ({
        ...prev,
        [pollId]: optionId
      }));

    } catch (error) {
      console.error('Error voting:', error);
      setError('Failed to submit vote. Please try again.');
    }
  };

  const handleClosePoll = async (pollId) => {
    try {
      const pollRef = doc(db, 'posts', postId, 'polls', pollId);
      await updateDoc(pollRef, {
        isActive: false,
        closedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error closing poll:', error);
      setError('Failed to close poll. Please try again.');
    }
  };

  const calculatePercentage = (pollId, optionId) => {
    const votes = pollStats[pollId] || {};
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
    const optionVotes = votes[optionId] || 0;
    return totalVotes === 0 ? 0 : Math.round((optionVotes / totalVotes) * 100);
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
        <h2 className="text-2xl font-bold text-gray-900">Polls</h2>
        {user?.uid === authorId && (
          <button
            onClick={() => setShowAddPoll(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <HiPlus className="h-5 w-5 mr-2" />
            Add Poll
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <HiX className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddPoll && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <AddPollForm
              postId={postId}
              onClose={() => setShowAddPoll(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {polls.map((poll) => (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{poll.question}</h3>
                {user?.uid === authorId && (
                  <button
                    onClick={() => handleClosePoll(poll.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <HiX className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {poll.createdAt?.toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-3">
              {poll.options.map((option) => {
                const percentage = calculatePercentage(poll.id, option.id);
                const isVoted = userVotes[poll.id] === option.id;

                return (
                  <div key={option.id} className="relative">
                    <button
                      onClick={() => handleVote(poll.id, option.id, userVotes[poll.id])}
                      disabled={!user}
                      className={`w-full p-3 rounded-lg border transition-all relative z-10 ${
                        isVoted
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.text}</span>
                        <div className="flex items-center">
                          {isVoted && <HiCheck className="h-5 w-5 mr-2 text-indigo-500" />}
                          <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                      </div>
                    </button>
                    <div
                      className="absolute inset-0 bg-indigo-100 rounded-lg transition-all"
                      style={{ width: `${percentage}%`, zIndex: 0 }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center text-sm text-gray-500">
              <HiOutlineChartBar className="h-5 w-5 mr-1" />
              Total votes: {Object.values(pollStats[poll.id] || {}).reduce((sum, count) => sum + count, 0)}
            </div>
          </motion.div>
        ))}

        {polls.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No active polls yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default PollSection; 