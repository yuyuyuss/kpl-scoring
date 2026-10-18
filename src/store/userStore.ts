import { create } from "zustand";
import { supabase, TABLES } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface UserState {
  user: User | null;
  session: Session | null;
  username: string | null;
  loading: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUsername: (name: string) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  session: null,
  username: null,
  loading: true,

  init: async () => {
    if (!supabase) {
      set({ loading: false });
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null });
    if (session?.user) {
      await loadProfile(session.user.id);
    }
    set({ loading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) loadProfile(session.user.id);
      else set({ username: null });
    });
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error("Supabase 未配置");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },

  signUp: async (email, password, username) => {
    if (!supabase) throw new Error("Supabase 未配置");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from(TABLES.profiles).upsert({
        id: data.user.id,
        username,
      });
      set({ username });
    }
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  setUsername: (name) => set({ username: name }),
}));

async function loadProfile(userId: string) {
  if (!supabase) return;
  const { data } = await supabase
    .from(TABLES.profiles)
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  useUserStore.getState().setUsername(data?.username ?? null);
}
