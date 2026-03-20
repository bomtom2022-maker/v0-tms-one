import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Client com service_role_key — NUNCA expor no browser
// Usado apenas em Server Components e API Routes
// Singleton para evitar multiplas conexoes ao banco

let adminClient: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Variaveis ausentes — SUPABASE_URL: ${!!supabaseUrl}, SERVICE_ROLE_KEY: ${!!serviceRoleKey}`
    )
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-my-custom-header': 'tms-one' },
    },
  })

  return adminClient
}
