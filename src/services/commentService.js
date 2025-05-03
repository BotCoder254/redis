import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs,
  getDoc,
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

export const addComment = async (postId, commentData) => {
  try {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const newComment = {
      ...commentData,
      likes: [],
      likedBy: [],
      replies: [],
      depth: commentData.parentId ? 1 : 0,
      path: [],
      createdAt: serverTimestamp()
    };

    if (commentData.parentId) {
      const parentRef = doc(db, 'posts', postId, 'comments', commentData.parentId);
      const parentDoc = await getDoc(parentRef);
      
      if (parentDoc.exists()) {
        const parentData = parentDoc.data();
        newComment.depth = (parentData.depth || 0) + 1;
        newComment.path = [...(parentData.path || []), commentData.parentId];
      }
    }

    const docRef = await addDoc(commentsRef, newComment);
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
    const snapshot = await getDocs(q);
    
    const comments = {};
    snapshot.docs.forEach(doc => {
      comments[doc.id] = {
        id: doc.id,
        ...doc.data(),
        replies: [],
        createdAt: doc.data().createdAt?.toDate()
      };
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
        
        // Sort replies by timestamp
        comments[comment.parentId].replies.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateA - dateB;
        });
      }
    });

    // Sort root comments by timestamp
    commentTree.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB - dateA;
    });

    return commentTree;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

export const deleteComment = async (postId, commentId) => {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await updateDoc(commentRef, {
      _isDeleted: true,
      content: '[Deleted]',
      authorName: '[Deleted]',
      authorImage: null
    });
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
    await updateDoc(commentRef, { isExpanded });
  } catch (error) {
    console.error('Error toggling comment expansion:', error);
    throw error;
  }
}; 