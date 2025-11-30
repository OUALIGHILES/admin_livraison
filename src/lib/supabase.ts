import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create single instances to prevent multiple GoTrueClient instances
const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);

const supabaseServiceInstance = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : supabaseInstance; // Fallback to regular client if service role key is not available

export const supabase = supabaseInstance;

// Service role client for operations that bypass RLS
export const supabaseService = supabaseServiceInstance;
