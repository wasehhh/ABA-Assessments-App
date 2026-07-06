# Bug Report: Unsecured Backend Service

## Description
The Python backend service (`main.py`) exposes the `/parse-template` endpoint with `allow_origins=["*"]` and no authentication.

## Location
- `backend/main.py`
- `frontend/src/services/packs.ts`

## Impact
- **Security**: Low/Medium. The service appears stateless (converts File -> JSON), but it consumes server resources.
- **Risk**: Denial of Service (DoS) if swamped with large files. Malicious users could bypass the frontend application and trigger parsing logic directly.
- **Deployment**: In a production environment, this service needs to be protected (e.g., accessible only via internal network from the Next.js API route, or requiring a shared secret/token).

## Recommendation
1. **Short Term**: Validated that it's only for MVP.
2. **Long Term**: detailed in `docs/architecture/api_architecture.md` (which suggests "Optional FastAPI service").
   - Move the call to a Server Action (Next.js) or Edge Function which then calls the Python service (private network).
   - Or add a validation token check in `main.py`.
