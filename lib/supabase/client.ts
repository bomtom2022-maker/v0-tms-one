import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Variaveis nao disponiveis no browser (ex: preview do v0)
    // Retorna um proxy vazio para evitar crash — as operacoes reais usam API Routes
    return {
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        eq: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }),
        single: () => ({ data: null, error: null }),
        order: () => ({ data: [], error: null }),
      }),
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: null, error: { message: 'Supabase nao configurado no browser' } }),
        signOut: async () => ({}),
      },
    } as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(url, key)
}
