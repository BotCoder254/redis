import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

export const addComment = async (postId, commentData, parentId = null) => {
  try {
    const commentRef = collection(db, 'posts', postId, 'comments');
    const newComment = {
      ...commentData,
      parentId,
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      replies: [],
      isExpanded: true
    };
    const docRef = await addDoc(commentRef, newComment);
    return { id: docRef.id, ...newComment };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getComments = async (postId) => {
  try {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const comments = {};
    querySnapshot.docs.forEach(doc => {
      comments[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Build comment tree
    const commentTree = [];
    Object.values(comments).forEach(comment => {
      if (!comment.parentId) {
        commentTree.push(comment);
      } else if (comments[comment.parentId]) {
        if (!comments[comment.parentId].replies) {
          comments[comment.parentId].replies = [];
        }
        comments[comment.parentId].replies.push(comment);
      }
    });

    return commentTree;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

export const deleteComment = async (postId, commentId) => {
  try {
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const likeComment = async (postId, commentId, userId) => {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await updateDoc(commentRef, {
      likes: arrayUnion(userId),
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
      likes: arrayRemove(userId),
      likedBy: arrayRemove(userId)
    });
  } catch (error) {
    console.error('Error unliking comment:', error);
    throw error;
  }
};

export const toggleCommentExpansion = async (postId, commentId, isExpanded) => {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await updateDoc(commentRef, {
      isExpanded
    });
  } catch (error) {
    console.error('Error toggling comment expansion:', error);
    throw error;
  }
}; 