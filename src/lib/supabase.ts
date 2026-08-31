import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/** The session is kept in localStorage, so signing in once per phone is enough. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'anon-key-not-set', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
