import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { capacitorStorage } from '@/lib/capacitorStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qcnhusvxygyczbnmbyvd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbmh1c3Z4eWd5Y3pibm1ieXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzg0NTAsImV4cCI6MjA5Nzc1NDQ1MH0.sQJL5eJkI706OwjtUcmr3R1yaT_VaOyEkV7b-Ljrqyk";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: capacitorStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});