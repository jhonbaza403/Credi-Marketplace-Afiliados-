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

export const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined,
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const loadProfile = useCallback(
    async (userId: string) => {
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
        console.error(
          "Error cargando perfil:",
          error.message,
        );

        setProfile(null);
        return;
      }

      if (!data) {
        setProfile(null);
        return;
      }

      const nextProfile: Profile = {
        id: data.id,
        email: data.email ?? null,

        fullName: data.full_name ?? null,
        full_name: data.full_name ?? null,

        avatarUrl: data.avatar_url ?? null,
        avatar_url: data.avatar_url ?? null,

        role: data.role as UserRole,

        isActive: data.is_active ?? true,
        is_active: data.is_active ?? true,

        createdAt: data.created_at ?? undefined,
        created_at: data.created_at ?? undefined,

        updatedAt: data.updated_at ?? undefined,
        updated_at: data.updated_at ?? undefined,
      };

      setProfile(nextProfile);
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const supabase = createClient();

    async function initialize() {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (error) {
          throw error;
        }

        const currentUser =
          data.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(
          "Error inicializando autenticación:",
          error,
        );

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

    const {
      data: authState,
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

          const currentUser =
            session?.user ?? null;

          setUser(currentUser);

          if (currentUser) {
            void loadProfile(
              currentUser.id,
            );
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

  const isAdmin =
    profile?.role === "admin";

  const hasRole = useCallback(
    (role: UserRole) =>
      profile?.role === role || isAdmin,
    [profile?.role, isAdmin],
  );

  const logout = useCallback(async () => {
    const supabase = createClient();

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Error cerrando sesión:",
        error.message,
      );

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
    [
      user,
      profile,
      loading,
      isAdmin,
      hasRole,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider",
    );
  }

  return context;
}
```
