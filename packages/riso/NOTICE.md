# Provenance

This package is a TypeScript port of the procedural risograph engine from:

- **Upstream:** https://github.com/sevenevesai/riso-windowseat
- **Licence:** MIT — © 2026 sevenevesai. Full text in [LICENSE](./LICENSE), copied verbatim.
- **Pinned commit:** `64826c4f172b0d8322453b9a4eb20ee5fe73dfdf` (2026-09-23)
- **Local reference clone:** `~/Desktop/References/riso-windowseat` (read-only; never edited)

MIT requires the copyright and permission notice to travel with the software, **including in
bundled form**. If any of this reaches a production bundle, add a preserved banner:

```
/*! @license MIT — derived from github.com/sevenevesai/riso-windowseat, © 2026 sevenevesai */
```

## What was taken

| Upstream                                                                              | Ported to                                 | Notes                                         |
| ------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| `prints/workings/index.html` lines 25–643                                             | `src/core/**`, `src/canvas/**`            | The canonical engine. `K`-parametric.         |
| `studies/index.html` (`── craft kit ──`, `── motion kit ──`, `dotPattern`, `inkPass`) | `src/core/motion.ts`, `src/canvas/ink.ts` | Live-pass path absent from `prints/workings`. |
| `studies/index.html` (the 12 studies)                                                 | `src/studies/**`                          | Technique demos — also the parity fixture.    |
| `studies/composition.html` (`── lettering ──`)                                        | `src/canvas/lettering.ts`                 | Intertitles.                                  |
| `films/window-seat/index.html` lines 933–1110                                         | `src/canvas/plates.ts`                    | Live-plate compositor.                        |
| `tools/lib/visual-kit.mjs`                                                            | `src/core/space.ts`                       | Already pure; transcribed.                    |
| `tools/*.mjs`                                                                         | `tools/*.ts`                              |                                               |
| `docs/*.md`, `.claude/rules/riso-plates.md`                                           | `docs/`                                   | Copied with attribution.                      |

## What was deliberately NOT taken

- **Film art.** Every scene in `films/**` and `prints/workings/index.html` lines 644+. MIT permits
  copying it; it is someone else's authored work and shipping it as Music Atlas visuals would be a
  brand problem, not a legal one.
- **The window-seat piano bank.** Derived from Salamander Grand Piano V3 by Alexander Holm,
  **CC BY 3.0 — not covered by the MIT licence above**. Attribution-required and a licence-review
  item for a commercial product. Moot while the sound kit is deferred, but do not copy it later
  without that review.
- **The sound kit** (`── sound kit ──`, `Score`, instruments, BS.1770 mastering). Deferred: films
  are silent and the app supplies audio. Roughly 800 lines if it is ever wanted — and note that
  `studies/sound.html`'s `impulse()` has a normalisation bug (`sqrt(energy/rate)`); take
  `films/window-seat`'s version, which normalises discrete energy.
- **`tools/new-riso.mjs`.** It pastes engine blocks between literal string markers into a new
  standalone HTML file. That whole mechanism is what this package replaces.
