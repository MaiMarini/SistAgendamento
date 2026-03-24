"""
database.py
-----------
Supabase client initialization and FastAPI authentication dependency.

Two clients are created:

  supabase (anon key)
    Used for all regular operations. Respects Row Level Security (RLS),
    meaning each user can only see/edit data they are authorized to access.
    Safe to use in request handlers on behalf of authenticated users.

  supabase_admin (service role key)
    Bypasses RLS entirely. Must ONLY be used for server-side operations
    that require elevated privileges — specifically, creating and managing
    Supabase Auth users (e.g., when a company registers a new professional).
    NEVER expose this key to the client or use it for user-facing queries.

.env required keys:
    SUPABASE_URL         — Project URL (Settings > API)
    SUPABASE_KEY         — anon/public key (Settings > API)
    SUPABASE_SERVICE_KEY — service_role key (Settings > API > Secret)
"""

import os
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

# ---------------------------------------------------------------------------
# Environment variables
# ---------------------------------------------------------------------------
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_KEY must be set in the .env file."
    )

if not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_KEY must be set in the .env file. "
        "Find it in Supabase Dashboard > Settings > API > service_role."
    )

# ---------------------------------------------------------------------------
# Supabase clients
# ---------------------------------------------------------------------------
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ---------------------------------------------------------------------------
# JWKS client — busca as chaves públicas do Supabase uma vez e cacheia
# ---------------------------------------------------------------------------
_jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", cache_keys=True)

# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict:
    """
    Valida o JWT localmente usando as chaves públicas do Supabase (JWKS).
    As chaves são buscadas uma vez na primeira requisição e cacheadas em memória.

    Returns:
        dict com: id, email, user_type, company_id, metadata.
    """
    token = credentials.credentials
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
        )
        user_id: str = payload.get("sub", "")
        email: str = payload.get("email", "")
        meta: dict = payload.get("user_metadata", {})
        user_type: str = meta.get("user_type", "company")
        company_id = meta.get("company_id") if user_type == "professional" else user_id
        return {
            "id": user_id,
            "email": email,
            "metadata": meta,
            "user_type": user_type,
            "company_id": company_id,
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired.",
        )
    except Exception as e:
        print(f"[JWT ERROR] {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
        )
