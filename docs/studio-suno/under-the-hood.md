# Suno Studio: under the hood

Recorded on 2026-10-21 with **REA 6.7.0** (`npx -y rea-agents@latest`), attached passively over CDP to the owner's signed-in Chrome, together with Chrome's own network log. Everything here is _observed behaviour_: hosts, request paths and timing, library names, storage key names.

- No Suno code was read for logic, copied or reconstructed.
- Source maps were not fetched.
- Extracting the WebAssembly module embedded in a script was **refused by the session's safety check**. We didn't work around it, so that module is unidentified.

**Where the evidence is** (outside the repo, `~/Desktop/References/suno-studio-2026-10-21/rea/`):

| File                                 | What it holds                                                          | Evidence id    |
| ------------------------------------ | ---------------------------------------------------------------------- | -------------- |
| `capture-idle.json`                  | Page inspect: DOM, scripts, resources, storage key names               | `ev_e2d911d1…` |
| `bundle.json`                        | `analyze-web-bundle`: chunks, vendor fingerprints, endpoint candidates | `ev_644740fe…` |
| `capture-getstems.json`              | 90 s observation (same-origin only, so no API calls were caught)       | `ev_b1b3c893…` |
| `export-idle.json` + `scripts-idle/` | Exported script files, used only for the library-name counts below     | `ev_a3f5b56b…` |

## Findings

**1. App shell: Next.js + React.**

- 130 immutable chunks from `suno.com/_next/static/immutable/` (REA vendor fingerprints: Next.js high, React medium).
- Sign-in is Clerk (`auth.suno.com`, `clerk.suno.com`). Feature flags come from Statsig, errors go to Sentry, and analytics go to `m-stratovibe.prod.suno.com`.
- **For us:** nothing to change; we stay on Vite + React.

**2. Audio engine: AudioWorklet, WebAssembly and SharedArrayBuffer together.**

- Library-name counts across the exported chunks:
  - `audioWorklet` in 6 files and `AudioWorkletNode` in 4;
  - `WebAssembly` in 7, plus one inline `data:application/wasm` module (REA endpoint candidate);
  - `SharedArrayBuffer` in 2;
  - `decodeAudioData` in 4, and no `OfflineAudioContext`.
- That combination is the usual shape of a WASM engine running inside an AudioWorklet, fed through a shared-memory ring buffer. Suno bought the WavTool browser DAW in 2025, so this is likely its lineage.
- **For us:** Tone.js plus our PlaybackScheduler stay. Moving the engine to WASM is not part of copying the design. If warp/time-stretch (S7) needs a DSP core, a WASM stretcher in a worklet is the proven pattern.

**3. Timeline rendering: one canvas, WebGL2.**

- One `<canvas>` covers the whole timeline stage. The bundle references `webgl2` (4 files) and WebGL extensions (`EXT_color_buffer_float`, `WEBGL_multi_draw`, compressed textures).
- Stem waveforms draw a few seconds after they're inserted, with a grid placeholder until then.
- **For us:** we draw on one 2D canvas (`components/Timeline/Timeline.tsx`) with a peaks pyramid plus a worker. Keep that, and add the placeholder state. WebGL is only worth it if S2's performance budget fails.

**4. Project state: Yjs documents and autosave.**

- `Y.Doc` appears in 10 files and `yjs` in 5; immer appears in 7.
- Autosave is `POST studio-api-prod.suno.com/api/studio/save-project`.
- The project menu has "Version History".
- **For us:** we already have a Yjs collab doc (schema 3) and versioned saves. Version History is a UI over saves we already keep.

**5. API: one host, plus a local outbox for the agent.**

- All calls go to `studio-api-prod.suno.com/api/…`:
  - `studio-assets/<id>`, `project/me`, `feed/v3`, `notification/v3` (polled);
  - `billing/*`, `statsig/experiment`, `cms/nudges`.
- Local storage key **names** include `studio-agent-conversation-outbox:<id>` (a local queue for agent messages), `suno-session-credits` and `preempted-credit-deduction-<id>` (credits are deducted optimistically).

**6. The prompt-bar agent: server-side runs, tools executed in the browser, streamed over Ably.** This is the order of calls for one full-song prompt:

| Order | Call                                                                               |
| ----- | ---------------------------------------------------------------------------------- |
| 1     | `GET /api/agent/ably-token?run_id=…` (realtime channel for this run)               |
| 2     | `POST /api/agent/step` (the model takes a step)                                    |
| 3     | `POST /api/agent/conversation/<id>/entries` (the conversation is stored)           |
| 4     | `POST /api/c/check` (a pre-generation check)                                       |
| 5     | `POST /api/generate/v2-web/` (generation starts)                                   |
| 6     | `POST /api/agent/tool-executions` (**the browser runs the tool and reports back**) |
| 7     | `POST /api/agent/step` → `…/entries` → `POST /api/agent/run-completions`           |
| 8     | `POST /api/feed/v3` (status of the new clips)                                      |

- **For us, this is the key architectural finding.** The agent decides on the server, but its tools, such as "add track", "rename clip", "insert take" or "add effect", run in the client against the live project. Results are posted back and the run continues.
- **Our match:** a server agent whose tools map to our store's existing undoable commands (`commands/`, `applyArrangementPatch`, the add-track helpers). See `generation.md`.

**7. Generation jobs are polled.**

- Get MIDI: `OPTIONS` then `GET /api/gen/<clip-id>/midi`, repeated every 5–7 s until it finishes.
- Songs: `POST /api/feed/v3` for their status.
- Audio takes stream into the clip while they render (seen in the UI; the transport wasn't captured).
- **For us:** start with a job API that the client polls, and add streaming previews when the GPU host can stream (HeartMuLa's streaming inference is still on its roadmap).

**8. Codecs and capture.**

- Names present: `opus` in 7 files, `flac` in 4, `mp3` in 14, `MediaRecorder` in 4, `soundfont` in 2.
- Upload uses `s3/multipart` and `s3/sts` (endpoint candidates).
- **For us:** we already encode Opus and WAV in a worker. Uploads need the storage decision before S6.

## Unknowns

- What the inline WASM module is (the extraction was refused; not pursued).
- How audio streams in during take generation (chunked fetch or a media source); a cross-origin capture would be needed.
- Where Get MIDI results land.
