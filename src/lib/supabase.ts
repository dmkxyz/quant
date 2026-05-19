import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("<project-ref>") &&
    !supabaseAnonKey.includes("replace-with") &&
    supabaseUrl.startsWith("https://")
);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;

export function providerStatusLabel(): string {
  return isSupabaseConfigured ? "Supabase connected" : "Local demo mode";
}
