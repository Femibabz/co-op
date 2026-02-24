'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginSession } from '@/types';
import { db } from '@/lib/mock-data';
import { detectDevice } from '@/lib/device-detection';
import { getLocationInfo } from '@/lib/location-service';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  currentSessionId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('osuolale_user');
    const storedSessionId = localStorage.getItem('osuolale_current_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedSessionId) {
      setCurrentSessionId(storedSessionId);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const foundUser = await db.findUserByEmail(email);

    if (foundUser && foundUser.password === password) {
      // Check if society is suspended (if applicable)
      if (foundUser.societyId) {
        const society = db.getSocietyById(foundUser.societyId);
        if (society && society.status === 'suspended') {
          throw new Error('Your society has been suspended. Please contact the platform administrator.');
        }
      }

      // Only track sessions for admin users
      const shouldTrackSession = foundUser.role === 'admin' || foundUser.role === 'super_admin';

      if (shouldTrackSession) {
        try {
          // Detect device information
          const deviceInfo = detectDevice();

          // Get location information
          const locationInfo = await getLocationInfo();

          // Create login session for admins only
          const loginSession = await db.createLoginSession({
            userId: foundUser.id,
            userEmail: foundUser.email,
            userRole: foundUser.role,
            societyId: foundUser.societyId,
            loginTime: new Date(),
            deviceInfo,
            locationInfo,
            sessionActive: true,
          });

          setUser(foundUser);
          setCurrentSessionId(loginSession.id);
          localStorage.setItem('osuolale_user', JSON.stringify(foundUser));
          localStorage.setItem('osuolale_current_session', loginSession.id);

          return true;
        } catch (error) {
          console.error('Error creating login session:', error);
          // Still allow login even if session tracking fails
          setUser(foundUser);
          localStorage.setItem('osuolale_user', JSON.stringify(foundUser));
          return true;
        }
      } else {
        // For regular members, just login without session tracking
        setUser(foundUser);
        localStorage.setItem('osuolale_user', JSON.stringify(foundUser));
        return true;
      }
    }

    return false;
  };

  const logout = () => {
    // End the current session (only exists for admin users)
    if (currentSessionId) {
      db.endLoginSession(currentSessionId);
      localStorage.removeItem('osuolale_current_session');
    }

    setUser(null);
    setCurrentSessionId(null);
    localStorage.removeItem('osuolale_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, currentSessionId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
