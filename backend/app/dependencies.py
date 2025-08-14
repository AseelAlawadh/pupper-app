from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests

COGNITO_REGION = "us-east-1"
COGNITO_USERPOOL_ID = "us-east-1_QRrBQlRzv"
APP_CLIENT_ID = "34i34v969jq1ho8av2dfbk7u5h"

JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USERPOOL_ID}/.well-known/jwks.json"

try:
    JWKS = requests.get(JWKS_URL).json()
except Exception as e:
    raise RuntimeError(f"Failed to fetch JWKS: {e}")

bearer_scheme = HTTPBearer()


def verify_jwt(token: str):
    try:
        headers = jwt.get_unverified_header(token)
        key = next((k for k in JWKS['keys'] if k['kid'] == headers['kid']), None)
        if not key:
            raise HTTPException(status_code=401, detail="Public key not found for JWT.")
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=APP_CLIENT_ID,
            issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USERPOOL_ID}"
        )
        if payload.get("token_use") != "id":
            raise HTTPException(status_code=401, detail="Only ID tokens are allowed.")
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid or malformed token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not credentials or not credentials.credentials or credentials.credentials == "null":
        raise HTTPException(status_code=401, detail="Authorization header missing or empty")
    return verify_jwt(credentials.credentials)
