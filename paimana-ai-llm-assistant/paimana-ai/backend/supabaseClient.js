import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

const isConfigured = Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://'));

const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : {
      from: () => ({
        select: () =>
          Promise.resolve({
            data: null,
            error: new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.'),
          }),
        upsert: () =>
          Promise.resolve({
            data: null,
            error: new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.'),
          }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
    };

export default supabase;