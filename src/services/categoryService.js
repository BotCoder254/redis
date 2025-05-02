import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  addDoc,
  deleteDoc,
  doc,
  updateDoc 
} from 'firebase/firestore';

// Categories
export const getCategories = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const addCategory = async (categoryData) => {
  try {
    const docRef = await addDoc(collection(db, 'categories'), {
      name: categoryData.name,
      description: categoryData.description,
      createdAt: new Date(),
      postCount: 0
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

// Tags
export const getTags = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'tags'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
};

export const addTag = async (tagData) => {
  try {
    const docRef = await addDoc(collection(db, 'tags'), {
      name: tagData.name,
      createdAt: new Date(),
      postCount: 0
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding tag:', error);
    throw error;
  }
};

// Update post counts
export const updateCategoryPostCount = async (categoryId, increment = true) => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, {
      postCount: increment ? increment('postCount', 1) : increment('postCount', -1)
    });
  } catch (error) {
    console.error('Error updating category post count:', error);
  }
};

export const updateTagPostCount = async (tagId, increment = true) => {
  try {
    const tagRef = doc(db, 'tags', tagId);
    await updateDoc(tagRef, {
      postCount: increment ? increment('postCount', 1) : increment('postCount', -1)
    });
  } catch (error) {
    console.error('Error updating tag post count:', error);
  }
}; 