import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { auth } from '@/utils/firebase';
import { UserProfile } from '@/types';

/**
 * Sign up a new user
 */
export const signUp = async (
  email: string,
  password: string,
  displayName?: string
): Promise<FirebaseUser> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthState = (
  callback: (user: FirebaseUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get the current user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/** Reauthenticate the signed-in user immediately before deleting their account. */
export const reauthenticateCurrentUser = async (password?: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No signed-in user found.');

  const providerIds = user.providerData.map((provider) => provider.providerId);
  if (providerIds.includes('password')) {
    if (!password) throw new Error('Enter your password to delete this account.');
    const credential = EmailAuthProvider.credential(user.email || '', password);
    await reauthenticateWithCredential(user, credential);
    return;
  }

  if (providerIds.includes('google.com')) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    return;
  }

  throw new Error('Sign in again with your original provider before deleting this account.');
};

export const deleteAuthenticatedUser = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('No signed-in user found.');
  await deleteUser(user);
};

/**
 * Convert Firebase user to app UserProfile type
 */
export const convertFirebaseUserToAppUser = (firebaseUser: FirebaseUser): UserProfile => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '',
    createdAt: new Date(firebaseUser.metadata.creationTime || ''),
    updatedAt: new Date(),
  };
};
