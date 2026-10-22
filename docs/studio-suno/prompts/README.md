# Studio on the Suno frame: prompt pack

This pack replaces the retired `docs/prompts/studio-overhaul/` pack (removed in `7d28a11e`; history at `487930ff`).

**Sources:**

- [`../anatomy.md`](../anatomy.md): what Suno Studio is, with screenshots **[sNN]** in `~/Desktop/References/suno-studio-2026-10-21/shots/`;
- [`../under-the-hood.md`](../under-the-hood.md): its architecture as observed;
- [`../spec.md`](../spec.md): what our Studio becomes, region by region;
- [`../generation.md`](../generation.md): models, the agent and the job service.

**Owner gate before S0:** the owner reviews `spec.md`, `generation.md` and this pack. **No `src/` change happens before that review.**

## Rules for every prompt

1. **Copy the design, not the product:**
   - Match Suno's structure, sizes, flows and motion from `anatomy.md` and the screenshots.
   - **Never** put Suno code, assets, fonts, icons or wording in the repo.
   - Our brand: **Glacial** for all text, Music Atlas tokens, our icons and our copy.
2. **Where to work:** one checkout (`Webapp-Refactor`), branch `aaron`. Commit with a pathspec, because other sessions may have files staged. Push only verified milestones, and only from this checkout.
3. **Verify every prompt with:**
   - vitest for the touched areas;
   - the existing harness (lessons, round trips, goldens) where the area has coverage;
   - **Chrome on dev server 5263**, with side-by-side screenshots against the cited [sNN], at 1477 and at the Chromebook size 1366×655.
4. **Keep the engine.** The store, PlaybackScheduler, collab, persistence, harmony, Prism, Score and Oracle are reused. Any schema change bumps the session schema with a migration and a round-trip test.
5. **Record each prompt** in [`STATUS.md`](STATUS.md): commits, what was verified, open items, owner questions.

## Order

| #   | Prompt                                                                  | Depends on          | Owner gate                         |
| --- | ----------------------------------------------------------------------- | ------------------- | ---------------------------------- |
| S0  | [Tokens + frame skeleton](S0-tokens-and-frame.md)                       | review of this pack | —                                  |
| S1  | [Top bar and transport](S1-top-bar.md)                                  | S0                  | —                                  |
| S2  | [Track column, timeline, clips](S2-tracks-timeline-clips.md)            | S0                  | —                                  |
| S3  | [Clip editing and the clip menu](S3-clip-editing.md)                    | S2                  | —                                  |
| S4  | [Bottom bar, docked panels, Library drawer](S4-panels-and-library.md)   | S1, S2              | —                                  |
| S5  | [Devices, effect picker, Mix restyle](S5-devices-effects-mix.md)        | S4                  | —                                  |
| S6  | [Audio import + storage](S6-audio-import.md)                            | S2                  | **storage**                        |
| S7  | [Warp, time-stretch, pitch](S7-warp-stretch-pitch.md)                   | S6                  | —                                  |
| S8  | [Takes + generation service + mock](S8-takes-and-generation-service.md) | S3, S6              | **GPU host, Foundation-1 licence** |
| S9  | [Prompt bar + agent](S9-prompt-bar-agent.md)                            | S8                  | **agent budget, Premium?**         |
| S10 | [Stems + convert to notes](S10-stems-and-notes.md)                      | S8                  | —                                  |
| S11 | [Export menu + version history](S11-export-and-versions.md)             | S4                  | —                                  |
| S12 | [Music Atlas surfaces in the frame](S12-music-atlas-surfaces.md)        | S4, S9              | —                                  |
| S13 | [Teaching features](S13-teaching.md)                                    | S12                 | API contract                       |
| S14 | [Learn mode, tutorials, courses](S14-learn-and-tutorials.md)            | S5, S12             | lesson copy                        |
| S15 | [Accessibility, performance, exit](S15-exit.md)                         | all                 | **exit review**                    |

S6 and S7 can run beside S3–S5. Run S8 only after its gates are answered; until then the generation surfaces run on the mock provider.
