import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiX, HiCheck, HiOutlineChartBar, HiOutlinePlusCircle, HiLockClosed } from 'react-icons/hi';
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

const PollSection = ({ postId }) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [userVotes, setUserVotes] = useState({});
  const [pollStats, setPollStats] = useState({});

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

    // Fetch polls
    const pollsQuery = query(collection(db, 'posts', postId, 'polls'));
    const unsubscribePolls = onSnapshot(pollsQuery, async (snapshot) => {
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

    return () => {
      unsubscribePost();
      unsubscribePolls();
    };
  }, [postId, user]);

  const handleVote = async (pollId, optionId, currentOptionId) => {
    if (!user) return;

    try {
      const pollRef = doc(db, 'posts', postId, 'polls', pollId);
      
      if (currentOptionId) {
        // Remove vote from current option
        await updateDoc(pollRef, {
          [`options.${currentOptionId}.votes`]: arrayRemove(user.uid)
        });
      }

      // Add vote to new option
      await updateDoc(pollRef, {
        [`options.${optionId}.votes`]: arrayUnion(user.uid)
      });

      // Update user's local vote state
      setUserVotes(prev => ({
        ...prev,
        [pollId]: optionId
      }));

    } catch (error) {
      console.error('Error voting:', error);
      setError('Failed to vote');
    }
  };

  const handleClosePoll = async (pollId) => {
    if (!isOwner) return;

    try {
      const pollRef = doc(db, 'posts', postId, 'polls', pollId);
      await updateDoc(pollRef, {
        isClosed: true,
        closedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error closing poll:', error);
      setError('Failed to close poll');
    }
  };

  const calculatePercentage = (pollId, optionId) => {
    const votes = pollStats[pollId] || {};
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
    const optionVotes = votes[optionId] || 0;
    return totalVotes === 0 ? 0 : Math.round((optionVotes / totalVotes) * 100);
  };

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Polls</h2>
        {isOwner && (
          <button
            onClick={() => setShowAddPoll(true)}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <HiOutlinePlusCircle className="h-5 w-5 mr-1" />
            Add Poll
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg">
          {error}
        </div>
      )}

      {showAddPoll && isOwner && (
        <AddPollForm
          postId={postId}
          onClose={() => setShowAddPoll(false)}
        />
      )}

      {polls.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {isOwner ? 'Create your first poll!' : 'No polls available yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <div
              key={poll.id}
              className="bg-gray-50 rounded-lg p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{poll.question}</h3>
                {poll.isClosed && (
                  <span className="flex items-center text-sm text-gray-500">
                    <HiLockClosed className="h-4 w-4 mr-1" />
                    Closed
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {Object.entries(poll.options).map(([optionId, option]) => {
                  const totalVotes = Object.values(poll.options).reduce(
                    (sum, opt) => sum + (opt.votes?.length || 0),
                    0
                  );
                  const voteCount = option.votes?.length || 0;
                  const percentage = totalVotes === 0 ? 0 : (voteCount / totalVotes) * 100;
                  const hasVoted = option.votes?.includes(user?.uid);
                  const canVote = !poll.isClosed && user;

                  return (
                    <button
                      key={optionId}
                      onClick={() => canVote && handleVote(poll.id, optionId, hasVoted ? optionId : null)}
                      disabled={!canVote}
                      className={`relative w-full p-3 rounded-lg text-left transition-colors ${
                        hasVoted
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-white hover:bg-gray-100'
                      } ${!canVote ? 'cursor-not-allowed opacity-75' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.text}</span>
                        {hasVoted && <HiCheck className="h-5 w-5" />}
                      </div>
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-indigo-600 rounded-b-lg transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        {voteCount} vote{voteCount !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
                      </div>
                    </button>
                  );
                })}
              </div>

              {isOwner && !poll.isClosed && (
                <button
                  onClick={() => handleClosePoll(poll.id)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close Poll
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PollSection; 