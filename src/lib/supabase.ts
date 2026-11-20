import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export const altarAdminUrl = `${supabaseUrl}/functions/v1/altar-admin`;

export type AltarEntry = {
  id: string;
  uid_suffix: string;
  constellation: number;
  refinement: number;
  icon: string;
  avatar_url: string | null;
  message: string | null;
  created_at: string;
};
