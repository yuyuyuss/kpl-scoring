import { createClient } from "@supabase/supabase-js";
import { config, isSupabaseConfigured } from "@/config";

// 单例 Supabase 客户端
export const supabase = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null;

// 表名常量
export const TABLES = {
  profiles: "profiles",
  predictions: "predictions",
  ratings: "ratings",
  ratingLikes: "rating_likes",
  teamCoaches: "team_coaches",
} as const;
