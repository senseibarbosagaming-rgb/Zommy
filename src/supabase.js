import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fbqjgifqlbjxwtamwzud.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    persistSession: true,
    autoRefreshToken: true,
  },
})
