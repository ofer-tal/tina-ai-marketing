# OAuth System Documentation

## Overview

This project uses a **unified OAuth system** built on `@badgateway/oauth2-client`, a lightweight, dependency-free OAuth2 client library that provides automatic token refresh, PKCE support, and a fetch wrapper for transparent token management.

### Key Benefits

- **Automatic Token Refresh**: Tokens refresh transparently when expired
- **PKCE Support**: Built-in support for Proof Key for Code Exchange (required by TikTok)
- **Zero Custom OAuth Code**: No need to write token refresh, expiry detection, or bearer injection logic
- **Easy to Extend**: Add new platforms by simply adding configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Layer                            │
│  (googleSheetsService, tiktokPostingService, etc.)                 │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      oauthManager                                  │
│  - OAuth2Client instances for each platform                         │
│  - OAuth2Fetch wrappers (auto-injects bearer, auto-refreshes)      │
│  - Authorization URL generation                                    │
│  - Callback handling                                               │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      @badgateway/oauth2-client                      │
│  - OAuth2Client: Core OAuth2 implementation                         │
│  - OAuth2Fetch: Fetch wrapper with auto token management           │
│  - PKCE support                                                     │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AuthToken Model (MongoDB)                      │
│  - marketing_auth_tokens collection                                │
│  - accessToken, refreshToken, expiresAt                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Supported Platforms

| Platform | Client ID Env Var | Client Secret Env Var | Redirect URI Env Var | Scopes |
|----------|-------------------|-----------------------|----------------------|--------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` | `GOOGLE_REDIRECT_URI` | Various (Sheets, YouTube, etc.) |
| TikTok | `TIKTOK_APP_KEY` | `TIKTOK_APP_SECRET` | `TIKTOK_REDIRECT_URI` | `video.upload`, `video.publish` |
| Instagram | `INSTAGRAM_APP_ID` | `INSTAGRAM_APP_SECRET` | `INSTAGRAM_REDIRECT_URI` | `instagram_basic`, `instagram_content_publish`, etc. |

## API Endpoints

### Get Authorization URL

```
GET /api/oauth/:platform/authorize-url?scopes=scope1,scope2
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "state": "random_state_value",
    "platform": "google"
  }
}
```

### OAuth Callback (Unified)

```
GET /auth/:platform/callback?code=...&state=...
```

Redirects to test page with success/error status.

### Get OAuth Status

```
GET /api/oauth/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "google": {
      "configured": true,
      "authenticated": true
    },
    "tiktok": {
      "configured": true,
      "authenticated": false
    },
    "instagram": {
      "configured": true,
      "authenticated": true
    }
  }
}
```

### Manual Token Refresh

```
POST /api/oauth/:platform/refresh
```

Forces a token refresh (normally automatic).

## Usage in Services

### Making Authenticated Requests

```javascript
import oauthManager from './oauthManager.js';

// The fetch wrapper automatically:
// 1. Adds Bearer token to Authorization header
// 2. Refreshes token if expired
// 3. Retries on 401 responses

const response = await oauthManager.fetch('google', url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ foo: 'bar' }),
});

const data = await response.json();
```

### Checking Authentication Status

```javascript
import oauthManager from './oauthManager.js';

// Check if platform is authenticated
const isAuthenticated = await oauthManager.isAuthenticated('google');

// Get token details
const token = await oauthManager.getToken('google');
console.log(token.expiresAt); // Date when token expires
```

### Generating Authorization URLs

```javascript
import oauthManager from './oauthManager.js';

// Get authorization URL with default scopes
const { authUrl, state } = await oauthManager.getAuthorizationUrl('google');

// Or with custom scopes
const { authUrl, state } = await oauthManager.getAuthorizationUrl('google', [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]);
```

## Adding a New OAuth Platform

### Step 1: Add Platform Configuration

Edit `backend/services/oauthManager.js` and add to `PLATFORM_CONFIGS`:

```javascript
const PLATFORM_CONFIGS = {
  // ... existing platforms ...

  pinterest: {
    server: 'https://api.pinterest.com/v1/oauth/token',
    authorizationEndpoint: 'https://api.pinterest.com/oauth/',
    clientId: process.env.PINTEREST_APP_ID,
    clientSecret: process.env.PINTEREST_APP_SECRET,
    redirectUri: process.env.PINTEREST_REDIRECT_URI,
    defaultScopes: ['boards:read', 'pins:read', 'pins:write'],
    usePkce: false,
  },
};
```

### Step 2: Add Platform to AuthToken Model Enum

Edit `backend/models/AuthToken.js` and add to the platform enum:

```javascript
platform: {
  type: String,
  enum: ['tiktok', 'instagram', 'google', 'pinterest', /* ... */],
  required: true,
},
```

### Step 3: Add Environment Variables

Add to your `.env` file:

```env
PINTEREST_APP_ID=your_app_id
PINTEREST_APP_SECRET=your_app_secret
PINTEREST_REDIRECT_URI=http://localhost:3000/auth/pinterest/callback
```

### Step 4: Create Your Service

```javascript
// backend/services/pinterestService.js
import oauthManager from './oauthManager.js';

class PinterestService {
  async getPins() {
    const url = 'https://api.pinterest.com/v1/me/pins';
    const response = await oauthManager.fetch('pinterest', url);
    return await response.json();
  }
}

export default new PinterestService();
```

That's it! No need to implement:
- Token refresh logic
- Token expiry detection
- Bearer token injection
- PKCE code generation/challenge
- State parameter validation
- Callback handling

All handled by `oauthManager` + `@badgateway/oauth2-client`.

## PKCE Configuration

Some platforms (like TikTok) require PKCE (Proof Key for Code Exchange). The library handles this automatically:

```javascript
tiktok: {
  // ... other config ...
  usePkce: true,
  pkceEncoding: 'hex',  // 'hex' for TikTok's non-standard encoding
},
```

For standard PKCE (Base64URL encoding), omit `pkceEncoding` or set to `'base64url'`.

## Token Storage

Tokens are stored in MongoDB via the `AuthToken` model:

```javascript
{
  _id: ObjectId,
  platform: 'google',
  accessToken: 'ya29.a0AfH6...',
  refreshToken: '1//0g...',
  expiresAt: Date,
  isActive: true,
  createdAt: Date,
  updatedAt: Date,
  metadata: { /* optional platform-specific data */ }
}
```

The library automatically calls `storeToken` when a token is refreshed, ensuring the database always has the latest token.

## Troubleshooting

### "No access token available"

The user needs to complete OAuth flow. Call `/api/oauth/:platform/authorize-url` to get the authorization URL, have the user open it, and they'll be redirected back to the callback.

### Token Expiring Too Soon

Some platforms return short-lived tokens. The library automatically refreshes when the token is used, but if tokens aren't being used frequently, consider a cron job to ping the API occasionally.

### 401 Unauthorized

The `OAuth2Fetch` wrapper automatically retries on 401 with a refreshed token. If you still see 401 errors, it means:
1. The refresh token is also expired (user needs to re-authenticate)
2. The token was revoked externally

### Platform-Specific Quirks

- **TikTok**: Requires HEX-encoded PKCE (not standard Base64URL)
- **Google**: Uses `offline_access` scope to get refresh tokens
- **Instagram**: Uses Facebook's OAuth dialog

## References

- [@badgateway/oauth2-client GitHub](https://github.com/badgateway/oauth2-client)
- [@badgateway/oauth2-client NPM](https://www.npmjs.com/package/@badgateway/oauth2-client)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [PKCE Specification](https://oauth.net/2/pkce/)
