import { createClient } from '@supabase/supabase-js'

// Client com service_role_key — NUNCA expor no browser
// Usado apenas em Server Components e API Routes
export function createAdminClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Variaveis ausentes — SUPABASE_URL: ${!!supabaseUrl}, SERVICE_ROLE_KEY: ${!!serviceRoleKey}`
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
