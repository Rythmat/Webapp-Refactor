# Music Atlas Landing Page

The public landing at `/` is a **near-exact copy of the Home dashboard** for logged-out
visitors, minus the Recent Activity and Challenges sections.

## How it works

- Route: `/` → `<AppContext>` → `LandingGate` (no `ProtectedPage`). Logged-in users are
  redirected to their home; logged-out users get the landing.
  (`src/features/landing/LandingGate.tsx`, `LandingPages.tsx`.)
- `LandingDashboard.tsx` — a fork of `src/layouts/DashboardLayout/ClassroomDashboard.tsx`:
  the `.dashboard-root` chrome + a neutral top rail (`LandingTopRail.tsx`), **no left
  sidebar**, no auth-only mount hooks.
- `LandingHome.tsx` — a copy of `src/components/ClassroomLayout/HomeInlet.tsx` that reuses
  the **real** dashboard section components (`@/components/ClassroomLayout/dashboard/*`)
  minus `RecentActivitySection` + `ChallengesCard`. The greeting is a neutral placeholder
  ("Welcome to Music Atlas").

The dashboard sections are auth-safe (data hooks gate on `!!token`), so they render for
anonymous visitors with no mock data. SEO surface (`index.html` OG/JSON-LD, `public/robots.txt`,
`public/sitemap.xml`) is unchanged and still valid.

> A previous bespoke marketing landing (hero/pricing/FAQ/playable demo) was replaced by this
> dashboard clone. It was never committed; recover from git only if it was later branched.
