# S8: Takes, the generation service and the mock

**Owner gates:**

- the GPU host;
- audio storage (from S6);
- the Foundation-1 revenue condition.

**Goal:**

- Clips can hold **takes** you preview before committing [s16–s19].
- A job service runs our models.
- A **mock provider** lets the UI ship before the GPU host exists.

**Read first:**

- `../generation.md` (all of it);
- `../anatomy.md` §7;
- `store/tracksSlice.ts` (AudioClip), `audio/takeEvents.ts`, `session/takesInFlight.ts`;
- `store/prismSuggestionSlice.ts`.

## Build

1. **Take model:** a clip has `takes: TakeRef[]` and `activeTake`.

   - **Recordings:** loop recording adds a take per lap.
   - **Generations:** each result is a take.
   - **Prism:** suggestions become MIDI takes.

   Schema bump with a migration, and a collab doc bump.

2. **Take strip:** under an uncommitted clip: ✓ keep, ✕ discard, ▲▼ previous/next.
3. **Takes panel** (bottom toggle 4): one row per take, newest first, each with number, ✕, a waveform or notes mini-view, 👍 👎 and "use".
4. **Gateway:**
   - Locate the existing serverless layer first (memory says `api/challenges`; it isn't at the repo root).
   - Add `/api/studio/jobs` (POST/GET) with auth, quota and moderation hooks, and per-class generation flags.
5. **Inference service** in `services/generation/`, Python and FastAPI:
   - A worker per model: HeartMuLa-oss-3B, YuE v1 (the `YuE-v1` branch only), Foundation-1 / 1.2 Samples / 1.2 Keybeds, Demucs.
   - `models.lock` pins each model's revision, licence and checksum.
   - Each model has a prompt builder that turns Studio context (BPM, key, bars, chords, tags, lyrics) into its own format.
   - Deployment goes to the chosen GPU host.
6. **Client** in `src/daw/generation/`:
   - `jobClient` (start, poll, cancel);
   - `mockProvider` (pre-rendered files plus fake progress);
   - `credits` metering in our own units;
   - an "AI-generated" badge plus credit metadata on the clip.
7. **Bake-off:** HeartMuLa vs YuE v1 on 10 prompts. Record the results in STATUS before choosing which one makes songs.

## Verify

- vitest: the take model and migration; jobClient against the mock (start, progress, done, fail, cancel).
- Python tests for the prompt builders.
- Chrome with the mock: generate, audition takes, commit, undo, reload, and confirm the takes persist.
- With the real host (after its gate): one loop, one song, one stem split, with timings recorded.
