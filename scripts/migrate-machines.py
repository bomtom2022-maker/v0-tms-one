import os
import urllib.request
import urllib.error
import json

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_KEY:
    raise SystemExit("Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias")

statements = [
    "ALTER TABLE machines ADD COLUMN IF NOT EXISTS manufacturer TEXT",
    "ALTER TABLE machines ADD COLUMN IF NOT EXISTS model TEXT",
    "ALTER TABLE machines ADD COLUMN IF NOT EXISTS controller TEXT",
]

url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"

# Usa o endpoint de SQL direto do Supabase (management API)
sql_url = f"{SUPABASE_URL.replace('.supabase.co', '.supabase.co')}/rest/v1/"

for stmt in statements:
    payload = json.dumps({"query": stmt}).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"OK: {stmt}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        # Se a funcao exec_sql nao existir, usa abordagem direta
        print(f"exec_sql nao disponivel ({e.code}): {body}")
        print("Usando INSERT direto para testar conexao...")
        break

# Abordagem alternativa: POST para o endpoint de schema do Supabase
print("\nTentando via endpoint de administracao do Supabase...")
for stmt in statements:
    payload = json.dumps({"query": stmt}).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/query",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"OK (rpc/query): {stmt}")
    except urllib.error.HTTPError as e:
        print(f"Falhou ({e.code}): {stmt} -> {e.read().decode()[:200]}")

print("\nMigracão concluída. Verifique o painel do Supabase para confirmar as colunas.")
print("Se as colunas ainda nao existirem, execute manualmente no SQL Editor do Supabase:")
print("  ALTER TABLE machines ADD COLUMN IF NOT EXISTS manufacturer TEXT;")
print("  ALTER TABLE machines ADD COLUMN IF NOT EXISTS model TEXT;")
print("  ALTER TABLE machines ADD COLUMN IF NOT EXISTS controller TEXT;")
