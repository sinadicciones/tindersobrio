# PlanSobrio Auth Testing Playbook (Emergent Google Auth)

This app uses **two auth methods that coexist**:

1. **Email + password** → JWT (`POST /api/auth/register`, `POST /api/auth/login`, cookie + `Authorization: Bearer` header). Token stored client-side as `localStorage.ps_token`.
2. **Emergent-managed Google Auth** → `POST /api/auth/google/session` exchanges an Emergent `session_id` (from `#session_id=` in URL fragment) for the **same JWT format** so downstream endpoints don't change.

## Frontend flow (Google)
- User clicks "Continuar con Google" → redirected to `https://auth.emergentagent.com/?redirect=${origin}/app/descubrir`
- Google returns to `/app/descubrir#session_id=XYZ`
- `AppRouter` detects the hash **synchronously during render** and mounts `<AuthCallback/>`
- `AuthCallback` calls `POST /api/auth/google/session` with header `X-Session-ID: XYZ`, stores the returned JWT in `localStorage.ps_token`, calls `setUser(...)`, then navigates:
  - admin → `/admin`
  - not onboarded → `/onboarding`
  - else → `/app/descubrir`
- `AuthContext.refresh()` skips `/auth/me` when the URL hash contains `session_id=` (avoids race).

## Backend contract
- `POST /api/auth/google/session`
  - Header: `X-Session-ID: <id>`
  - Calls `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` server-side.
  - Returns: `{"user": {...}, "token": "<jwt>"}` (same shape as `/auth/login`).
  - Links by email if a matching user already exists (adds `google` to `auth_providers`).
  - New Google users get `password_hash: null`, `onboarding_complete: false`, `auth_providers: ["google"]`.

## Onboarding for Google users
- Google doesn't return `birthdate`. Onboarding step 0 now shows a date input when `!user.birthdate`, and the server rejects with `Debes ser mayor de 18 años` if the DOB fails the +18 check.

## Manual backend tests
```bash
API="https://comunidad-sobria.preview.emergentagent.com/api"

# 1. Fake session_id should be rejected as 401
curl -s -X POST "$API/auth/google/session" -H "X-Session-ID: fake_test_123" | jq

# 2. Missing header → 400
curl -s -X POST "$API/auth/google/session" | jq

# 3. Once you go through the real flow, /api/auth/me should work with the returned Bearer token.
```

## Notes for future testing agents
- Do NOT hardcode the redirect URL. Frontend derives it from `window.location.origin`.
- Do NOT expect `password_hash` to exist on Google-only users; login via password must still work only for users that have one.
- The test container's IP may resolve to another country — the waitlist gate on register only triggers if the IP-based country is not "CL". If needed, hit `/registro` and immediately go through login via email/password to bypass.
- Admin: `contacto@sinadicciones.org / Jodorowsky100` — plain email/password, no Google needed.
