# Comprehensive Third-Party Integration Plan: Auth, Payments & Music Streaming

## Overview

This document covers the full integration plan for three interconnected systems:

1. **Authentication** (Google OAuth, Apple Sign-In, email/password)
2. **Payments & Subscriptions** (Stripe checkout, webhooks, credit system)
3. **Music Streaming** (Spotify Web Playback, Apple MusicKit JS)

The app is a **Vite + React 18 SPA** deployed to **Vercel** with serverless Node.js functions in `/api/`. State management uses **React Context** (app-level) and **Zustand** (DAW). The backend API lives at a separate service (`MUSIC_ATLAS_API_URL`).

---

## PART A: AUTHENTICATION SYSTEM

### Current State: Fully Implemented

The auth system is complete. Below is the documentation for your reference and any maintenance needs.

### A1. Architecture Overview

```
User clicks "Sign in with Google/Apple"
  -> Redirect to /api/auth/google or /api/auth/apple
  -> Provider consent screen
  -> Callback to /api/auth/{provider} with auth code
  -> Server exchanges code for tokens
  -> Server calls backend /auth/oauth to upsert user
  -> Server initializes 50 free credits (new users)
  -> Redirect to frontend: /auth/sign-in#token={jwt}
  -> Frontend AuthContext reads hash, stores JWT in localStorage
  -> User is authenticated
```

### A2. Files & Responsibilities

| File                                                    | Purpose                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/api/auth/google.ts`                                   | Google OAuth 2.0 serverless handler                                                               |
| `/api/auth/apple.ts`                                    | Apple Sign-In serverless handler (ES256 client secret)                                            |
| `/api/lib/jwt.ts`                                       | `verifyToken()`, `extractToken()`, `getUserFromRequest()`                                         |
| `/api/lib/cors.ts`                                      | CORS config (localhost:5173, staging, production)                                                 |
| `src/contexts/AuthContext/AuthContext.tsx`              | Frontend auth provider, token persistence, OAuth hash reader                                      |
| `src/contexts/AuthContext/types.ts`                     | `UserRole`, `AuthContextData` types                                                               |
| `src/contexts/AuthContext/ProtectedPage.tsx`            | Route guard — redirects unauthenticated users                                                     |
| `src/contexts/AuthContext/AuthPage.tsx`                 | Redirects authenticated users away from auth pages                                                |
| `src/contexts/AuthContext/hooks/`                       | `useAuthContext()`, `useAuthToken()`, `useIsAuthenticated()`, `useUserRole()`, `useAuthActions()` |
| `src/contexts/AuthContext/decodeToken.ts`               | Client-side JWT decode (no verification — trust server)                                           |
| `src/features/authentication/SignInPage.tsx`            | Sign-in UI with OAuth buttons                                                                     |
| `src/features/authentication/components/SignInForm.tsx` | Email/password form with Zod validation                                                           |
| `src/hooks/data/auth/useLogin.ts`                       | `postAuthLogin` mutation via React Query                                                          |
| `src/hooks/data/auth/useRegister.ts`                    | `postAuthRegister` mutation via React Query                                                       |

### A3. Google OAuth Flow (Complete)

**Endpoint:** `GET /api/auth/google`

1. **No `code` param** — Redirect to Google consent:
   ```
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id={GOOGLE_CLIENT_ID}
     &redirect_uri=https://{domain}/api/auth/google
     &response_type=code
     &scope=openid email profile
     &access_type=offline
     &prompt=consent
   ```
2. **With `code` param** — Exchange for tokens:
   - POST `https://oauth2.googleapis.com/token` with code + client_id + client_secret
   - GET `https://www.googleapis.com/oauth2/v2/userinfo` with access_token
   - POST `{MUSIC_ATLAS_API_URL}/auth/oauth` with `{ provider: 'google', email, fullName }`
   - `initializeFreeCredits(userId)` — 50 credits for new users (no-op if credits exist)
   - Redirect to `/auth/sign-in#token={oauthToken}`

**Env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### A4. Apple Sign-In Flow (Complete)

**Endpoint:** `GET|POST /api/auth/apple`

Apple uses `response_mode: form_post` so the callback is a POST with form body.

1. **GET without code** — Redirect to Apple:
   ```
   https://appleid.apple.com/auth/authorize
     ?client_id={APPLE_CLIENT_ID}
     &redirect_uri=https://{domain}/api/auth/apple
     &response_type=code
     &scope=name email
     &response_mode=form_post
   ```
2. **POST with code** — Exchange:
   - Generate ES256 client secret JWT dynamically (6-month expiry) using Apple private key
   - POST `https://appleid.apple.com/auth/token` with code + client_secret
   - Decode id_token to extract email
   - Parse name from `user` form field (Apple only sends name on first auth)
   - Upsert to backend, initialize credits, redirect with token

**Env vars:** `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`

**Important:** `APPLE_PRIVATE_KEY` is the `.p8` file content with literal `\n` for newlines.

### A5. Email/Password Auth (Complete)

- Sign-in: `POST /auth/login` via generated API client — returns JWT
- Sign-up teacher: requires email, password, code, nickname, fullName
- Sign-up student: requires username, password, code, nickname, birthDate
- Frontend calls `musicAtlas.auth.postAuthLogin()` or `postAuthRegister()`
- On success: stores JWT via `useAuthContext().setToken()`

### A6. JWT Token Structure

```json
{
  "user_id": "uuid-string",
  "exp": 1234567890,
  "role": "student | teacher | admin"
}
```

- Signed with `JWT_SECRET` (shared between Vercel functions and backend API)
- Verified server-side via `jsonwebtoken` package
- Decoded client-side via `jwt-decode` package (no verification needed)
- Stored in localStorage key `"token"`
- Auto-cleared when `exp < Date.now()/1000`

### A7. Protected Routes

`ProtectedPage` component wraps any route requiring auth:

```tsx
<ProtectedPage>
  <AtlasPage />
</ProtectedPage>
```

- If not authenticated — redirect to `/auth/sign-in?continue={current_path}`
- Supports role checks: `adminOnly`, `teacherOnly`, `studentOnly`

### A8. CORS Configuration

Allowed origins: `localhost:5173`, `webapp-refactor.vercel.app`, `app.musicatlas.io`

---

## PART B: PAYMENTS & SUBSCRIPTIONS (STRIPE)

### Current State: Fully Implemented

### B1. Architecture Overview

```
User clicks "Upgrade to Artist/Studio"
  -> Frontend calls POST /api/stripe/checkout with { tier }
  -> Server creates Stripe Checkout Session with userId in metadata
  -> Returns session URL -> frontend redirects to Stripe
  -> User completes payment on Stripe hosted page
  -> Stripe sends webhook to POST /api/stripe/webhook
  -> Server processes event:
    - checkout.session.completed -> link customer, create subscription
    - customer.subscription.updated -> update tier & period
    - customer.subscription.deleted -> revert to free
    - invoice.payment_succeeded -> refresh credits
  -> Updates Upstash Redis with subscription + credits data
  -> Frontend queries /api/credits on next load -> sees updated tier
```

### B2. Subscription Tiers

| Tier   | Price  | Credits/Month | Stripe Price ID       |
| ------ | ------ | ------------- | --------------------- |
| Free   | $0     | 50 one-time   | N/A                   |
| Artist | $10/mo | 100           | `STRIPE_PRICE_ARTIST` |
| Studio | $20/mo | 200           | `STRIPE_PRICE_STUDIO` |

### B3. Files & Responsibilities

| File                                   | Purpose                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `/api/stripe/checkout.ts`              | Create Stripe Checkout Session                                                          |
| `/api/stripe/portal.ts`                | Redirect to Stripe Billing Portal                                                       |
| `/api/stripe/webhook.ts`               | Handle Stripe webhook events                                                            |
| `/api/lib/stripe.ts`                   | Stripe SDK init, tier config, price mapping                                             |
| `/api/lib/db.ts`                       | Upstash Redis CRUD for subscriptions, credits, lookups                                  |
| `src/hooks/data/credits/useCredits.ts` | `useCreditsBalance()`, `useConsumeCredit()`, `useStripeCheckout()`, `useStripePortal()` |
| `src/features/settings/PlanPage.tsx`   | Subscription management UI with tier cards                                              |
| `src/components/UpgradeModal.tsx`      | Out-of-credits upgrade prompt                                                           |
| `src/components/CreditsBadge.tsx`      | Credits remaining display in header                                                     |

### B4. Checkout Flow (Complete)

**Endpoint:** `POST /api/stripe/checkout`

**Auth required:** Yes (JWT in `Authorization: Bearer` header)

**Request body:** `{ tier: 'artist' | 'studio' }`

**Logic:**

1. Verify JWT, extract `userId`
2. Check for existing `stripeCustomerId` in Redis
3. If exists — reuse customer; if not — create new Stripe customer
4. Create checkout session with:
   - `mode: 'subscription'`
   - `line_items: [{ price: tierPriceId, quantity: 1 }]`
   - `metadata: { userId }` — critical for webhook linking
   - `success_url` and `cancel_url`
5. Return `{ url: session.url }`
6. Frontend redirects user to Stripe

### B5. Webhook Handler (Complete)

**Endpoint:** `POST /api/stripe/webhook`

**Config:** `bodyParser: false` (raw body required for signature verification)

**Signature verification:** `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`

**Events handled:**

| Event                           | Action                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| `checkout.session.completed`    | Link Stripe customer -> userId in Redis; set subscription tier |
| `customer.subscription.updated` | Update tier based on price ID; update `currentPeriodEnd`       |
| `customer.subscription.deleted` | Revert to free tier; clear Stripe IDs                          |
| `invoice.payment_succeeded`     | Refresh credits to tier allowance (100 or 200)                 |
| `invoice.payment_failed`        | Log warning (Stripe handles retries automatically)             |

### B6. Upstash Redis Data Model

```
user:{userId}:subscription = {
  tier: 'free' | 'artist' | 'studio',
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  currentPeriodEnd: number | null       // Unix timestamp
}

user:{userId}:credits = {
  balance: number,                       // Current available credits
  lifetimeUsed: number,                  // Total consumed over all time
  lastRefresh: number                    // Unix timestamp of last credit refresh
}

stripe:customer:{customerId} = userId    // Reverse lookup for webhooks
```

### B7. Credits API

| Function                             | Signature                                   | Notes                            |
| ------------------------------------ | ------------------------------------------- | -------------------------------- |
| `getCredits(userId)`                 | -> `{ balance, lifetimeUsed, lastRefresh }` | Returns 0s if not found          |
| `setCredits(userId, data)`           | -> void                                     | Merges with existing data        |
| `consumeCredit(userId)`              | -> `{ success, remaining }`                 | Fails if balance <= 0            |
| `initializeFreeCredits(userId)`      | -> void                                     | Sets 50 credits, no-op if exists |
| `refreshCredits(userId, amount)`     | -> void                                     | Resets balance to tier amount    |
| `getSubscription(userId)`            | -> subscription data                        | Free tier defaults               |
| `setSubscription(userId, data)`      | -> void                                     | Merges with existing             |
| `linkStripeCustomer(userId, custId)` | -> void                                     | Sets both forward + reverse key  |
| `findUserByStripeCustomer(custId)`   | -> userId                                   | For webhook processing           |

### B8. Stripe Setup Requirements

1. **Stripe Dashboard:**

   - Create two Products with monthly prices -> get Price IDs
   - Configure webhook endpoint: `https://{domain}/api/stripe/webhook`
   - Enable events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Get webhook signing secret

2. **Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ARTIST`, `STRIPE_PRICE_STUDIO`, `STRIPE_WEBHOOK_SECRET`

---

## PART C: MUSIC STREAMING INTEGRATION (NEW — 15 Phases)

### Current State: Not Yet Implemented

No streaming SDKs, APIs, or OAuth flows exist. The Globe section displays historical music events with artist names in text (tags, titles) but has no external artist IDs or playback capability.

### C1. Phase 1 — Spotify Developer App Setup

**Owner:** Project admin (not code)

1. Go to `developer.spotify.com/dashboard` -> Create App
2. Set app name, description
3. Add redirect URIs:
   - `http://localhost:5173/atlas/callback/spotify` (dev)
   - `https://webapp-refactor.vercel.app/atlas/callback/spotify` (staging)
   - `https://app.musicatlas.io/atlas/callback/spotify` (production)
4. Enable **Web Playback SDK** in app settings
5. Note: Spotify Web Playback SDK **requires Premium** for full playback. Free users get 30-second previews via the Web API (no SDK needed).

**New env vars:**

```
VITE_SPOTIFY_CLIENT_ID=<from dashboard>
SPOTIFY_CLIENT_SECRET=<from dashboard>
```

Add to `.env.example`.

### C2. Phase 2 — Apple Music Developer Setup

**Owner:** Project admin (not code)

1. Go to `developer.apple.com` -> Certificates, Identifiers & Profiles
2. Register a MusicKit identifier (same as existing Apple Sign-In app ID or new one)
3. Create a MusicKit private key (`.p8` file) — note the Key ID
4. MusicKit uses the same Team ID as Apple Sign-In

**New env vars:**

```
APPLE_MUSICKIT_TEAM_ID=<same as APPLE_TEAM_ID or separate>
APPLE_MUSICKIT_KEY_ID=<MusicKit key ID>
APPLE_MUSICKIT_PRIVATE_KEY=<.p8 key content with \n>
```

Add to `.env.example`.

### C3. Phase 3 — Spotify OAuth Serverless Endpoint

**New file:** `/api/auth/spotify.ts`

Follow the same pattern as `/api/auth/google.ts`:

```typescript
// GET /api/auth/spotify
// Step 1: No code -> redirect to Spotify authorization
// Step 2: With code -> exchange for tokens

// Authorization URL:
// https://accounts.spotify.com/authorize
//   ?client_id={VITE_SPOTIFY_CLIENT_ID}
//   &response_type=code
//   &redirect_uri={redirect_uri}
//   &scope=streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state
//   &show_dialog=true

// Token exchange:
// POST https://accounts.spotify.com/api/token
//   grant_type=authorization_code
//   code={code}
//   redirect_uri={redirect_uri}
//   (Basic auth header: base64(client_id:client_secret))

// Returns: { access_token, refresh_token, expires_in, scope, token_type }
```

**Auth requirement:** User must be logged into the app first (JWT required). Extract `userId` from JWT before proceeding.

**Storage:** Save to Upstash Redis:

```
user:{userId}:spotify = {
  accessToken: string,
  refreshToken: string,
  expiresAt: number,         // Date.now() + expires_in * 1000
  spotifyUserId: string,     // from /v1/me
  isPremium: boolean,        // product === 'premium'
  displayName: string
}
```

After storing tokens, fetch Spotify user profile:

```
GET https://api.spotify.com/v1/me
Authorization: Bearer {access_token}
```

**Redirect on completion:** `/atlas#streaming=spotify&connected=true`

**New file:** `/api/auth/spotify-refresh.ts`

```typescript
// POST /api/auth/spotify-refresh
// Auth: JWT required
// Body: none (reads refresh_token from Redis)

// POST https://accounts.spotify.com/api/token
//   grant_type=refresh_token
//   refresh_token={stored_refresh_token}
//   (Basic auth header)

// Returns new access_token, store in Redis, return to frontend
```

### C4. Phase 4 — Apple Music Developer Token Endpoint

**New file:** `/api/auth/apple-music-token.ts`

Apple MusicKit JS needs a **developer token** (server-generated JWT) to initialize, then the user authorizes via MusicKit JS on the frontend (no server OAuth needed).

```typescript
// GET /api/auth/apple-music-token
// Auth: JWT required

// Generate JWT:
// Header: { alg: 'ES256', kid: APPLE_MUSICKIT_KEY_ID }
// Payload: {
//   iss: APPLE_MUSICKIT_TEAM_ID,
//   iat: now,
//   exp: now + 6 months (max),
//   origin: ['https://app.musicatlas.io', 'http://localhost:5173']  // IMPORTANT: must match frontend domain
// }
// Sign with APPLE_MUSICKIT_PRIVATE_KEY using ES256

// Return: { token: jwt }
```

**Note:** The developer token can be cached — it's valid for up to 6 months. Consider caching in Upstash with TTL.

### C5. Phase 5 — Streaming Context (Frontend State)

**New directory:** `src/contexts/StreamingContext/`

**`types.ts`:**

```typescript
type StreamingProvider = 'spotify' | 'apple-music';

interface SpotifyConnection {
  provider: 'spotify';
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  isPremium: boolean;
  displayName: string;
}

interface AppleMusicConnection {
  provider: 'apple-music';
  developerToken: string;
  musicUserToken: string;
}

type StreamingConnection = SpotifyConnection | AppleMusicConnection | null;

interface StreamingState {
  connection: StreamingConnection;
  isConnecting: boolean;
  error: string | null;
}
```

**`StreamingContext.tsx`:**

- React Context + Provider wrapping Atlas routes
- Persist `provider` choice in localStorage (not tokens — those live in Redis/memory)
- On mount: if user was previously connected, attempt to restore session
  - Spotify: call `/api/auth/spotify-refresh` to get fresh access token
  - Apple Music: fetch developer token + re-authorize MusicKit
- Actions: `connectSpotify()`, `connectAppleMusic()`, `disconnect()`, `refreshSpotifyToken()`
- Export hooks: `useStreaming()`, `useIsStreamingConnected()`, `useStreamingProvider()`

### C6. Phase 6 — Spotify OAuth Callback Route

**New file:** `src/components/atlas/pages/SpotifyCallback.tsx`

**Route:** `/atlas/callback/spotify` (add to router in `App.tsx` under Atlas routes)

```typescript
// On mount:
// 1. Extract `code` from URL search params
// 2. If no code -> show error
// 3. Call GET /api/auth/spotify?code={code} (with JWT auth header)
// 4. On success -> update StreamingContext with connection
// 5. Navigate to /atlas with success toast
// 6. On error -> show error message with retry button
```

**Apple Music:** No callback route needed — MusicKit JS `authorize()` returns the music user token inline via a promise. Handle entirely in `StreamingContext.connectAppleMusic()`.

### C7. Phase 7 — Spotify Web Playback SDK

**New file:** `src/components/atlas/hooks/useSpotifyPlayer.ts`

```typescript
// 1. Dynamically load SDK: <script src="https://sdk.scdn.co/spotify-player.js">
// 2. Wait for window.onSpotifyWebPlaybackSDKReady callback
// 3. Create player:
//    const player = new Spotify.Player({
//      name: 'Music Atlas',
//      getOAuthToken: async cb => {
//        // Get fresh token from StreamingContext (refresh if needed)
//        cb(accessToken);
//      },
//      volume: 0.5,
//    });
// 4. Connect player -> get device_id
// 5. Transfer playback to this device:
//    PUT https://api.spotify.com/v1/me/player
//    Body: { device_ids: [device_id], play: false }

// Exposed API:
interface SpotifyPlayerHook {
  isReady: boolean;
  deviceId: string | null;
  play: (uri: string) => Promise<void>; // spotify:track:xxx or spotify:artist:xxx
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (value: number) => Promise<void>; // 0-1
  currentTrack: {
    name: string;
    artist: string;
    albumArt: string;
    duration: number;
  } | null;
  position: number; // ms
  isPlaying: boolean;
  error: string | null;
}

// Playback control uses Spotify Web API:
// PUT https://api.spotify.com/v1/me/player/play
//   Body: { uris: ['spotify:track:xxx'] } or { context_uri: 'spotify:artist:xxx' }
```

**Free user fallback:** If `isPremium === false`, skip the Web Playback SDK entirely. Instead, use the Web API preview URLs:

```
GET https://api.spotify.com/v1/tracks/{id}
-> response.preview_url (30-second MP3, no Premium needed)
-> Play via standard HTML5 Audio element
```

### C8. Phase 8 — Apple MusicKit JS Integration

**New file:** `src/components/atlas/hooks/useAppleMusicPlayer.ts`

```typescript
// 1. Load MusicKit JS:
//    <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js">
// 2. Configure:
//    await MusicKit.configure({
//      developerToken: devToken,  // from /api/auth/apple-music-token
//      app: { name: 'Music Atlas', build: '1.0.0' },
//    });
// 3. Get instance: const music = MusicKit.getInstance();
// 4. Authorize user: await music.authorize(); -> returns musicUserToken
//    (Triggers Apple ID sign-in popup — user must have Apple Music subscription)

// Exposed API:
interface AppleMusicPlayerHook {
  isReady: boolean;
  isAuthorized: boolean;
  play: (songId: string) => Promise<void>; // Apple Music catalog ID
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionSeconds: number) => Promise<void>;
  setVolume: (value: number) => Promise<void>;
  currentTrack: {
    name: string;
    artist: string;
    albumArt: string;
    duration: number;
  } | null;
  position: number;
  isPlaying: boolean;
  error: string | null;
  authorize: () => Promise<void>; // Trigger Apple Music sign-in
  unauthorize: () => Promise<void>; // Sign out
}

// Search: music.api.search('elvis presley', { types: ['artists', 'songs'], limit: 5 })
// Play:   await music.setQueue({ song: catalogId }); await music.play();
```

### C9. Phase 9 — Unified Playback Hook

**New file:** `src/components/atlas/hooks/useStreamingPlayer.ts`

Wraps both platform hooks behind a single API so UI components don't care which provider is active.

```typescript
interface StreamingPlayerHook {
  // State
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: TrackInfo | null;
  position: number; // ms
  duration: number; // ms
  error: string | null;

  // Actions
  playArtist: (artistName: string) => Promise<void>;
  playTrack: (trackName: string, artistName: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seek: (positionMs: number) => void;
  setVolume: (value: number) => void;
  skip: () => void;

  // Search
  searchArtist: (name: string) => Promise<ArtistResult | null>;
}

interface TrackInfo {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  duration: number;
}

interface ArtistResult {
  id: string;
  name: string;
  imageUrl: string;
  genres: string[];
  topTracks: TrackInfo[];
}
```

**Internal logic:**

- Reads `connection.provider` from `StreamingContext`
- Delegates to `useSpotifyPlayer` or `useAppleMusicPlayer` accordingly
- `playArtist()` flow:
  1. Search provider API for artist by name
  2. Get top tracks
  3. Play first track
- `searchArtist()` flow:
  - Spotify: `GET /v1/search?q={name}&type=artist` -> get artist ID -> `GET /v1/artists/{id}/top-tracks`
  - Apple Music: `music.api.search(name, { types: ['artists'] })` -> get catalog ID -> fetch top songs

### C10. Phase 10 — Artist Name Resolution

**New file:** `src/components/atlas/utils/artistResolver.ts`

Maps Globe `HistoricalEvent` data to streaming-resolvable artist names.

```typescript
// Extract artist names from event data:
function extractArtistNames(event: HistoricalEvent): string[] {
  // Strategy 1: Check tags — artist names are typically first few tags
  // Strategy 2: Parse title — pattern: "{Artist Name} {verb} at {location}"
  // Strategy 3: Known artist tag patterns from musicHistory.ts
  // Examples:
  // title: "Elvis Presley records at Sun Studio"
  //   -> tags: ['elvis presley', 'sun studio', 'sam phillips', ...]
  //   -> extract: ['Elvis Presley', 'Sam Phillips']
  //
  // title: "The Beatles play the Cavern Club"
  //   -> extract: ['The Beatles']
}

// Cache resolved artist IDs to avoid repeated API calls:
const artistCache = new Map<string, ArtistResult>();

async function resolveArtist(
  artistName: string,
  player: StreamingPlayerHook,
): Promise<ArtistResult | null> {
  const cached = artistCache.get(artistName.toLowerCase());
  if (cached) return cached;

  const result = await player.searchArtist(artistName);
  if (result) {
    artistCache.set(artistName.toLowerCase(), result);
  }
  return result;
}
```

**Heuristics for name extraction:**

- Tags that match known artist patterns (capitalized multi-word, no location words)
- Title parsing: extract subject before common verbs ("records", "plays", "performs", "debuts", "releases")
- Deduplicate across events
- Handle edge cases: "DJ Kool Herc", "Run-DMC", "Grandmaster Flash", classical composers

### C11. Phase 11 — Artist Card Component

**New file:** `src/components/atlas/components/ArtistCard.tsx`

Appears in the event detail panel when a pinned event has a resolvable artist.

```
+----------------------------------+
| [Artist Image]  Elvis Presley    |
|                 Rock, Rockabilly |
|                                  |
|  > Hound Dog                     |
|  > Jailhouse Rock                |
|  > Can't Help Falling in Love    |
|  > Suspicious Minds              |
|  > Blue Suede Shoes              |
|                                  |
|  [> Play All]                    |
+----------------------------------+
| Now Playing: Hound Dog     2:14  |
| ================----------- ... |
+----------------------------------+
```

**States:**

1. **No streaming connected:** Show "Connect Spotify or Apple Music to listen" with connect buttons
2. **Connected, loading:** Skeleton loader while resolving artist
3. **Connected, resolved:** Artist info + playable track list
4. **Connected, not found:** "Artist not available on {provider}"
5. **Playing:** Track highlight + progress bar

### C12. Phase 12 — Mini-Player Component

**New file:** `src/components/atlas/components/MiniPlayer.tsx`

Fixed-position bar at bottom of Atlas view. Only visible when a track is playing or paused.

```
+---------------------------------------------------+
| [art] Hound Dog - Elvis Presley   <  ||>  >   vol |
|       ===============-----------  1:24 / 2:14     |
+---------------------------------------------------+
```

**Features:**

- Album art thumbnail (40x40)
- Track name + artist name (truncated with ellipsis)
- Play/pause, previous, next controls
- Seek bar (click to seek)
- Current time / total time
- Volume slider
- Slide-up animation on first appearance
- Click track name -> scroll to/highlight the associated event on globe

### C13. Phase 13 — Globe Visual Integration

**Changes in:** `src/components/atlas/components/Globe/BaseGlobe.tsx`

When streaming is connected, enhance event markers:

1. **Playable indicator:** Add small music-note icon badge on event pins that have resolvable artists (use `artistResolver` to pre-check)
2. **Currently playing:** Pulse/glow animation on the marker for the event whose artist is currently playing
3. **Click behavior update:** Clicking a playable event pin:
   - Pin the event (existing behavior)
   - Show ArtistCard in detail panel (new)
   - Optionally auto-play if user preference is set

**Performance consideration:** Don't resolve all 200+ events at once. Resolve lazily when events become visible in current filter set. Cache aggressively.

### C14. Phase 14 — Musicians Tab Enhancement

**Changes in:** Atlas sidebar Musicians tab component

Currently the Musicians tab shows events tagged with musician names. Enhance to:

1. **Artist list view:** Extract unique artist names from currently filtered events
2. **Each row shows:**
   - Artist name
   - Genres (from event tags)
   - Era (earliest event year)
   - Play button (if streaming connected)
3. **Click artist row:**
   - Fly globe to artist's primary event location
   - Pin the event
   - Show ArtistCard
4. **Search/filter:** Filter musicians by name within current decade/region/genre selection
5. **Sort options:** By era (chronological), by name (A-Z), by region

### C15. Phase 15 — Streaming Settings Panel

**New file:** `src/components/atlas/components/StreamingSettings.tsx`

Accessible from Atlas settings gear icon or user profile.

```
+-- Music Streaming ---------------------+
|                                        |
|  [Spotify Logo]  Spotify               |
|  * Connected as "John Doe"             |
|  Premium account                       |
|  [Disconnect]                          |
|                                        |
|  -- or --                              |
|                                        |
|  [Apple Music Logo]  Apple Music       |
|  o Not connected                       |
|  [Connect]                             |
|                                        |
|  -----------------------------------   |
|  Playback: [Auto-play on pin: [ ]]    |
|  Volume: ==================-- 70%      |
+----------------------------------------+
```

### C16. Phase 16 — Rate Limiting & Caching

**Spotify API limits:**

- Web API: ~180 requests/minute (varies by endpoint)
- Search endpoint: heavy rate limiting

**Implementation:**

- Debounce search calls: 300ms minimum between requests
- Cache artist search results in memory `Map` (survives for session)
- Cache artist top tracks: 5-minute TTL
- Use `stale-while-revalidate` pattern for artist data
- Batch resolve: when loading Musicians tab, resolve visible artists in chunks of 5 with 200ms delays

**Apple Music limits:**

- Less strict than Spotify
- Still debounce and cache for performance

### C17. Phase 17 — Error Handling & Edge Cases

| Scenario                        | Handling                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Spotify token expired           | Auto-refresh via `/api/auth/spotify-refresh` before each API call                                                                     |
| Spotify refresh token revoked   | Clear connection, show "Re-connect Spotify" prompt                                                                                    |
| Apple Music subscription lapsed | MusicKit throws error -> show "Apple Music subscription required"                                                                     |
| Artist not found on platform    | Show "Not available" in ArtistCard, disable play button                                                                               |
| Region restriction              | Spotify returns 403 -> show "Not available in your region"                                                                            |
| Network failure during playback | Pause playback, show offline indicator, retry on reconnect                                                                            |
| Free Spotify user               | Detect via `/v1/me` response `product !== 'premium'` -> use preview URLs (30s clips) with "Upgrade to Premium for full tracks" prompt |
| Both providers connected        | Only one active at a time — last connected wins, disconnect previous                                                                  |
| User not logged into app        | StreamingSettings hidden; ArtistCard shows "Sign in to listen"                                                                        |

---

## ENVIRONMENT VARIABLES — COMPLETE LIST

### Existing (Already Configured)

```env
# Frontend
VITE_MUSIC_ATLAS_API_URL=https://api-refactor.vercel.app/

# Backend / Serverless
MUSIC_ATLAS_API_URL=https://api-refactor.vercel.app
JWT_SECRET=<shared-secret>

# Google OAuth
GOOGLE_CLIENT_ID=<google-app-id>
GOOGLE_CLIENT_SECRET=<google-app-secret>

# Apple Sign-In
APPLE_CLIENT_ID=<apple-app-id>
APPLE_TEAM_ID=<apple-team-id>
APPLE_KEY_ID=<apple-key-id>
APPLE_PRIVATE_KEY=<apple-.p8-key-content>

# Upstash Redis
KV_REST_API_URL=<upstash-endpoint>
KV_REST_API_TOKEN=<upstash-token>

# Stripe
STRIPE_SECRET_KEY=<stripe-secret>
STRIPE_PRICE_ARTIST=<price-id>
STRIPE_PRICE_STUDIO=<price-id>
STRIPE_WEBHOOK_SECRET=<webhook-secret>
```

### New (Music Streaming)

```env
# Spotify
VITE_SPOTIFY_CLIENT_ID=<spotify-app-client-id>
SPOTIFY_CLIENT_SECRET=<spotify-app-client-secret>

# Apple MusicKit
APPLE_MUSICKIT_TEAM_ID=<team-id>
APPLE_MUSICKIT_KEY_ID=<musickit-key-id>
APPLE_MUSICKIT_PRIVATE_KEY=<musickit-.p8-key-content>
```

---

## NEW FILES TO CREATE (Streaming Integration)

| File                                                    | Phase | Purpose                                   |
| ------------------------------------------------------- | ----- | ----------------------------------------- |
| `/api/auth/spotify.ts`                                  | C3    | Spotify OAuth code exchange               |
| `/api/auth/spotify-refresh.ts`                          | C3    | Spotify token refresh                     |
| `/api/auth/apple-music-token.ts`                        | C4    | Apple MusicKit developer token            |
| `src/contexts/StreamingContext/types.ts`                | C5    | Streaming connection types                |
| `src/contexts/StreamingContext/StreamingContext.tsx`    | C5    | Streaming state provider                  |
| `src/components/atlas/pages/SpotifyCallback.tsx`        | C6    | OAuth redirect handler                    |
| `src/components/atlas/hooks/useSpotifyPlayer.ts`        | C7    | Spotify Web Playback SDK                  |
| `src/components/atlas/hooks/useAppleMusicPlayer.ts`     | C8    | Apple MusicKit JS                         |
| `src/components/atlas/hooks/useStreamingPlayer.ts`      | C9    | Unified playback API                      |
| `src/components/atlas/utils/artistResolver.ts`          | C10   | Event -> artist name extraction + caching |
| `src/components/atlas/components/ArtistCard.tsx`        | C11   | Artist info + track list UI               |
| `src/components/atlas/components/MiniPlayer.tsx`        | C12   | Persistent playback bar                   |
| `src/components/atlas/components/StreamingSettings.tsx` | C15   | Connection management UI                  |

## EXISTING FILES TO MODIFY

| File                                                  | Phase   | Change                                     |
| ----------------------------------------------------- | ------- | ------------------------------------------ |
| `src/App.tsx`                                         | C6      | Add `/atlas/callback/spotify` route        |
| `src/components/atlas/atlas.tsx`                      | C5, C12 | Wrap with StreamingContext, add MiniPlayer |
| `src/components/atlas/components/Globe/BaseGlobe.tsx` | C13     | Playable event markers                     |
| `src/components/atlas/context/AppContext.tsx`         | C5      | Add streaming-related actions if needed    |
| `src/components/atlas/types/index.ts`                 | C5      | Add streaming types to AppState if needed  |
| `.env.example`                                        | C1-C2   | Add new env vars                           |

---

## EXECUTION ORDER

| Priority | Phases  | Description                                   | Dependencies       |
| -------- | ------- | --------------------------------------------- | ------------------ |
| 1        | C1-C2   | Developer app registration (Spotify + Apple)  | None — admin task  |
| 2        | C3-C4   | Backend endpoints (OAuth + token generation)  | C1-C2 env vars     |
| 3        | C5-C6   | Frontend streaming context + Spotify callback | C3-C4 endpoints    |
| 4        | C7-C8   | Platform-specific playback SDKs               | C5-C6 auth flow    |
| 5        | C9      | Unified playback abstraction                  | C7-C8 player hooks |
| 6        | C10     | Artist name resolver                          | C9 search API      |
| 7        | C11-C12 | UI components (ArtistCard, MiniPlayer)        | C9-C10             |
| 8        | C13-C14 | Globe + Musicians tab integration             | C10-C12            |
| 9        | C15     | Streaming settings panel                      | C5                 |
| 10       | C16-C17 | Rate limiting, error handling, polish         | All above          |

---

## VERIFICATION CHECKLIST

### Auth (Existing — Verify Working)

- [ ] Google OAuth sign-in -> lands on authenticated page
- [ ] Apple Sign-In -> lands on authenticated page
- [ ] Email/password sign-in -> works
- [ ] JWT token persists across page refresh
- [ ] Protected pages redirect unauthenticated users
- [ ] Token expiry clears session

### Payments (Existing — Verify Working)

- [ ] Free user sees 50 credits
- [ ] Click "Upgrade to Artist" -> Stripe checkout page
- [ ] Complete payment -> webhook fires -> tier updates to Artist
- [ ] Credits refresh to 100 on payment
- [ ] Billing portal accessible for subscribed users
- [ ] Cancel subscription -> reverts to free tier
- [ ] Out-of-credits -> upgrade modal appears

### Music Streaming (New — Test After Implementation)

- [ ] Spotify: Connect from settings -> OAuth flow -> "Connected" status
- [ ] Spotify Premium: Play full track from ArtistCard -> hear audio
- [ ] Spotify Free: Play 30-second preview -> see "Upgrade for full tracks" prompt
- [ ] Apple Music: Connect from settings -> MusicKit authorize -> "Connected" status
- [ ] Apple Music: Play full track -> hear audio
- [ ] Pin Globe event with known artist -> ArtistCard appears with tracks
- [ ] Click play on track -> MiniPlayer appears at bottom
- [ ] Musicians tab -> shows artists -> click to fly + play
- [ ] Disconnect streaming -> graceful "Connect to listen" prompts
- [ ] Token expiry (Spotify) -> auto-refresh without interruption
- [ ] Switch providers -> previous disconnects, new one activates
- [ ] No streaming + not signed in -> "Sign in to listen" message
