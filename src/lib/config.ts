/**
 * Supabase connection details.
 *
 * The anon key is a *public* key. It is designed to ship inside client apps,
 * and every request it makes is still filtered by Row Level Security, which
 * requires a signed-in session. It is not a secret and committing it is the
 * intended usage. The database password is a different thing entirely and must
 * never appear in this repository.
 *
 * Override either value at build time with VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY if you ever point the app at another project.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://jhkctlmrcmjohkrisyjc.supabase.co';

export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = SUPABASE_ANON_KEY.length > 40;
