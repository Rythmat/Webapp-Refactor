# Home Dashboard — Responsive Architecture

Last revised: 2026-05-25. Owners: Aaron + future-self.

## Why this document exists

The Home Dashboard ([src/components/ClassroomLayout/HomeInlet.tsx](../src/components/ClassroomLayout/HomeInlet.tsx)) went through ~5 iterations of viewport-based media queries + flex ratios + absolute overlays + `overflow-hidden` cards. Every fix broke a different viewport. The pattern was fundamentally fragile: viewport-based media queries can't see the container an element actually lives in, and `overflow-hidden` hides layout mismatches as content crops.

This doc records the architectural decisions that replaced the patch tower with a durable layout.

## The three primitives

1. **CSS Grid template areas** for the dashboard's outer layout.
2. **Container queries** for any element whose size depends on its container, not the viewport (banner overlays, dense cards).
3. **Scrollable card shells** (Radix ScrollArea) — every card has a sticky header + an internally-scrollable body. Cards never crop; they scroll their own content when squeezed.

The dashboard itself does NOT manage scroll — the parent `<main>` wrapper at `src/layouts/DashboardLayout/ClassroomDashboard.tsx` already has `overflow-y-auto` on the inner div. Don't duplicate.

## Three layout regimes

Driven by viewport breakpoints (Tailwind defaults):

| Regime          | Viewport              | Grid template                                                                                                              |
| --------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **compact**     | < md (640–768 px)     | 1 column: banner → quickstart → featured → calendar → recent → challenges (vertical stack)                                 |
| **comfortable** | md ≤ lg (768–1024 px) | 2 columns: banner spans both → quickstart + featured side by side → calendar spans both → recent + challenges side by side |
| **expansive**   | ≥ lg (1024+ px)       | 3 columns: banner spans all (with QuickStart + Featured as absolute overlays) → calendar + recent + challenges             |

Implemented as `grid-template-areas` with Tailwind responsive variants.

## Design tokens (CSS custom properties)

Defined on the dashboard root, consumed by cards. Keeps "spacing magic numbers" in one place.

```css
.dashboard {
  --dash-card-pad: clamp(0.85rem, 1.3vw, 1.5rem);
  --dash-card-gap: clamp(0.75rem, 1.3vw, 1.5rem);
  --dash-banner-h: clamp(200px, 32vh, 380px); /* compact + comfortable */
  --dash-card-min-h: 280px; /* expansive — protects against squeeze */
  --dash-icon-sz: clamp(0.95rem, 1.25vw, 1.15rem);
  --dash-label-fz: clamp(0.75rem, 1.05vw, 1rem);
}
```

Cards reference them via `padding: var(--dash-card-pad)` etc. Six tokens total — bounded to keep the system memorable.

The dashboard intentionally has **no max-width cap** — components stretch to fill the viewport on wide screens (2560 px+) by design. If you find yourself adding `max-width` to the dashboard root, talk to the owner first.

## The `CardShell` primitive

[src/components/ui/CardShell.tsx](../src/components/ui/CardShell.tsx) — every dashboard card uses it.

```tsx
<CardShell
  header={<HeaderRow icon={Clock} title="May 2026" />}
  containerName="card"
>
  {/* body — scrolls internally if it exceeds available height */}
</CardShell>
```

What it provides:

- Glass-panel chrome with rounded corners.
- Sticky header row inside the rounded boundary.
- Body region wrapped in Radix `<ScrollArea>` — touch + keyboard + RTL + scrollbar styling handled.
- `container-type: inline-size; container-name: card;` so children can react to the SHELL's width with `@sm:flex-col` etc.

**Pitfall:** Don't add `overflow-hidden` to the body. That defeats ScrollArea and reintroduces cropping.

## Why container queries (not viewport queries) for cards

A card 25% as wide as the dashboard could be:

- 400 px wide on a 1600 px wide dashboard
- 200 px wide on an 800 px wide dashboard

Same viewport state (e.g., `lg:`), wildly different card widths. Viewport queries fail to express this. Container queries on the card itself adapt to its own width regardless of the layout context.

Particularly important when the dashboard is embedded in a layout with a sidebar (a 1280 px viewport with a 280 px sidebar gives the dashboard 1000 px — viewport says `xl`, dashboard says "compact").

## Browser support note

Container queries: Chrome 105+, Safari 16+, Firefox 110+. Covers ~96% of the 2026 web. For older Safari (< 16) we accept ungraceful degradation (the card just won't shrink optimally — content still readable via ScrollArea).

## Pitfalls (the things that already broke us once)

- ❌ Adding `overflow-y-auto` to HomeInlet's outer div — the parent already scrolls; you'll create competing scrollbars.
- ❌ Using `flex-[3]` / `flex-[2]` to distribute height — fragile when content needs differ from flex ratio. Use grid-template-rows: `auto 1fr` instead, with cards handling their own internal scroll.
- ❌ Adding `overflow-hidden` to any card body — content gets clipped, not scrolled. Use `CardShell` (which uses ScrollArea internally).
- ❌ Sizing banner overlays in viewport % (`w-[25%]`) — they should use container query units (`w-[min(22cqw,22rem)]`) so they resize with the banner, not the viewport.
- ❌ Tuning numbers without screenshots at every viewport size — use the `/__dashboard-qa` route for ground truth.

## When making changes to the dashboard

Before changing layout-sensitive code in `src/components/ClassroomLayout/`:

1. Read this doc.
2. Open `/__dashboard-qa` (dev-only route) — shows the dashboard at 9 widths side by side.
3. Make the change.
4. Re-check `/__dashboard-qa` — verify no regressions.
5. Run `yarn test:visual` if the visual-regression snapshot tests are wired.

## Rejected alternatives

- **Pure flexbox** — what we had. Too rigid for content-driven cards.
- **A UI library (shadcn/ui dashboard template)** — would replace too many existing components and conflict with the glass-panel design language already established. Reused only the `react-scroll-area` primitive (already a dependency).
- **JS-driven resizing (ResizeObserver)** — works but is heavier and loses the declarative readability of CSS Grid + container queries.
- **`min-height: 100vh` everywhere** — fights with the parent's overflow chain.

## Visual regression testing

**Current state**: manual via `/__dashboard-qa`. Run the dev server, open `http://localhost:5179/__dashboard-qa`, scroll through the 9 iframes. Compare against the previous commit's screenshots in your reviewer mind.

**Recommended next step (deferred)**: wire Playwright + visual snapshots so the CI fails on visual diff. Sketch:

```bash
yarn add -D @playwright/test
npx playwright install chromium
```

Test file at `tests/visual/dashboard.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
const WIDTHS = [375, 480, 640, 768, 1024, 1280, 1440, 1920, 2560];
for (const w of WIDTHS) {
  test(`dashboard @ ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('http://localhost:5179/');
    await expect(page).toHaveScreenshot(`dashboard-${w}.png`, {
      maxDiffPixelRatio: 0.001,
    });
  });
}
```

CI gates: only run on PRs touching `src/components/ClassroomLayout/**` or `src/components/ui/CardShell.tsx`. Use `yarn test:visual -u` to update baselines when an intentional change ships.

## Cross-browser / cross-device validation checklist

Whenever the dashboard ships a visual change, run through:

- [ ] Chrome (Mac + Windows, last 2 versions)
- [ ] Safari 17+ (macOS, iOS)
- [ ] Firefox latest
- [ ] Edge latest
- [ ] Touch device: iPhone SE (375), iPad mini (768) — confirm scrolling works inside CardShell bodies
- [ ] Keyboard: Tab through all interactive elements (challenges, recent project cards, featured card, quick start buttons); ScrollArea responds to ↑↓
- [ ] `prefers-reduced-motion: reduce` — banner crossfade pauses; CardShell scrollbar still functional
- [ ] RTL: set `<html dir="rtl">` — verify Featured card ends up on the left (grid template areas flip naturally)
- [ ] High-contrast / forced-colors: text remains readable

## Lint guardrails

`docs/dashboard-responsive.md` is the source of truth. If you find yourself adding `overflow-hidden` to a card body, **stop** — that's the pattern this doc was written to prevent. Use `CardShell` (which uses `ScrollArea` internally).

`CLAUDE.md` should reference this doc — see project memory for the exact entry.

## References

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [MDN: grid-template-areas](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-areas)
- [Tailwind container queries plugin](https://github.com/tailwindlabs/tailwindcss-container-queries)
- [Radix ScrollArea](https://www.radix-ui.com/primitives/docs/components/scroll-area)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
