import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiUserAdd, HiX, HiRefresh } from 'react-icons/hi';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const ROLES = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  REVIEWER: 'REVIEWER'
};

const CollaboratorsSection = ({ postId, collaborators, setCollaborators }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.EDITOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);

  const isOwner = collaborators.find(c => c.userId === user?.uid)?.role === ROLES.OWNER;

  useEffect(() => {
    if (!postId) return;

    // Listen for pending invites
    const invitesQuery = query(
      collection(db, 'collaborationInvites'),
      where('postId', '==', postId)
    );

    const unsubscribe = onSnapshot(invitesQuery, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingInvites(invites);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim() || !role) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if user exists
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email.trim().toLowerCase())
      );
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        setError('User not found');
        setLoading(false);
        return;
      }

      const userData = userSnapshot.docs[0].data();

      // Check if already a collaborator
      const isCollaborator = collaborators.some(c => 
        c.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (isCollaborator) {
        setError('User is already a collaborator');
        setLoading(false);
        return;
      }

      // Check if invite already exists
      const invitesQuery = query(
        collection(db, 'collaborationInvites'),
        where('postId', '==', postId),
        where('inviteeEmail', '==', email.trim().toLowerCase())
      );
      const inviteSnapshot = await getDocs(invitesQuery);

      if (!inviteSnapshot.empty) {
        setError('Invitation already sent');
        setLoading(false);
        return;
      }

      // Get post details
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDocs(postRef);
      const postData = postDoc.exists() ? postDoc.data() : null;

      if (!postData) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      // Create invitation
      await addDoc(collection(db, 'collaborationInvites'), {
        postId,
        postTitle: postData.title,
        inviterEmail: user.email,
        inviteeEmail: email.trim().toLowerCase(),
        inviteeId: userData.uid,
        role,
        createdAt: serverTimestamp(),
        status: 'pending',
        existingCollaborators: collaborators
      });

      // Log the activity
      await addDoc(collection(db, 'posts', postId, 'activityLog'), {
        type: 'invitation_sent',
        timestamp: serverTimestamp(),
        userId: user.uid,
        action: `Invited ${email.trim()} as ${role}`
      });

      setSuccess('Invitation sent successfully');
      setEmail('');
      setRole(ROLES.EDITOR);
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      setError('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorEmail) => {
    if (!isOwner) return;

    try {
      const updatedCollaborators = collaborators.filter(c => c.email !== collaboratorEmail);
      setCollaborators(updatedCollaborators);

      // Log the activity
      await addDoc(collection(db, 'posts', postId, 'activityLog'), {
        type: 'collaborator_removed',
        timestamp: serverTimestamp(),
        userId: user.uid,
        action: `Removed collaborator ${collaboratorEmail}`
      });
    } catch (error) {
      console.error('Error removing collaborator:', error);
      setError('Failed to remove collaborator');
    }
  };

  const handleUpdateRole = async (collaboratorEmail, newRole) => {
    if (!isOwner) return;

    try {
      const updatedCollaborators = collaborators.map(c =>
        c.email === collaboratorEmail ? { ...c, role: newRole } : c
      );
      setCollaborators(updatedCollaborators);

      // Log the activity
      await addDoc(collection(db, 'posts', postId, 'activityLog'), {
        type: 'role_updated',
        timestamp: serverTimestamp(),
        userId: user.uid,
        action: `Updated ${collaboratorEmail}'s role to ${newRole}`
      });
    } catch (error) {
      console.error('Error updating role:', error);
      setError('Failed to update role');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-h-[600px] overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Collaborators</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Current Collaborators */}
      <div className="space-y-4 mb-6">
        <AnimatePresence>
          {collaborators.map((collaborator) => (
            <motion.div
              key={collaborator.email}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{collaborator.email}</p>
                <p className="text-xs text-gray-500">Role: {collaborator.role}</p>
                <p className="text-xs text-gray-400">
                  {collaborator.addedAt && typeof collaborator.addedAt.toDate === 'function' 
                    ? collaborator.addedAt.toDate().toLocaleString()
                    : 'Recently added'}
                </p>
              </div>
              {isOwner && collaborator.userId !== user.uid && (
                <div className="flex items-center space-x-2">
                  <select
                    value={collaborator.role}
                    onChange={(e) => handleUpdateRole(collaborator.email, e.target.value)}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {Object.values(ROLES).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveCollaborator(collaborator.email)}
                    className="p-1 text-red-600 hover:text-red-800 focus:outline-none"
                  >
                    <HiX className="h-5 w-5" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Invite Form */}
      {isOwner && (
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Invite Collaborator
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
              >
                {Object.values(ROLES).filter(r => r !== ROLES.OWNER).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <HiRefresh className="animate-spin h-5 w-5 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <HiUserAdd className="h-5 w-5 mr-2" />
                  Send Invite
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Pending Invites</h3>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between py-2 px-3 bg-yellow-50 rounded-lg text-sm"
              >
                <div>
                  <p className="font-medium text-yellow-800">{invite.inviteeEmail}</p>
                  <p className="text-yellow-600">Role: {invite.role}</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await deleteDoc(doc(db, 'collaborationInvites', invite.id));
                    } catch (error) {
                      console.error('Error canceling invite:', error);
                    }
                  }}
                  className="text-yellow-800 hover:text-yellow-900"
                >
                  <HiX className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorsSection; 