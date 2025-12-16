# Google OAuth Integration

## Overview

VitaWin supports Google OAuth 2.0 authentication, allowing users to:
- Register using their Google account
- Login with their Google account
- Link/unlink Google accounts to existing profiles

## Architecture

### Layers

1. **Config Layer** (`config/googleOAuth.ts`)
   - Environment variables for Client ID, Secret, and Redirect URI
   - Validation and feature flag checking

2. **Integration Layer** (`integrations/googleOAuth.ts`)
   - OAuth2 client creation using `googleapis` library
   - Authorization URL generation
   - Token exchange (code → access token)
   - User profile retrieval
   - ID token verification

3. **Service Layer** (`services/googleOAuthService.ts`)
   - Business logic for login/registration
   - Referral code handling
   - Creator Pool assignment for users without referrers
   - Account linking/unlinking

4. **Routes Layer** (`routes/googleOAuth.routes.ts`)
   - REST API endpoints for OAuth flows
   - Request validation using Zod schemas

## Supported Flows

### 1. Authorization Code Flow (Server-Side)

**Frontend → Backend redirect:**

1. User clicks "Login with Google"
2. Frontend requests authorization URL: `GET /api/auth/google`
3. Backend generates OAuth URL and returns it
4. Frontend redirects user to Google OAuth page
5. User authenticates with Google
6. Google redirects to: `GET /api/auth/google/callback?code=...`
7. Backend exchanges code for tokens
8. Backend creates/updates user and returns JWT
9. Backend redirects to frontend with token

### 2. ID Token Flow (Client-Side)

**Frontend-initiated with Google Sign-In SDK:**

1. User clicks "Sign in with Google" button (Google SDK)
2. Google SDK returns `idToken` to frontend
3. Frontend sends to backend: `POST /api/auth/google/login { idToken }`
4. Backend verifies `idToken` with Google
5. Backend creates/updates user and returns JWT

## API Endpoints

### Public Routes

#### `GET /api/auth/google`
Get authorization URL for OAuth redirect flow.

**Query Parameters:**
- `state` (optional) - CSRF protection token

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

#### `GET /api/auth/google/callback`
OAuth callback endpoint (called by Google after authentication).

**Query Parameters:**
- `code` (required) - Authorization code
- `state` (optional) - CSRF token
- `refCode` (optional) - Referral code for new users

**Response:**
Redirects to frontend:
- Success: `{FRONTEND_URL}/auth/google/success?token={jwt}&isNewUser={boolean}`
- Error: `{FRONTEND_URL}/auth/google/error?message={error}`

#### `POST /api/auth/google/login`
Login with Google ID token (client-side flow).

**Request Body:**
```json
{
  "idToken": "google-id-token",
  "refCode": "REFERCODE" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt-token",
    "isNewUser": true
  }
}
```

### Protected Routes (require JWT)

#### `POST /api/auth/google/link`
Link Google account to current user.

**Headers:**
- `Authorization: Bearer {jwt}`

**Request Body:**
```json
{
  "idToken": "google-id-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google account linked successfully"
}
```

#### `POST /api/auth/google/unlink`
Unlink Google account from current user.

**Headers:**
- `Authorization: Bearer {jwt}`

**Response:**
```json
{
  "success": true,
  "message": "Google account unlinked successfully"
}
```

## Database Schema

### users table changes

```sql
ALTER TABLE app_user ADD COLUMN google_id TEXT UNIQUE;
CREATE UNIQUE INDEX ux_app_user_google ON app_user(google_id);
```

## Business Logic

### New User Registration

When a user registers via Google:

1. **Username Generation**: Extracted from email (e.g., `test@gmail.com` → `test`)
   - If username exists, append number (`test1`, `test2`, etc.)

2. **Referrer Assignment**:
   - If `refCode` provided → find user with that referral code
   - If no `refCode` → assign from Creator Pool using `creatorPoolService.getNextProPartner()`

3. **User Creation**:
   - `googleId`: Google User ID
   - `email`: From Google profile
   - `name`: From Google profile
   - `emailVerified`: From Google (usually `true`)
   - `avatarUrl`: Google profile picture
   - `referralCode`: Auto-generated 8-char code
   - `role`: `'user'`

### Existing User Login

**Scenario 1: User exists with googleId**
- Lookup by `googleId` → return JWT

**Scenario 2: User exists with email (no googleId)**
- Lookup by `email`
- Link Google account by setting `googleId`
- Return JWT

**Scenario 3: User doesn't exist**
- Register as new user (see above)

### Account Linking

Users can link their Google account to an existing profile:

**Requirements:**
- User must be authenticated (JWT)
- Google account cannot be linked to another user

**Process:**
1. Verify ID token
2. Check if `googleId` is already used
3. Update user record with `googleId` and Google email/avatar

### Account Unlinking

Users can unlink their Google account:

**Requirements:**
- User must have alternative login method (Telegram)
- User must be authenticated (JWT)

**Process:**
1. Check user has `telegramId`
2. Set `googleId` to `NULL`

## Environment Variables

Required variables in `.env`:

```bash
# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
```

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services → Credentials**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
5. Copy **Client ID** and **Client Secret**

### 2. Configure Environment

Add to `.env`:

```bash
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

### 3. Install Dependencies

The `googleapis` package is required:

```bash
npm install googleapis
```

### 4. Frontend Integration Examples

#### Option 1: Server-Side Redirect Flow

```typescript
// Get authorization URL from backend
const response = await fetch('/api/auth/google');
const { data } = await response.json();

// Redirect user to Google
window.location.href = data.authUrl;
```

Frontend should handle callback at `/auth/google/success`:

```typescript
// pages/auth/google/success.tsx
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const isNewUser = params.get('isNewUser') === 'true';

// Save token and redirect
localStorage.setItem('authToken', token);
router.push(isNewUser ? '/onboarding' : '/dashboard');
```

#### Option 2: Client-Side ID Token Flow

```typescript
// Use Google Sign-In SDK
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={(response) => {
    fetch('/api/auth/google/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential })
    })
    .then(res => res.json())
    .then(data => {
      localStorage.setItem('authToken', data.data.token);
      router.push('/dashboard');
    });
  }}
/>
```

## Security Considerations

1. **CSRF Protection**: Use `state` parameter in authorization flow
2. **Token Verification**: Always verify `idToken` with Google servers
3. **HTTPS Only**: In production, enforce HTTPS for all OAuth endpoints
4. **Scope Limitation**: Request only necessary scopes (profile, email)
5. **Token Storage**: Frontend should store JWT securely (httpOnly cookies recommended)

## Testing

Run tests:

```bash
npm test tests/auth/google-oauth.test.ts
```

Tests cover:
- New user registration
- Existing user login (by googleId and email)
- Account linking
- Account unlinking
- Username collision handling
- Referral code assignment
- Creator Pool fallback

## Monitoring

The integration logs warnings if:
- `GOOGLE_CLIENT_ID` is not set
- `GOOGLE_CLIENT_SECRET` is not set
- `GOOGLE_REDIRECT_URI` points to localhost in production

Check feature availability:

```typescript
import { isGoogleOAuthEnabled } from './config/googleOAuth';

if (isGoogleOAuthEnabled()) {
  // Show Google login button
}
```

## Troubleshooting

### "Google OAuth is not configured"
- Verify environment variables are set
- Check `isGoogleOAuthEnabled()` returns `true`

### "Redirect URI mismatch"
- Ensure `GOOGLE_REDIRECT_URI` matches Google Console configuration
- Check for trailing slashes

### "Invalid ID token"
- Verify token hasn't expired (tokens expire after 1 hour)
- Ensure client ID matches

### "This Google account is already linked to another user"
- User trying to link account that's already in use
- User should login with Google instead

## Related Files

- `backend/src/config/googleOAuth.ts` - Configuration
- `backend/src/integrations/googleOAuth.ts` - Google API integration
- `backend/src/services/googleOAuthService.ts` - Business logic
- `backend/src/routes/googleOAuth.routes.ts` - API routes
- `backend/src/validation/googleOAuthSchemas.ts` - Zod schemas
- `backend/tests/auth/google-oauth.test.ts` - Unit tests
- `backend/src/db/schema/users.ts` - User schema (googleId field)
