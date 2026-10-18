// Runtime config — values come from Vite env vars (see .env.example)
export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  // Cloudflare Worker proxy base URL, e.g. https://kpl-proxy.<your-sub>.workers.dev
  kplProxyUrl: (import.meta.env.VITE_KPL_PROXY_URL as string) || "",
};

export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey,
);
