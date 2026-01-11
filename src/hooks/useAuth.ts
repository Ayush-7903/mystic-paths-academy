// ============================================
// Authentication Hook
// Centralized auth state management
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService, roleService } from '@/services/api';
import type { AuthState } from '@/types';

interface UseAuthReturn extends AuthState {
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkUserStatus = useCallback(async (userId: string) => {
    try {
      const adminStatus = await roleService.checkAdminRole(userId);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const currentSession = await authService.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        await checkUserStatus(currentSession.user.id);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      setSession(null);
      setUser(null);
      setIsAdmin(false);
    }
  }, [checkUserStatus]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = authService.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer status check to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkUserStatus(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    authService.getSession().then((currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        checkUserStatus(currentSession.user.id);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkUserStatus]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { session: newSession } = await authService.signIn(email, password);
    setSession(newSession);
    setUser(newSession?.user ?? null);
    
    if (newSession?.user) {
      await checkUserStatus(newSession.user.id);
    }
  }, [checkUserStatus]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { session: newSession } = await authService.signUp(email, password, fullName, redirectUrl);
    
    if (newSession) {
      setSession(newSession);
      setUser(newSession.user);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  }, []);

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    signIn,
    signUp,
    signOut,
    refreshAuth,
  };
};
