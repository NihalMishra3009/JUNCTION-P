"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthUser, AuthContextType } from "@/types/auth";
import { findUserByCredentials, MOCK_DEMO_USERS } from "@/data/mockUsers";

const SESSION_STORAGE_KEY = "junction_auth_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from sessionStorage on client mount (defaulting to demo organizer if empty)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AuthUser;
          if (parsed && parsed.id && parsed.role) {
            setCurrentUser(parsed);
          } else {
            setCurrentUser(MOCK_DEMO_USERS[0] as AuthUser);
          }
        } else {
          setCurrentUser(MOCK_DEMO_USERS[0] as AuthUser);
        }
      }
    } catch {
      setCurrentUser(MOCK_DEMO_USERS[0] as AuthUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password?: string) => {
    const user = findUserByCredentials(username, password);
    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      propertyId: user.propertyId,
      defaultRoute: user.defaultRoute,
    };

    setCurrentUser(authUser);

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
      }
    } catch {
      // Ignore
    }

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
