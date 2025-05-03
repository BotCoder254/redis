import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { HiUsers, HiDocumentText, HiThumbUp, HiChat } from 'react-icons/hi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
  });
  const [viewsData, setViewsData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [engagementData, setEngagementData] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Fetch collaboration invites
    const invitesQuery = query(
      collection(db, 'collaborationInvites'),
      where('inviteeEmail', '==', user.email)
    );

    const invitesUnsubscribe = onSnapshot(invitesQuery, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingInvites(invites);
    });

    // Simplified query to avoid index requirement
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;
      const categoryMap = new Map();
      const viewsOverTime = new Map();
      const engagementMap = new Map();

      // Sort documents by createdAt on the client side
      const sortedDocs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

      sortedDocs.forEach((post) => {
        totalViews += post.views || 0;
        totalLikes += post.likes || 0;
        totalComments += post.comments?.length || 0;

        // Category data
        const category = post.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);

        // Views over time
        const date = post.createdAt.toDate().toLocaleDateString();
        viewsOverTime.set(date, (viewsOverTime.get(date) || 0) + (post.views || 0));

        // Engagement data
        engagementMap.set('Views', totalViews);
        engagementMap.set('Likes', totalLikes);
        engagementMap.set('Comments', totalComments);
      });

      setStats({
        totalPosts: snapshot.size,
        totalViews,
        totalLikes,
        totalComments,
      });

      // Transform and sort data for charts
      const sortedViewsData = Array.from(viewsOverTime.entries())
        .map(([date, views]) => ({ date, views }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setViewsData(sortedViewsData);

      setCategoryData(
        Array.from(categoryMap.entries()).map(([name, value]) => ({
          name,
          value,
        }))
      );

      setEngagementData(
        Array.from(engagementMap.entries()).map(([name, value]) => ({
          name,
          value,
        }))
      );

      setLoading(false);
    });

    return () => {
      invitesUnsubscribe();
      unsubscribe();
    };
  }, [user]);

  const handleInviteResponse = async (invite, accept) => {
    try {
      if (accept) {
        // Add user as collaborator to the post
        const postRef = doc(db, 'posts', invite.postId);
        const postDoc = await getDoc(postRef);
        
        if (!postDoc.exists()) {
          console.error('Post not found');
          return;
        }
        
        // Get current collaborators or initialize empty array
        const currentCollaborators = postDoc.data().collaborators || [];
        
        await updateDoc(postRef, {
          collaborators: [...currentCollaborators, {
            userId: user.uid,
            email: user.email,
            role: invite.role,
            addedAt: serverTimestamp()
          }]
        });

        // Log the activity
        await addDoc(collection(db, 'posts', invite.postId, 'activityLog'), {
          type: 'collaborator_added',
          timestamp: serverTimestamp(),
          userId: user.uid,
          action: `Accepted collaboration invite as ${invite.role}`
        });
      }

      // Delete the invitation
      await deleteDoc(doc(db, 'collaborationInvites', invite.id));
    } catch (error) {
      console.error('Error handling invite:', error);
    }
  };

  const StatCard = ({ icon: Icon, title, value }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg p-6 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-bold mt-2">{value}</h3>
        </div>
        <Icon className="h-8 w-8 text-indigo-500" />
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Collaboration Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h3 className="text-lg font-semibold mb-4">Pending Collaboration Invites</h3>
          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{invite.postTitle}</p>
                  <p className="text-sm text-gray-600">From: {invite.inviterEmail}</p>
                  <p className="text-sm text-gray-600">Role: {invite.role}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleInviteResponse(invite, true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleInviteResponse(invite, false)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={HiDocumentText} title="Total Posts" value={stats.totalPosts} />
        <StatCard icon={HiUsers} title="Total Views" value={stats.totalViews} />
        <StatCard icon={HiThumbUp} title="Total Likes" value={stats.totalLikes} />
        <StatCard icon={HiChat} title="Total Comments" value={stats.totalComments} />
      </div>

      {/* Views Over Time Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Views Over Time</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Posts by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Engagement Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 