import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCheck, HiX, HiOutlineMailOpen, HiOutlineMail } from 'react-icons/hi';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CollaborationInvites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    // Listen for invites where the user is the invitee
    const invitesQuery = query(
      collection(db, 'collaborationInvites'),
      where('inviteeEmail', '==', user.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(invitesQuery, (snapshot) => {
      const invitesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvites(invitesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleInviteResponse = async (invite, accept) => {
    try {
      if (accept) {
        // Add user as collaborator to the post
        const postRef = doc(db, 'posts', invite.postId);
        const postDoc = await getDocs(postRef);
        
        if (postDoc.exists()) {
          const currentCollaborators = postDoc.data().collaborators || [];
          await updateDoc(postRef, {
            collaborators: [
              ...currentCollaborators,
              {
                userId: user.uid,
                email: user.email,
                role: invite.role,
                addedAt: serverTimestamp()
              }
            ]
          });

          // Log the activity
          await addDoc(collection(db, 'posts', invite.postId, 'activityLog'), {
            type: 'collaborator_added',
            timestamp: serverTimestamp(),
            userId: user.uid,
            action: `${user.email} joined as ${invite.role}`
          });
        }
      }

      // Delete the invitation
      await deleteDoc(doc(db, 'collaborationInvites', invite.id));

      if (accept) {
        navigate(`/dashboard/posts/${invite.postId}`);
      }
    } catch (error) {
      console.error('Error handling invitation:', error);
      setError('Failed to process invitation');
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
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <h2 className="text-xl font-semibold flex items-center mb-6">
          <HiOutlineMail className="h-6 w-6 mr-2 text-indigo-600" />
          Collaboration Invites
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <AnimatePresence>
            {invites.map((invite) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{invite.postTitle}</h3>
                    <p className="text-sm text-gray-500">
                      Invited by {invite.inviterEmail} as {invite.role}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {invite.createdAt?.toDate().toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleInviteResponse(invite, true)}
                      className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <HiCheck className="h-5 w-5 mr-1" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleInviteResponse(invite, false)}
                      className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      <HiX className="h-5 w-5 mr-1" />
                      Decline
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {invites.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <HiOutlineMailOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No pending invitations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationInvites; 