import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Testa conexao
const { data, error } = await supabase
  .from('profiles')
  .select('id, name')
  .limit(1)

if (error) {
  console.error('Erro ao conectar ao banco:', error.message)
  process.exit(1)
}

console.log('Conexao OK. Usuarios encontrados:', data?.length ?? 0)
console.log('A coluna password_hash precisa ser adicionada manualmente no Supabase.')
console.log('Execute o seguinte SQL no Supabase SQL Editor:')
console.log('')
console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;')
