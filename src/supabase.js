import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fbqjgifqlbjxwtamwzud.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicWpnaWZxbGJqeHd0YW13enVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTQwNDUsImV4cCI6MjA5NDMzMDA0NX0.UE97XA-TbDubZbVlT2lBRNKzh_zZSoHR-bUeTH6vOKw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
