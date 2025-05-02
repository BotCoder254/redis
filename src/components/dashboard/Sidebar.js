import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineDocumentAdd,
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiOutlineChatAlt,
  HiOutlineMenu,
  HiOutlineX,
  HiBookmark,
} from 'react-icons/hi';

const menuItems = [
  { path: '/dashboard/new-post', icon: HiOutlineDocumentAdd, label: 'New Post' },
  { path: '/dashboard/my-posts', icon: HiOutlineDocumentText, label: 'My Posts' },
  { path: '/dashboard/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
  { path: '/dashboard/comments', icon: HiOutlineChatAlt, label: 'Comments' },
  { path: '/dashboard/bookmarks', icon: HiBookmark, label: 'Bookmarks' },
];

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const location = useLocation();

  return (
    <motion.div
      initial={{ width: isCollapsed ? 80 : 250 }}
      animate={{ width: isCollapsed ? 80 : 250 }}
      transition={{ duration: 0.3 }}
      className="h-screen bg-white border-r border-gray-200 fixed left-0 top-0 z-30"
    >
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && (
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl font-bold text-gray-900"
          >
            Dashboard
          </motion.h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {isCollapsed ? (
            <HiOutlineMenu className="h-6 w-6 text-gray-600" />
          ) : (
            <HiOutlineX className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      <nav className="mt-8">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-6 w-6" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="ml-3 font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>
    </motion.div>
  );
};

export default Sidebar; 