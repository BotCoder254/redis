import React, { useState } from 'react';
import { HiBookmark, HiOutlineBookmark } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import useBookmark from '../../hooks/useBookmark';
import { useAuth } from '../../context/AuthContext';

const BookmarkButton = ({ postId, className = '', showText = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isBookmarked, loading, toggleBookmark } = useBookmark(postId);
  const [isToggling, setIsToggling] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    if (isToggling || loading) return;

    try {
      setIsToggling(true);
      await toggleBookmark();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <button className={`flex items-center ${className}`} disabled>
        <div className="h-4 w-4 animate-pulse bg-gray-200 rounded-full"></div>
        {showText && <span className="ml-1">Loading...</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center ${className} ${isToggling ? 'opacity-50' : ''}`}
      disabled={isToggling}
      title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
      {isBookmarked ? (
        <HiBookmark className="h-4 w-4" />
      ) : (
        <HiOutlineBookmark className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-1">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </button>
  );
};

export default BookmarkButton; 