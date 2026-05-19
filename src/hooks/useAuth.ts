import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const TEST_AUTH_KEY = "quant:test-auth-user";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isTestMode: boolean;
}

interface AuthResult {
  error?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const allowTestAuth = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_AUTH === "true" || params.has("testAuth");
  }, []);

  useEffect(() => {
    const savedTestUser = localStorage.getItem(TEST_AUTH_KEY);
    if (savedTestUser) {
      setUser(JSON.parse(savedTestUser) as AuthUser);
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser) {
        setUser({
          id: sessionUser.id,
          email: sessionUser.email ?? "quant-user",
          displayName: sessionUser.user_metadata.display_name ?? sessionUser.email?.split("@")[0] ?? "Quant trainee",
          isTestMode: false
        });
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUser(
        sessionUser
          ? {
              id: sessionUser.id,
              email: sessionUser.email ?? "quant-user",
              displayName: sessionUser.user_metadata.display_name ?? sessionUser.email?.split("@")[0] ?? "Quant trainee",
              isTestMode: false
            }
          : null
      );
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Supabase is not configured. Use test mode locally." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Supabase is not configured. Use test mode locally." };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: email.split("@")[0] } }
    });
    if (!error) {
      await supabase.auth.signInWithPassword({ email, password });
    }
    return { error: error?.message };
  }, []);

  const signInTestMode = useCallback(() => {
    const testUser: AuthUser = {
      id: "local-test-user",
      email: "test@quant.local",
      displayName: "Test trainee",
      isTestMode: true
    };
    localStorage.setItem(TEST_AUTH_KEY, JSON.stringify(testUser));
    setUser(testUser);
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(TEST_AUTH_KEY);
    if (isSupabaseConfigured) await supabase?.auth.signOut();
    setUser(null);
  }, []);

  return { user, loading, signIn, signUp, signInTestMode, signOut, allowTestAuth };
}
