import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

export const addComment = async (postId, commentData, parentId = null) => {
  try {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const newComment = {
      ...commentData,
      parentId,
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: []
    };
    
    const docRef = await addDoc(commentsRef, newComment);
    return docRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getComments = async (postId) => {
  try {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toLocaleString()
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const deleteComment = async (postId, commentId) => {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await deleteDoc(commentRef);
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const likeComment = async (postId, commentId, userId) => {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await updateDoc(commentRef, {
      likes: increment(1),
      likedBy: arrayUnion(userId)
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    throw error;
  }
};

export const unlikeComment = async (postId, commentId, userId) => {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await updateDoc(commentRef, {
      likes: increment(-1),
      likedBy: arrayRemove(userId)
    });
  } catch (error) {
    console.error('Error unliking comment:', error);
    throw error;
  }
}; 