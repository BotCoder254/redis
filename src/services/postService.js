import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { updateCategoryPostCount, updateTagPostCount } from './categoryService';

export const createPost = async (postData) => {
  try {
    // Create the post
    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      createdAt: new Date(),
      views: 0,
      likes: 0,
      comments: []
    });

    // Update category post count
    if (postData.category) {
      await updateCategoryPostCount(postData.category, true);
    }

    // Update tag post counts
    if (postData.tags && postData.tags.length > 0) {
      await Promise.all(
        postData.tags.map(tagId => updateTagPostCount(tagId, true))
      );
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

export const updatePostCategory = async (postId, oldCategoryId, newCategoryId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      category: newCategoryId
    });

    // Update category post counts
    if (oldCategoryId) {
      await updateCategoryPostCount(oldCategoryId, false);
    }
    if (newCategoryId) {
      await updateCategoryPostCount(newCategoryId, true);
    }
  } catch (error) {
    console.error('Error updating post category:', error);
    throw error;
  }
};

export const addPostTag = async (postId, tagId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      tags: arrayUnion(tagId)
    });
    await updateTagPostCount(tagId, true);
  } catch (error) {
    console.error('Error adding post tag:', error);
    throw error;
  }
};

export const removePostTag = async (postId, tagId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      tags: arrayRemove(tagId)
    });
    await updateTagPostCount(tagId, false);
  } catch (error) {
    console.error('Error removing post tag:', error);
    throw error;
  }
};

export const getPostsByCategory = async (categoryId) => {
  try {
    const q = query(
      collection(db, 'posts'),
      where('category', '==', categoryId),
      where('status', '==', 'published')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    return [];
  }
};

export const getPostsByTags = async (tagIds) => {
  try {
    const q = query(
      collection(db, 'posts'),
      where('tags', 'array-contains-any', tagIds),
      where('status', '==', 'published')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching posts by tags:', error);
    return [];
  }
}; 