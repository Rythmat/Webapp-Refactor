# Optimization Baseline — 2026-06-10

Captured on commit `a27c8909` (branch `optimize/phase-1-baseline`, off `aaron`). All later phases measure their impact against the numbers here.

## How this was captured

```
nvm use 20
NODE_OPTIONS="--max-old-space-size=8192" npm run analyze   # → bundle.html
npm run knip                                               # → knip.txt
npm run depcheck                                           # → depcheck.txt
npm run coverage                                           # vitest run --coverage
```

Raw stdout from `analyze` and `coverage` is omitted from the repo because the project's `.gitignore` excludes `*.log`. Re-run the commands above to regenerate.

## Files

| File           | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `bundle.html`  | rollup-plugin-visualizer treemap of the production build |
| `knip.txt`     | knip output — unused files, exports, types, deps         |
| `depcheck.txt` | depcheck output — unused dependencies                    |

## Headline numbers

- **Unused files surfaced by knip:** 219 — see `knip.txt`. Triage target for Phase 3.
- **Unused dependencies surfaced by depcheck:**
  - 11 in `dependencies`
  - 12 in `devDependencies`
  - Several are likely false positives (e.g. `autoprefixer`, `postcss`, `@vitest/coverage-v8`, `dependency-cruiser` are config-only). Phase 6 will verify each before removal.
- **Bundle treemap:** open `bundle.html` in a browser. Heaviest vendor chunks expected: `three`, `tone`, `spessasynth_lib`, `framer-motion`, `recharts`.
- **Tests:** 1613 passing / 2 failing (in `src/curriculum/__tests__/genre-coverage.test.ts`). The 2 failures are pre-existing on `aaron`; out of scope for this PR.

## What's NOT captured here

- A coverage `%` report — vitest aborted reporting because 2 tests fail. Phase 9 (coverage thresholds + critical-path tests) will fix the failing tests and emit a real coverage table.
- A `dependency-cruiser` graph — the tool was installed for future use; running it usefully requires a config that's deferred to Phase 3 / Phase 6.

## Notes on findings to investigate later

From `depcheck.txt`:

- `@vitejs/plugin-react` — confirmed orphan; `vite.config.ts` uses the SWC variant only. **Phase 6.**
- `pdf-parse` — flagged unused; confirm against `src/`. **Phase 6.**
- `@uiw/react-md-editor`, `react-diff-view`, `react-dnd*`, `react-dropzone`, `stripe`, `@upstash/redis` (not listed but worth checking) — verify usage before removal in **Phase 6**.

From `knip.txt`:

- 219 unused files. Heavy concentration in `src/components/Games/*`, `src/components/ClassroomLayout/dashboard/assistant/*`, `src/components/atlas/components/UI/*` — likely cluster-deletable in **Phase 3**.
