import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HiUserAdd, 
  HiUserRemove, 
  HiPencil, 
  HiRefresh, 
  HiClock,
  HiUserGroup
} from 'react-icons/hi';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';

const ActivityLog = ({ postId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    const activityRef = collection(db, 'posts', postId, 'activityLog');
    const q = query(activityRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activityData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setActivities(activityData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'collaborator_added':
        return <HiUserAdd className="h-5 w-5 text-green-500" />;
      case 'collaborator_removed':
        return <HiUserRemove className="h-5 w-5 text-red-500" />;
      case 'role_updated':
        return <HiRefresh className="h-5 w-5 text-blue-500" />;
      case 'content_edited':
        return <HiPencil className="h-5 w-5 text-indigo-500" />;
      default:
        return <HiUserGroup className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActivityMessage = (activity) => {
    switch (activity.type) {
      case 'collaborator_added':
        return `Added ${activity.targetEmail || 'a collaborator'} as ${activity.role}`;
      case 'collaborator_removed':
        return `Removed ${activity.targetEmail || 'a collaborator'}`;
      case 'role_updated':
        return `Updated role to ${activity.newRole}`;
      case 'content_edited':
        return `Made changes to the post`;
      default:
        return 'Unknown activity';
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
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Activity Log</h3>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {activities.map((activity) => (
            <motion.li
              key={activity.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-4"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {getActivityMessage(activity)}
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <HiClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    <span>
                      {activity.timestamp?.toLocaleString() || 'Unknown time'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.li>
          ))}

          {activities.length === 0 && (
            <li className="px-4 py-6 text-center text-gray-500">
              No activity yet
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ActivityLog; 