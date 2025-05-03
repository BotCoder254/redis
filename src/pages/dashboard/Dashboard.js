import React from 'react';
import { Link } from 'react-router-dom';
import { HiPencil, HiBookmark } from 'react-icons/hi';
import MyPosts from './MyPosts';
import CollaborationInvites from './CollaborationInvites';

const Dashboard = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <MyPosts />
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
              <div className="mt-6 grid grid-cols-1 gap-4">
                <Link
                  to="/dashboard/new-post"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <HiPencil className="h-5 w-5 mr-2" />
                  Write New Post
                </Link>
                <Link
                  to="/dashboard/bookmarks"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <HiBookmark className="h-5 w-5 mr-2" />
                  View Bookmarks
                </Link>
              </div>
            </div>
          </div>

          {/* Collaboration Invites */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <CollaborationInvites />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 