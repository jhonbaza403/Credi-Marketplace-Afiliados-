"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/user";

export type { UserRole };

export interface Profile {
  id: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  hasRole: (role: UserRole) => boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,role,is_active,created_at,updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("Error cargando perfil:", error.message);
      setProfile(null);
      return;
    }

    setProfile({
      id: data.id,
      email: data.email ?? null,
      fullName: data.full_name ?? null,
      avatarUrl: data.avatar_url ?? null,
      role: data.role as UserRole,
      isActive: data.is_active ?? true,
      createdAt: data.created_at ?? undefined,
      updatedAt: data.updated_at ?? undefined,
      full_name: data.full_name ?? null,
      avatar_url: data.avatar_url ?? null,
      created_at: data.created_at ?? undefined,
      updated_at: data.updated_at ?? undefined,
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const initialize = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!mounted) return;

        const currentUser = data.user ?? null;
        setUser(currentUser);
        if (currentUser) await loadProfile(currentUser.id);
        else setProfile(null);
      } catch (error) {
        console.error("Error inicializando autenticación:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void initialize();

    const { data: authState } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) void loadProfile(currentUser.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      authState.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const isAdmin = profile?.role === "admin";

  const hasRole = useCallback(
    (role: UserRole) => profile?.role === role || isAdmin,
    [profile?.role, isAdmin],
  );

  const logout = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, profile, loading, isAdmin, hasRole, logout }),
    [user, profile, loading, isAdmin, hasRole, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }
  return context;
}
