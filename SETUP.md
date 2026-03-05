# Music Atlas — Full Setup Guide

Complete guide to configure every external service for the auth + billing system.

## Architecture

```
Browser (React)
  ├── /api/auth/google      → Google consent → exchange code → POST backend /auth/oauth → redirect with #token=
  ├── /api/auth/apple       → Apple Sign-In  → exchange code → POST backend /auth/oauth → redirect with #token=
  ├── /api/stripe/checkout   → Create Stripe Checkout Session → redirect to Stripe
  ├── /api/stripe/webhook    → Stripe events  → update Redis (subscription + credits)
  ├── /api/stripe/portal     → Stripe Customer Portal redirect
  ├── /api/credits/balance   → GET credit balance from Redis
  └── /api/credits/consume   → POST deduct 1 credit from Redis

Backend API (music-atlas-api)
  └── POST /auth/oauth       → upsert user in PostgreSQL, return JWT

Upstash Redis
  └── Stores credit balances, subscription state, Stripe↔user mappings
```

---

## 1. Environments

| Environment    | Domain                               | Stripe mode | Upstash DB    |
| -------------- | ------------------------------------ | ----------- | ------------- |
| **Local**      | `http://localhost:5173`              | Test        | Staging DB    |
| **Staging**    | `https://webapp-refactor.vercel.app` | Test        | Staging DB    |
| **Production** | `https://app.musicatlas.io`          | Live        | Production DB |

**Vercel env var scoping:** Each variable can be scoped to Production, Preview, or Development in Project Settings → Environment Variables. Use this to give staging and production different Stripe keys and Redis databases while sharing OAuth credentials.

---

## 2. JWT Secret

The frontend serverless functions verify JWTs using the same secret the backend signs them with.

1. Find the backend's `JWT_SECRET` — check the backend Vercel project or ask your team
2. Set it as `JWT_SECRET` in the Webapp-Refactor Vercel project (all scopes)
3. The JWT payload is `{ user_id: string, role: string }` with a 24-hour expiry

> Both repos **must** use the same `JWT_SECRET`. If they don't match, token verification will fail and all authenticated API routes will return 401.

---

## 3. Upstash Redis

Credit balances and subscription state live in Upstash Redis. It uses a REST API (no persistent TCP connection), which is ideal for Vercel serverless functions.

### Create your account

1. Open your browser and go to **https://console.upstash.com**
2. Click **Sign Up** (top-right). You can sign up with GitHub, Google, or email.
3. After sign-up you'll land on the Upstash dashboard — a page with a green sidebar on the left.

### Create the staging database

4. On the dashboard, click the **Create Database** button (green button, center of the page).
5. A form appears:
   - **Name**: type `music-atlas-staging`
   - **Type**: select **Regional** (not Global — it's simpler and cheaper)
   - **Region**: select **US-East-1 (N. Virginia)** — this matches Vercel's default `iad1` region for lowest latency
   - **Eviction**: leave **OFF** (we don't want data automatically deleted)
   - **TLS**: leave enabled (default)
6. Click **Create**.
7. You'll land on the database detail page. You'll see tabs: **CLI**, **REST API**, **Details**, etc.
8. Click the **REST API** tab.
9. You'll see two fields with copy buttons:
   - **UPSTASH_REDIS_REST_URL** — looks like `https://xxxxx.upstash.io` → this is your `KV_REST_API_URL`
   - **UPSTASH_REDIS_REST_TOKEN** — a long string starting with `AXxx...` → this is your `KV_REST_API_TOKEN`
10. Copy both values and save them somewhere (you'll paste them into Vercel later).

### Create the production database

11. Click the **Upstash** logo (top-left of the sidebar) to go back to the dashboard.
12. Click **Create Database** again.
13. Same settings but name it `music-atlas-production`.
14. After creation, go to the **REST API** tab and copy both values.

You now have 4 values total: 2 URLs + 2 tokens (one pair per database).

### Vercel env var scoping

| Variable            | Development   | Preview       | Production       |
| ------------------- | ------------- | ------------- | ---------------- |
| `KV_REST_API_URL`   | staging URL   | staging URL   | production URL   |
| `KV_REST_API_TOKEN` | staging token | staging token | production token |

### Verify it's working

After deploying, you can go back to the Upstash console, click into your database, and click the **Data Browser** tab. After a user signs up, you should see keys like `user:xxxxx:credits` appear here.

### Redis key schema (automatic — no manual setup)

| Key                            | Value                                                                | Created by                                                              |
| ------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `user:{userId}:credits`        | `{ balance, lifetimeUsed, lastRefresh }`                             | OAuth sign-up (50 free credits) and Stripe webhook (refresh on renewal) |
| `user:{userId}:subscription`   | `{ tier, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd }` | Stripe webhook after checkout                                           |
| `stripe:customer:{customerId}` | `userId` (string)                                                    | Stripe checkout completion                                              |

---

## 4. Google OAuth

### A. Create a Google Cloud project (skip if you already have one)

1. Open **https://console.cloud.google.com**
2. Sign in with your Google account.
3. At the top of the page, click the **project dropdown** (next to "Google Cloud" logo — it might say "Select a project" or show your existing project name).
4. In the popup, click **New Project** (top-right of the popup).
5. **Project name**: `Music Atlas`
6. **Organization**: leave as default or select yours.
7. Click **Create**. Wait a few seconds, then select the new project from the dropdown.

### B. Configure the OAuth consent screen (must do this BEFORE creating credentials)

8. In the left sidebar, click **APIs & Services** (you may need to scroll down or search for it in the top search bar — type "APIs & Services").
9. In the APIs & Services sub-menu, click **OAuth consent screen** (left sidebar, below "Credentials").
10. If prompted to choose user type:
    - Select **External** (allows any Google account to sign in).
    - Click **Create**.
11. Fill in the **App information** form:
    - **App name**: `Music Atlas`
    - **User support email**: select your email from the dropdown
    - **App logo**: optional (you can upload later)
12. Scroll down to **App domain** (optional for testing, required for production):
    - **Application home page**: `https://musicatlas.io`
    - **Privacy policy link**: `https://musicatlas.io/privacy` (you'll need this to go live)
    - **Terms of service link**: `https://musicatlas.io/terms` (optional)
13. Scroll down to **Developer contact information**:
    - Enter your email address.
14. Click **Save and Continue**.
15. **Scopes** page: click **Add or Remove Scopes**. In the panel that opens:
    - Check these three scopes:
      - `.../auth/userinfo.email` (row says "See your primary Google Account email address")
      - `.../auth/userinfo.profile` (row says "See your personal info...")
      - `openid` (row says "Associate you with your personal info on Google")
    - Click **Update** at the bottom of the panel.
16. Click **Save and Continue**.
17. **Test users** page: click **Add Users**, type your own email, click **Add**, then **Save and Continue**.
18. **Summary** page: review and click **Back to Dashboard**.

> **Important**: While the consent screen is in "Testing" mode, only the test users you added can log in. To allow anyone to sign in, you'll need to click **Publish App** on the consent screen page later (Google may require verification for production).

### C. Create OAuth credentials

19. In the left sidebar (still under APIs & Services), click **Credentials**.
20. At the top, click **+ Create Credentials** → select **OAuth client ID**.
21. **Application type**: select **Web application** from the dropdown.
22. **Name**: `Music Atlas Web`
23. Scroll down to **Authorized JavaScript origins** — leave this empty (not needed for server-side flow).
24. Scroll down to **Authorized redirect URIs** — click **+ Add URI** three times and enter:
    ```
    http://localhost:5173/api/auth/google
    https://webapp-refactor.vercel.app/api/auth/google
    https://app.musicatlas.io/api/auth/google
    ```
    (One URI per row. Click **+ Add URI** to add each new row.)
25. Click **Create**.
26. A popup appears showing your credentials:
    - **Client ID**: looks like `123456789-xxxxxxxx.apps.googleusercontent.com`
    - **Client Secret**: looks like `GOCSPX-xxxxxxxxxxxx`
27. Copy both. You can also click **Download JSON** if you want a backup, but you only need the two strings.

### Vercel env vars

| Variable               | Value                                           | Scope                                    |
| ---------------------- | ----------------------------------------------- | ---------------------------------------- |
| `GOOGLE_CLIENT_ID`     | `123456789-xxxxxxxx.apps.googleusercontent.com` | All (Production + Preview + Development) |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxxxxxxxxx`                           | All (Production + Preview + Development) |

> Same credentials work for all environments because all three redirect URIs are registered on the same OAuth client.

---

## 5. Apple Sign-In

### Prerequisites

- An Apple Developer account — **https://developer.apple.com** ($99/year)
- You must be enrolled in the Apple Developer Program (not just have an Apple ID)

### A. Register an App ID

1. Go to **https://developer.apple.com/account**
2. Sign in with your Apple ID.
3. In the left sidebar, click **Certificates, Identifiers & Profiles**.
4. In the left sidebar of that page, click **Identifiers**.
5. Click the blue **+** button (top-left, next to "Identifiers" heading).
6. On the "Register a new identifier" page, select **App IDs** → click **Continue**.
7. Select type **App** → click **Continue**.
8. Fill in:
   - **Description**: `Music Atlas`
   - **Bundle ID**: select **Explicit**, then enter: `io.musicatlas.app`
9. Scroll down the **Capabilities** list. Find **Sign in with Apple** and check the checkbox next to it.
10. Click **Continue** → review the summary → click **Register**.

### B. Register a Services ID

This is what the web app uses (separate from the App ID which is for native iOS apps).

11. Go back to **Identifiers** (left sidebar).
12. Click the blue **+** button again.
13. On the "Register a new identifier" page, select **Services IDs** → click **Continue**.
14. Fill in:
    - **Description**: `Music Atlas Web`
    - **Identifier**: `io.musicatlas.web`
15. Click **Continue** → click **Register**.
16. You'll be taken back to the Identifiers list. Find and click on **Music Atlas Web** (`io.musicatlas.web`) to edit it.
17. Check the checkbox next to **Sign in with Apple** to enable it.
18. Click **Configure** (the button that appears next to the checkbox after enabling).
19. A configuration panel opens:
    - **Primary App ID**: select `Music Atlas (io.musicatlas.app)` from the dropdown.
    - **Domains and Subdomains**: click the **+** and add:
      - `webapp-refactor.vercel.app`
      - `app.musicatlas.io`
    - **Return URLs**: click the **+** and add:
      - `https://webapp-refactor.vercel.app/api/auth/apple`
      - `https://app.musicatlas.io/api/auth/apple`
20. Click **Next** → click **Done**.
21. Back on the Services ID page, click **Continue** → click **Save**.

> The **Identifier** you entered (`io.musicatlas.web`) is your `APPLE_CLIENT_ID`.

### C. Create a Sign-In key

22. In the left sidebar, click **Keys**.
23. Click the blue **+** button.
24. Fill in:
    - **Key Name**: `Music Atlas Sign In`
25. Check the checkbox next to **Sign in with Apple**.
26. Click **Configure** next to it.
27. **Primary App ID**: select `Music Atlas (io.musicatlas.app)` from the dropdown.
28. Click **Save**.
29. Click **Continue** → click **Register**.
30. **IMPORTANT**: You'll see a page with:
    - **Key ID**: a 10-character alphanumeric string like `ABC1234DEF` → this is your `APPLE_KEY_ID`
    - A **Download** button for the `.p8` file.
31. Click **Download**. The file is named something like `AuthKey_ABC1234DEF.p8`.

> **You can only download this file ONCE.** If you lose it, you'll need to revoke the key and create a new one. Save it securely.

### D. Find your Team ID

32. Look at the **top-right corner** of the Apple Developer portal. Next to your name, you'll see a 10-character alphanumeric string (like `9A8B7C6D5E`). This is your `APPLE_TEAM_ID`.

Alternatively: go to **Membership** in the left sidebar — your Team ID is listed there.

### E. Format the private key for Vercel

33. Open the downloaded `.p8` file in any text editor (TextEdit, VS Code, etc.). It looks like:
    ```
    -----BEGIN PRIVATE KEY-----
    MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
    ...more base64 lines...
    -----END PRIVATE KEY-----
    ```
34. You need to turn this into a **single line** by replacing every line break with the literal characters `\n`. The result should look like:
    ```
    -----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n...more base64...\n-----END PRIVATE KEY-----
    ```
35. Quick way to do this on Mac terminal:
    ```bash
    cat AuthKey_XXXXXXXXXX.p8 | tr '\n' '?' | sed 's/?/\\n/g'
    ```
    Copy the output — that's your `APPLE_PRIVATE_KEY` value.

### Vercel env vars

| Variable            | Example value                                                        | Scope                                    |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| `APPLE_CLIENT_ID`   | `io.musicatlas.web`                                                  | All (Production + Preview + Development) |
| `APPLE_TEAM_ID`     | `9A8B7C6D5E`                                                         | All                                      |
| `APPLE_KEY_ID`      | `ABC1234DEF`                                                         | All                                      |
| `APPLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\nMIGTAgE...\n-----END PRIVATE KEY-----` | All                                      |

> Same credentials work for all environments because both return URLs are registered on the same Services ID.

---

## 6. Stripe

Stripe requires **separate configuration** for staging (test mode) and production (live mode). You'll create products, prices, API keys, and webhooks in **both** modes.

### A. Create your Stripe account

1. Go to **https://dashboard.stripe.com**
2. Sign up or log in.
3. After login, you'll land on the Stripe Dashboard home page.

### B. Switch to test mode (for staging setup)

4. Look at the **top-right area** of the dashboard. You'll see a toggle labeled **Test mode**. Make sure it's **ON** (toggled to the right, showing "Test mode" with an orange/yellow indicator).
   - When test mode is ON, everything you create is sandboxed — no real money is charged.

### C. Create a product with two prices

5. In the left sidebar, click **Product catalog** (or **Products** — Stripe sometimes changes the label).
6. Click the **+ Add product** button (top-right).
7. Fill in:
   - **Name**: `Music Atlas`
   - **Description**: optional (e.g. "AI music generation credits")
8. Under **Pricing**, you'll see a form to add a price. Fill in the first price:
   - **Pricing model**: select **Standard pricing**
   - **Price**: `$10.00`
   - **Billing period**: select **Monthly** (from the "Recurring" dropdown)
   - Optionally add a **Price description**: `Artist tier`
9. Click **Add another price** (link below the first price).
10. Fill in the second price:
    - **Price**: `$20.00`
    - **Billing period**: **Monthly**
    - **Price description**: `Studio tier`
11. Click **Save product** (top-right).
12. You'll land on the product detail page. Under **Pricing**, you'll see two rows. Each has a **Price ID** that looks like `price_1Oxxxxxxxxxxxxxxxx`.
    - Click on each price row to see its details, or hover to see the ID.
    - Copy both Price IDs:
      - The $10/month one → `STRIPE_PRICE_ARTIST` (test)
      - The $20/month one → `STRIPE_PRICE_STUDIO` (test)

### D. Get your test API key

13. In the left sidebar, click **Developers** (at the very bottom of the sidebar). If you don't see it, click **More +** first.
14. Click **API keys** (in the Developers sub-menu).
15. You'll see:
    - **Publishable key**: `pk_test_...` (you don't need this)
    - **Secret key**: click **Reveal test key** → copy the key that starts with `sk_test_...`
16. This is your `STRIPE_SECRET_KEY` for staging.

### E. Create the staging webhook

17. Still in the Developers section, click **Webhooks** in the left sidebar.
18. Click **+ Add endpoint** (or **Add an endpoint**).
19. **Endpoint URL**: enter `https://webapp-refactor.vercel.app/api/stripe/webhook`
20. **Description**: optional (e.g. "Music Atlas staging")
21. Click **+ Select events** (or **Select events to listen to**).
22. In the event selector, you can either:
    - Search for each event by name, OR
    - Browse categories: `checkout` → `checkout.session.completed`, `customer` → `customer.subscription.updated` and `customer.subscription.deleted`, `invoice` → `invoice.payment_succeeded` and `invoice.payment_failed`
23. Select these **5 events**:
    - `checkout.session.completed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`
24. Click **Add endpoint**.
25. You'll land on the endpoint detail page. Find the **Signing secret** section — click **Reveal** (or the eye icon) to see it. It starts with `whsec_...`.
26. Copy this — it's your `STRIPE_WEBHOOK_SECRET` for staging.

### F. Repeat for live mode (production)

27. Go back to the dashboard home. Toggle **Test mode OFF** (so you're in live mode).
28. **Repeat steps 5–12** to create the same product and two prices in live mode.
    - You'll get **different** Price IDs: `price_xxxx` (live) — copy them for production.
29. **Repeat steps 13–16** to get the live secret key: `sk_live_...`
30. **Repeat steps 17–26** to create a production webhook:
    - Endpoint URL: `https://app.musicatlas.io/api/stripe/webhook`
    - Same 5 events.
    - Copy the live signing secret: `whsec_...` (different from the test one).

### G. Configure Customer Portal

The Customer Portal lets users manage their own subscription (cancel, switch plans) without you building a custom UI.

31. In the left sidebar, click **Settings** (gear icon at the bottom).
32. In the Settings page, search for **Customer portal** in the search bar, or navigate: **Billing** → **Customer portal**.
33. You'll see the Customer Portal configuration page:
    - **Functionality**: ensure these are enabled:
      - **Allow customers to cancel subscriptions** → ON
      - **Allow customers to switch plans** → ON (and add your two prices so they can up/downgrade)
    - **Business information**: add your company name, privacy policy link, terms link
    - **Branding**: optionally upload your logo and set accent color
34. Click **Save** at the top.

> You need to configure the Customer Portal in **both** test mode and live mode.

### Vercel env vars

| Variable                | Staging (Preview + Dev)         | Production                         |
| ----------------------- | ------------------------------- | ---------------------------------- |
| `STRIPE_SECRET_KEY`     | `sk_test_xxxx`                  | `sk_live_xxxx`                     |
| `STRIPE_PRICE_ARTIST`   | `price_xxxx` (from test mode)   | `price_xxxx` (from live mode)      |
| `STRIPE_PRICE_STUDIO`   | `price_xxxx` (from test mode)   | `price_xxxx` (from live mode)      |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxx` (staging endpoint) | `whsec_xxxx` (production endpoint) |

### Local testing with Stripe CLI

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login
# This opens a browser window — click "Allow access"

# Forward webhook events to your local dev server
stripe listen --forward-to http://localhost:5173/api/stripe/webhook
# The CLI prints a webhook signing secret: "Ready! Your webhook signing secret is whsec_..."
# Use this as your local STRIPE_WEBHOOK_SECRET in your .env file

# In another terminal, trigger a test event:
stripe trigger checkout.session.completed
```

**Test card numbers:**

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`
- Any future expiry date, any 3-digit CVC, any 5-digit ZIP.

---

## 7. Backend — Deploy the OAuth route

The backend (`music-atlas-api`) needs the new `/auth/oauth` endpoint so the OAuth flows can create/find users.

1. The new files are already created:
   - `src/services/auth/oauth-login.ts` — looks up user by email; if found returns JWT, if not creates a new user and returns JWT
   - `src/server/controllers/auth.ts` — registers `POST /auth/oauth`
2. Commit and push to GitHub:
   ```bash
   cd /path/to/music-atlas-api
   git add src/services/auth/oauth-login.ts src/server/controllers/auth.ts
   git commit -m "Add POST /auth/oauth endpoint for Google and Apple sign-in"
   git push
   ```
3. Vercel auto-deploys on push. Wait for the deployment to complete (check the Vercel dashboard or GitHub checks).
4. Set `MUSIC_ATLAS_API_URL` in the **Webapp-Refactor** Vercel project to point to the deployed backend URL (e.g. `https://api-refactor.vercel.app`). This is the URL the serverless functions call internally.

---

## 8. Setting Env Vars in Vercel (step-by-step)

1. Go to **https://vercel.com/dashboard**
2. Click on the **Webapp-Refactor** project.
3. Click **Settings** (tab at the top, between "Deployments" and "Analytics").
4. In the left sidebar, click **Environment Variables**.
5. For each variable:
   - **Key**: type the variable name (e.g. `GOOGLE_CLIENT_ID`)
   - **Value**: paste the value
   - **Environment**: check the boxes for where it applies:
     - **Production**: the `app.musicatlas.io` deployment
     - **Preview**: branch deployments + `webapp-refactor.vercel.app`
     - **Development**: `vercel dev` local
   - Click **Save**

**For variables that differ between staging and production** (Redis and Stripe), add the variable **twice**:

- First: enter the staging value → check only **Preview** + **Development** → Save
- Second: enter the production value → check only **Production** → Save

### Full variable list

| #   | Variable                   | Value                              | Environments          |
| --- | -------------------------- | ---------------------------------- | --------------------- |
| 1   | `VITE_MUSIC_ATLAS_API_URL` | `https://api-refactor.vercel.app/` | All                   |
| 2   | `MUSIC_ATLAS_API_URL`      | `https://api-refactor.vercel.app`  | All                   |
| 3   | `JWT_SECRET`               | (from backend)                     | All                   |
| 4   | `GOOGLE_CLIENT_ID`         | (from Google step C.26)            | All                   |
| 5   | `GOOGLE_CLIENT_SECRET`     | (from Google step C.26)            | All                   |
| 6   | `APPLE_CLIENT_ID`          | `io.musicatlas.web`                | All                   |
| 7   | `APPLE_TEAM_ID`            | (from Apple step D.32)             | All                   |
| 8   | `APPLE_KEY_ID`             | (from Apple step C.30)             | All                   |
| 9   | `APPLE_PRIVATE_KEY`        | (from Apple step E.34)             | All                   |
| 10  | `KV_REST_API_URL`          | staging URL                        | Preview + Development |
| 11  | `KV_REST_API_URL`          | production URL                     | Production            |
| 12  | `KV_REST_API_TOKEN`        | staging token                      | Preview + Development |
| 13  | `KV_REST_API_TOKEN`        | production token                   | Production            |
| 14  | `STRIPE_SECRET_KEY`        | `sk_test_...`                      | Preview + Development |
| 15  | `STRIPE_SECRET_KEY`        | `sk_live_...`                      | Production            |
| 16  | `STRIPE_PRICE_ARTIST`      | test price ID                      | Preview + Development |
| 17  | `STRIPE_PRICE_ARTIST`      | live price ID                      | Production            |
| 18  | `STRIPE_PRICE_STUDIO`      | test price ID                      | Preview + Development |
| 19  | `STRIPE_PRICE_STUDIO`      | live price ID                      | Production            |
| 20  | `STRIPE_WEBHOOK_SECRET`    | staging `whsec_...`                | Preview + Development |
| 21  | `STRIPE_WEBHOOK_SECRET`    | production `whsec_...`             | Production            |

That's 21 entries total (14 unique variables, 7 of which are entered twice with different scopes).

After adding all variables, **redeploy** for them to take effect: go to the **Deployments** tab → click the three dots on the latest deployment → **Redeploy**.

---

## 9. Testing Checklist

### Local development

- [ ] Copy `.env.example` to `.env` and fill in all values (use staging credentials)
- [ ] `npm run dev` starts without env errors
- [ ] Navigate to `http://localhost:5173/api/auth/google` → redirects to Google consent screen
- [ ] After Google consent, redirected back to `http://localhost:5173/auth/sign-in#token=...`
- [ ] The app reads the token from the URL hash and logs you in automatically
- [ ] Open browser devtools → Network → check that `/api/credits/balance` returns `{ balance: 50, lifetimeUsed: 0, tier: "free" }` for new users
- [ ] Credits badge shows "50" in the sidebar

### Stripe (staging, test mode)

- [ ] Click an upgrade button → opens Stripe Checkout page
- [ ] Use test card `4242 4242 4242 4242` (any expiry, any CVC) → checkout succeeds
- [ ] Redirected back to app with `?checkout=success`
- [ ] Check Stripe Dashboard → Developers → Webhooks → click your endpoint → "Recent events" shows `checkout.session.completed` with 200 response
- [ ] Check Upstash console → Data Browser → `user:{id}:subscription` now shows `tier: "artist"` or `"studio"`
- [ ] Credits badge updates to 100 (artist) or 200 (studio)
- [ ] Click "Manage billing" → Stripe Customer Portal opens → can cancel subscription
- [ ] After cancellation, check webhook receives `customer.subscription.deleted` → tier reverts to "free"

### Upstash verification

- [ ] Open Upstash console → click your database → **Data Browser** tab
- [ ] After sign-up: search for `user:` → find `user:{id}:credits` with `balance: 50`
- [ ] After Stripe checkout: find `user:{id}:subscription` with correct tier
- [ ] After Stripe checkout: find `stripe:customer:{id}` mapping to the user ID

### Production go-live

- [ ] All 21 env var entries set in Vercel (see section 8)
- [ ] Vercel redeployed after adding env vars
- [ ] Stripe products/prices created in live mode with correct Price IDs
- [ ] Stripe webhook created for `https://app.musicatlas.io/api/stripe/webhook` in live mode
- [ ] Google OAuth consent screen: clicked **Publish App** (or submitted for verification)
- [ ] Apple Services ID has `app.musicatlas.io` in both Domains and Return URLs
- [ ] End-to-end test: sign up via Google → get 50 credits → upgrade to Artist → credits refresh to 100 → portal works → cancel → reverts to free

---

## API Routes Reference

| Method | Path                   | Auth             | Description                                        |
| ------ | ---------------------- | ---------------- | -------------------------------------------------- |
| GET    | `/api/auth/google`     | No               | Initiates Google OAuth flow (redirects to Google)  |
| GET    | `/api/auth/apple`      | No               | Initiates Apple Sign-In flow (redirects to Apple)  |
| POST   | `/api/auth/apple`      | No               | Apple callback (form_post from Apple's servers)    |
| POST   | `/api/stripe/checkout` | Bearer JWT       | Creates Checkout Session, returns `{ url }`        |
| POST   | `/api/stripe/webhook`  | Stripe signature | Handles subscription lifecycle events              |
| POST   | `/api/stripe/portal`   | Bearer JWT       | Creates Customer Portal session, returns `{ url }` |
| GET    | `/api/credits/balance` | Bearer JWT       | Returns `{ balance, lifetimeUsed, tier }`          |
| POST   | `/api/credits/consume` | Bearer JWT       | Deducts 1 credit, returns `{ success, remaining }` |

### Tiers and credits

| Tier   | Price         | Credits                                  |
| ------ | ------------- | ---------------------------------------- |
| Free   | $0 (one-time) | 50 lifetime                              |
| Artist | $10/month     | 100/month (refreshed each billing cycle) |
| Studio | $20/month     | 200/month (refreshed each billing cycle) |
