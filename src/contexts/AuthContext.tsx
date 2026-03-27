'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginSession } from '@/types';
import { db } from '@/lib/mock-data';
import { detectDevice } from '@/lib/device-detection';
import { getLocationInfo } from '@/lib/location-service';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  currentSessionId: string | null;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('coopkonnect_user');
    const storedSessionId = localStorage.getItem('coopkonnect_current_session');
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
        const society = await db.getSocietyById(foundUser.societyId);
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
          localStorage.setItem('coopkonnect_user', JSON.stringify(foundUser));
          localStorage.setItem('coopkonnect_current_session', loginSession.id);

          localStorage.setItem('coopkonnect_user', JSON.stringify(foundUser));
          return true;
        } catch (error) {
          console.error('Error creating login session:', error);
          // Still allow login even if session tracking fails
          setUser(foundUser);
          localStorage.setItem('coopkonnect_user', JSON.stringify(foundUser));
          return true;
        }
      } else {
        // For regular members, just login without session tracking
        setUser(foundUser);
        localStorage.setItem('coopkonnect_user', JSON.stringify(foundUser));
        return true;
      }
    }

    return false;
  };

  const logout = async () => {
    // End the current session (only exists for admin users)
    if (currentSessionId) {
      await db.endLoginSession(currentSessionId);
      localStorage.removeItem('coopkonnect_current_session');
    }

    setUser(null);
    setCurrentSessionId(null);
    localStorage.removeItem('coopkonnect_user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('coopkonnect_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, currentSessionId, updateUser }}>
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
