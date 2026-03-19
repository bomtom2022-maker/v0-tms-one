import os
import urllib.request
import urllib.error
import json

SUPABASE_URL  = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY   = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_KEY:
    raise SystemExit("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias")

# Extrai o project ref da URL  (ex: https://abcxyz.supabase.co -> abcxyz)
project_ref = SUPABASE_URL.replace("https://", "").split(".")[0]

sql = """
ALTER TABLE machines ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS controller TEXT;
"""

# Supabase Management API: POST /v1/projects/{ref}/database/query
mgmt_url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"

payload = json.dumps({"query": sql}).encode()
req = urllib.request.Request(
    mgmt_url,
    data=payload,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SERVICE_KEY}",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode()
        print(f"Sucesso via Management API: {body}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Management API falhou ({e.code}): {body}")
    print()
    print("Execute manualmente no SQL Editor do Supabase (https://supabase.com/dashboard):")
    print()
    print("ALTER TABLE machines ADD COLUMN IF NOT EXISTS manufacturer TEXT;")
    print("ALTER TABLE machines ADD COLUMN IF NOT EXISTS model TEXT;")
    print("ALTER TABLE machines ADD COLUMN IF NOT EXISTS controller TEXT;")
