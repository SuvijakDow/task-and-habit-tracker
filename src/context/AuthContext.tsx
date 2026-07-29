import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ensureUserProfile, getUserProfile } from '@/services/userService';
import { UserProfile } from '@/types';
import { applyAppFont } from '@/utils/fontUtils';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const { subscribeToAuthState } = await import('@/services/authService');
        if (cancelled) return;

        unsub = subscribeToAuthState(async (authUser: any) => {
          setUser(authUser);

          if (authUser) {
            try {
              // Ensure the Firestore profile exists (creates on first login)
              const profile = await ensureUserProfile(authUser);
              setUserProfile(profile);
              if (profile?.selectedFont) {
                applyAppFont(profile.selectedFont);
              }
            } catch (error) {
              console.error('Error syncing user profile:', error);
              setUserProfile(null);
            }
          } else {
            setUserProfile(null);
          }

          setLoading(false);
        });
      } catch (err) {
        console.error('Failed to load auth service:', err);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      const updated = await getUserProfile(user.uid);
      if (updated) {
        setUserProfile(updated);
        if (updated.selectedFont) {
          applyAppFont(updated.selectedFont);
        }
      }
    } catch (err) {
      console.error('Error refreshing user profile:', err);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
