import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client (uses anon key, limited access)
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client (uses service role key, full access)
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types
export interface Business {
  id: number
  business_name: string
  business_type: string
  owner_name: string
  whatsapp: string
  email: string
  automations: string[]
  status: 'pending' | 'contacted' | 'onboarded' | 'active'
  created_at: string
  updated_at?: string
  notes?: string
}

export interface User {
  id: number
  wa_id: string
  phone: string
  first_seen_at: string
  last_active_at: string
  is_blocked: boolean
}

export interface Order {
  id: number
  order_number: string
  user_id: number
  wa_id: string
  customer_phone: string
  item_id: string
  item_name: string
  item_price: number
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  created_at: string
}

export interface MenuItem {
  id: number
  item_id: string
  name: string
  description?: string
  price: number
  is_available: boolean
  sort_order: number
}

export interface Lead {
  id: number
  wa_id: string
  phone: string
  name?: string
  source: string
  captured_at: string
  status: 'new' | 'contacted' | 'qualified' | 'converted'
  notes?: string
}

export interface MessageLog {
  id: number
  wa_id: string
  direction: 'inbound' | 'outbound'
  message_type: string
  content: Record<string, unknown>
  status: 'success' | 'error'
  error_message?: string
  created_at: string
}
