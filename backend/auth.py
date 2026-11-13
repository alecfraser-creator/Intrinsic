from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import ssl
import certifi

import jwt
from jwt import PyJWKClient

from .config import SUPABASE_URL

security = HTTPBearer()

ssl_context = ssl.create_default_context(cafile=certifi.where())

jwks_client = PyJWKClient(
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    ssl_context=ssl_context
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=f"{SUPABASE_URL}/auth/v1",
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
            )

        return user_id

    except jwt.PyJWTError as error:
        print("JWT verification error:", repr(error))
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )