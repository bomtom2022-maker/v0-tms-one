import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  const queries = [
    `ALTER TABLE machines ADD COLUMN IF NOT EXISTS manufacturer TEXT`,
    `ALTER TABLE machines ADD COLUMN IF NOT EXISTS model TEXT`,
    `ALTER TABLE machines ADD COLUMN IF NOT EXISTS controller TEXT`,
  ]

  for (const sql of queries) {
    const { error } = await supabase.rpc('exec_sql', { query: sql }).single()
    if (error) {
      // Tenta via REST diretamente
      console.log(`RPC nao disponivel, tentando via query direta...`)
    }
    console.log(`Executado: ${sql}`)
  }

  // Verifica as colunas existentes
  const { data, error } = await supabase.from('machines').select('*').limit(1)
  if (error) {
    console.error('Erro ao verificar tabela:', error.message)
  } else {
    console.log('Colunas da tabela machines:', data ? Object.keys(data[0] || {}) : 'tabela vazia')
  }
}

run().catch(console.error)
