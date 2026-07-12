import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Enforce strict runtime singleton to prevent GoTrueClient duplicate warnings
const globalInstanceKey = Symbol.for('supabase.client.instance');
if (!(globalThis as any)[globalInstanceKey]) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing in environment.');
  }
  (globalThis as any)[globalInstanceKey] = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = (globalThis as any)[globalInstanceKey];
