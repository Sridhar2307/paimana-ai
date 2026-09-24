import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

// Singleton pattern to prevent "Multiple GoTrueClient instances detected" warning during Vite HMR
export const supabase =
  globalThis.__supabaseInstance ||
  (globalThis.__supabaseInstance = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        from: () => ({
          select: () =>
            Promise.resolve({
              data: null,
              error: new Error('Supabase cloud service not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'),
            }),
          order: () => ({
            limit: () =>
              Promise.resolve({
                data: null,
                error: new Error('Supabase cloud service not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'),
              }),
          }),
        }),
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        },
      });
