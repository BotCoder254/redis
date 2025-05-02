import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

const useBookmark = (postId) => {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !postId) {
      setIsBookmarked(false);
      setLoading(false);
      return;
    }

    let unsubscribe;
    try {
      const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
      const bookmarkDoc = doc(bookmarksRef, postId);

      unsubscribe = onSnapshot(bookmarkDoc, 
        (doc) => {
          setIsBookmarked(doc.exists());
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to bookmark:', error);
          setIsBookmarked(false);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error setting up bookmark listener:', error);
      setIsBookmarked(false);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, postId]);

  const toggleBookmark = async () => {
    if (!user || !postId) {
      throw new Error('User must be logged in to bookmark posts');
    }

    try {
      const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
      const bookmarkDoc = doc(bookmarksRef, postId);

      if (isBookmarked) {
        await deleteDoc(bookmarkDoc);
      } else {
        await setDoc(bookmarkDoc, {
          postId,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      throw error; // Re-throw to let the component handle the error
    }
  };

  return { isBookmarked, loading, toggleBookmark };
};

export default useBookmark;