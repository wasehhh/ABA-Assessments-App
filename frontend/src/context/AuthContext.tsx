import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, orgName: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  signOut: () => Promise<void>;
  debugSetRole: (role: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (mounted) setUser(currentUser);

        if (currentUser) {
          try {
            const userProfile = await authService.getUserProfile(currentUser.id);
            if (mounted) setProfile(userProfile);
          } catch (err) {
            console.error('Failed to load profile:', err);
            // Don't fail the whole app for profile load failure, just log it.
            // But if it's a critical auth error, we might want to know.
          }
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (mounted) setError(err.message || 'Failed to initialize authentication');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!mounted) return;

      (async () => {
        if (session?.user) {
          setUser(session.user);
          try {
            const userProfile = await authService.getUserProfile(session.user.id);
            if (mounted) setProfile(userProfile);
          } catch (err) {
            console.error('Failed to load profile on auth change:', err);
            if (mounted) setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { session } = await authService.signIn(email, password);
    if (session?.user) {
      const userProfile = await authService.getUserProfile(session.user.id);
      setProfile(userProfile);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, orgName: string) => {
    const response = await authService.signUp(
      email,
      password,
      fullName,
      orgName
    );

    if (response.message) {
      return { success: true, message: response.message };
    }

    if (response.user && response.profile) {
      setUser(response.user);
      setProfile(response.profile);
    }

    return { success: true };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
  };

  const debugSetRole = (role: string) => {
    if (profile) {
      setProfile({ ...profile, role: role as any });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await authService.getUserProfile(user.id);
      setProfile(userProfile);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, signUp, signOut, debugSetRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
