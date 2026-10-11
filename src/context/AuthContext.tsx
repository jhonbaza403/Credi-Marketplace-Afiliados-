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

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/user";

export type { UserRole };

export interface Profile {
  id: string;
  email?: string | null;

  fullName?: string | null;
  full_name?: string | null;

  avatarUrl?: string | null;
  avatar_url?: string | null;

  role: UserRole;

  isActive?: boolean;
  is_active?: boolean;

  createdAt?: string;
  created_at?: string;

  updatedAt?: string;
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

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

function isMissingAuthSession(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; name?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const name = typeof candidate.name === "string" ? candidate.name.toLowerCase() : "";
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  return (
    name === "authsessionmissingerror" ||
    code === "session_not_found" ||
    message.includes("auth session missing") ||
    message.includes("session missing")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(
        [
          "id",
          "email",
          "full_name",
          "avatar_url",
          "role",
          "is_active",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error cargando perfil:", error.message);
      setProfile(null);
      return;
    }

    if (!data) {
      setProfile(null);
      return;
    }

    type ProfileRow = {
      id: string;
      email: string | null;
      full_name: string | null;
      avatar_url: string | null;
      role: UserRole;
      is_active: boolean | null;
      created_at: string | null;
      updated_at: string | null;
    };

    const row = data as unknown as ProfileRow;

    const nextProfile: Profile = {
      id: row.id,
      email: row.email ?? null,
      fullName: row.full_name ?? null,
      full_name: row.full_name ?? null,
      avatarUrl: row.avatar_url ?? null,
      avatar_url: row.avatar_url ?? null,
      role: row.role,
      isActive: row.is_active ?? true,
      is_active: row.is_active ?? true,
      createdAt: row.created_at ?? undefined,
      created_at: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      updated_at: row.updated_at ?? undefined,
    };

    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function initialize() {
      try {
        // An unauthenticated visitor is a normal state on public routes.
        // Read the local session first so Supabase's AuthSessionMissingError
        // does not produce a misleading initialization error on every page.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessionError) throw sessionError;

        let currentUser = sessionData.session?.user ?? null;
        if (currentUser) {
          const { data, error } = await supabase.auth.getUser();

          // A session can expire between getSession() and getUser(). Treat that
          // race exactly like a signed-out visitor instead of breaking the public
          // route or logging an expected authentication state as an error.
          if (error && isMissingAuthSession(error)) {
            currentUser = null;
          } else if (error) {
            throw error;
          } else {
            currentUser = data.user ?? null;
          }
        }

        if (!mounted) return;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        if (isMissingAuthSession(error)) {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
          return;
        }

        console.error("Error inicializando autenticación:", error);

        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    const { data: authState } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          void loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      },
    );

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

    if (error) {
      console.error("Error cerrando sesión:", error.message);
      throw error;
    }

    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      isAdmin,
      hasRole,
      logout,
    }),
    [user, profile, loading, isAdmin, hasRole, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider",
    );
  }

  return context;
}
