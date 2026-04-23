import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '@/utils/firebase';
import { UserProfile } from '@/types';
import { ensureDefaultCategories } from '@/services/categoryService';

const USERS_COLLECTION = 'users';

/**
 * 8 cute default avatars using DiceBear styles
 * Mix of fun-emoji (cute expressive faces) and lorelei (soft illustrated portraits)
 */
export const DEFAULT_AVATARS = [
  // fun-emoji — colorful, cute, Google-like
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Bella&mouth=cute,kissHeart,lilSmile,smileLol,tongueOut,wideSmile',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Coco&mouth=cute,kissHeart,lilSmile,smileLol,tongueOut,wideSmile',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Mimi&mouth=cute,kissHeart,lilSmile,smileLol,tongueOut,wideSmile',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Sunny&mouth=cute,kissHeart,lilSmile,smileLol,tongueOut,wideSmile',
  // lorelei — soft, clean, minimal illustrations
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Peanut',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Muffin',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Cookie',
  'https://api.dicebear.com/9.x/lorelei/svg?seed=Pepper',
];

/**
 * Get a user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      uid: docSnap.id,
      email: data.email || '',
      displayName: data.displayName || '',
      photoURL: data.photoURL || '',
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  uid: string,
  data: { email: string; displayName: string; photoURL: string }
): Promise<UserProfile> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const now = Timestamp.now();

    await setDoc(docRef, {
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      createdAt: now,
      updatedAt: now,
    });

    return {
      uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Update (or create) a user profile in Firestore.
 * Uses merge to work even if the document doesn't exist yet.
 */
export const updateUserProfile = async (
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL'>>
): Promise<void> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Process a profile photo: resize to 200×200, compress to JPEG,
 * and return a base64 data URL that can be stored directly in Firestore.
 * No Firebase Storage needed — avoids CORS issues entirely.
 */
export const uploadProfilePhoto = async (
  _uid: string,
  file: File
): Promise<string> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB raw input)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Image must be smaller than 5MB');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const SIZE = 200;
          canvas.width = SIZE;
          canvas.height = SIZE;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not create canvas context'));
            return;
          }

          // Center-crop: use the largest square from the source
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE);

          // Compress to JPEG at 80% quality (~15-30KB for 200×200)
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Ensure a user profile exists in Firestore.
 * Called on every auth state change — if the doc doesn't exist yet (first login),
 * it creates one using data from Firebase Auth.
 * Google users get their Google photo; email users get a random DiceBear avatar.
 */
export const ensureUserProfile = async (
  firebaseUser: FirebaseUser
): Promise<UserProfile> => {
  const syncDefaultCategories = async () => {
    try {
      await ensureDefaultCategories(firebaseUser.uid);
    } catch (error) {
      // Categories should not block sign-in/profile initialization.
      console.error('Error syncing default categories:', error);
    }
  };

  try {
    const existing = await getUserProfile(firebaseUser.uid);
    if (existing) {
      await syncDefaultCategories();
      return existing;
    }

    // First-time login — pick the right avatar
    const photoURL =
      firebaseUser.photoURL ||
      DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

    const profile = await createUserProfile(firebaseUser.uid, {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      photoURL,
    });

    await syncDefaultCategories();

    return profile;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    throw error;
  }
};
