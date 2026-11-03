"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { login, logout, onSessionChange, refreshSession } from "./api";
import type { Me, Module } from "./types";

type Status = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: Me | null;
  status: Status;
  can: (module: Module, action?: "read" | "write") => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: Me) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Me | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    onSessionChange((next) => {
      setUserState(next);
      setStatus(next ? "authenticated" : "anonymous");
    });
    void refreshSession();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const me = await login(email, password);
    setUserState(me);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await logout();
  }, []);

  const setUser = useCallback((next: Me) => setUserState(next), []);

  const can = useCallback(
    (module: Module, action: "read" | "write" = "read") => Boolean(user?.permissions?.[module]?.[action]),
    [user],
  );

  const value = useMemo(() => ({ user, status, can, signIn, signOut, setUser }), [user, status, can, signIn, signOut, setUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
