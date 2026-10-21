# Studio generation: models, agent, service

**Owner decisions (2026-10-21):**

- The prompt bar and AI generation are in scope.
- The models are **HeartMuLa** (songs), **YuE v1** (extend and style reference) and **Foundation-1** (loops, one-shots, instruments).

Suno's shape for this (see [`under-the-hood.md`](under-the-hood.md) §6–7): a server-side agent whose tools run in the browser, polled generation jobs, and takes you preview before committing. This doc is our version of that shape, built only from our own code and open models.

## 1. Models

| Need                                                                | Model                                                                                                                             | Licence (checked 2026-10-21)                                                                                                                                                                                         | Runs on                                                                                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Song from prompt + lyrics                                           | **HeartMuLa-oss-3B** (`HeartMuLa/heartlib`, weights `HeartMuLa/HeartMuLa-oss-3B-happy-new-year`, codec `HeartCodec-oss-20260123`) | Apache-2.0, code and weights (the HF card says `apache-2.0`; the README's 2026-01-20 note moved all weights to Apache-2.0)                                                                                           | NVIDIA GPU, bf16; real-time factor about 1.0 (a 3-min song takes about 3 min); `--lazy_load` for a single GPU    |
| Extend / continue a song; "in this style" from a reference          | **YuE v1 only** (`multimodal-art-projection/YuE`, branch `YuE-v1`; `m-a-p/YuE-s1-7B-anneal-*` + stage 2)                          | Apache-2.0 (announced 2025-01-30). Outputs may be monetised with the credit **"YuE by HKUST/M-A-P"**                                                                                                                 | 24 GB VRAM for up to 2 segments, 80 GB for full songs; about 150 s per 30 s of audio on an H800. Async jobs only |
| A part or stem as a loop at the song's BPM, key and bars; one-shots | **Foundation-1** / **Foundation-1.2 Samples** (`RoyalCities/Foundation-1`, a fine-tune of Stable Audio Open 1.0)                  | Stability AI Community License: free for research and non-commercial use; **commercial use only while annual revenue is under USD 1M**, then an enterprise licence. **The owner must confirm Music Atlas qualifies** | GPU via stable-audio-tools                                                                                       |
| A generated sampler instrument                                      | **Foundation-1.2 Keybeds**                                                                                                        | same                                                                                                                                                                                                                 | GPU → multisamples into our Sampler                                                                              |
| Lyrics from audio                                                   | **HeartTranscriptor-oss**                                                                                                         | Apache-2.0                                                                                                                                                                                                           | GPU                                                                                                              |
| Stems from a song                                                   | **Demucs** (htdemucs; proposed, not owner-named)                                                                                  | MIT                                                                                                                                                                                                                  | GPU or CPU                                                                                                       |
| Clip → notes                                                        | **Basic Pitch** (`@spotify/basic-pitch` 1.0.1, already a dependency)                                                              | Apache-2.0                                                                                                                                                                                                           | Browser, in a worker                                                                                             |
| Agent (plans and edits)                                             | **Claude** `claude-opus-5-5` through the Anthropic SDK                                                                            | Anthropic commercial terms                                                                                                                                                                                           | Our serverless gateway                                                                                           |

**Not usable without a commercial licence** (their weights are CC BY-NC 4.0):

- **YuE2**, the current `main` of the YuE repo;
- **MuLaCover** (its outputs are covered too).

**Rules for every model:**

- Pin each model's licence file and checksum in `services/generation/models.lock` (S8).
- Store a `credit` field on each clip it produces. YuE outputs carry their credit line, and that line goes into exports' metadata.
- Show students an "AI-generated" label on the clip.

**Bake-off in S8, before a primary is locked:** HeartMuLa against YuE v1 on the same 10 prompts. Measured on quality (owner listening), time to first audio, GPU time per minute of audio, and whether lyrics are followed.

## 2. How the pieces fit

```
Browser (Studio)                         Serverless gateway (ours)                 GPU host (owner gate)
────────────────                         ─────────────────────────                 ─────────────────────
PromptBar ──prompt + project snapshot──▶ /api/studio/agent/step ──messages──▶ Claude (claude-opus-5-5)
   ▲                                       │  auth · quota · moderation
   │◀── SSE: status text, tool_use blocks ─┘
ToolRunner (client) executes tools on the store (undoable)
   └── tool_result(s) ──────────────────▶ /api/studio/agent/step (continues the loop)
generate_* tools ───────────────────────▶ /api/studio/jobs  ──────────────────────▶ POST /jobs (HeartMuLa, YuE v1,
TakeStrip / TakesPanel ◀── poll GET /api/studio/jobs/:id ◀──────────────────────────── Foundation-1, Demucs…)
                                           audio → storage (owner gate) → signed URL
```

- **Where the serverless layer lives:** memory says "`api/challenges`", but there's no `api/` at the Webapp-Refactor root. **Find the real serverless location first in S8**, then add `/api/studio/*` beside it.

## 3. The agent loop: manual, with tools run by the client

The tools act on the live project in the browser, so the loop crosses the network. The server holds the conversation and makes model calls; the browser runs the tools.

1. **The browser sends** the prompt, the target (the chip), and a **compact project snapshot**: tracks, clips in the target range, key, tempo, sections, the selected notes and the chord lane.
2. **The server calls** `client.messages.stream(...)` with:
   - `model: "claude-opus-5-5"`;
   - `thinking: { type: "adaptive" }` (it can't be disabled on this model);
   - `output_config: { effort: "medium" }`, set explicitly ("low" for one-step edits);
   - our tools, each with `strict: true` and `eager_input_streaming: true`;
   - `tool_choice: { type: "auto" }`. Forced tool use is a 400 on this model; the system prompt steers which tool to use.
3. **The server relays over SSE:**
   - short status text, which our status card shows in plain words, not playful verbs;
   - the **validated** `tool_use` blocks. Each input is checked against its schema, `max_tokens` and `refusal` stop reasons are checked first, and a failure becomes an `is_error` tool result.
4. **The browser runs every tool_use** from that turn against the store, inside one edit transaction per turn so a single Undo reverts the agent's whole step. It then posts **all** the tool results together in one message.
5. **The server appends the results and continues** until `end_turn`, then the reply card shows the summary and its action buttons.

**Storing the conversation:**

- Conversations are **append-only**: store `response.content` exactly as it came back, thinking blocks included, and never rewrite earlier turns.
- Each conversation is keyed by project and student.
- A local outbox queues prompts while offline, the same idea as Suno's `studio-agent-conversation-outbox`.

**Caching:**

- The tool list (deterministic order) and the frozen system prompt are cached with `cache_control` on the last system block.
- The project snapshot goes **after** the cache breakpoint, in the user turn.
- Check `usage.cache_read_input_tokens` in development.

**Refusals:** enable the server-side fallback (`fallbacks: "default"` with beta `server-side-fallback-2026-07-01`). A final `stop_reason: "refusal"` shows a plain reply card ("I can't help with that one").

**Tools, mapped to existing undoable commands:**

| Tool                | Does                                                                                        | Our code                                                                |
| ------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `add_track`         | Adds an audio or instrument track with a name and instrument                                | `shell/tracklist/addTrack.ts`                                           |
| `rename`            | Renames a track or clip                                                                     | store rename actions                                                    |
| `write_notes`       | Writes notes in a range of a track: create, replace or merge, quantised to a grid, in a key | notes editing commands; `harmony/effectiveKey.ts` supplies the key      |
| `transform_notes`   | Transpose, swing, humanise, invert, change rhythm                                           | notes editor transforms                                                 |
| `suggest_chords`    | Prism or the harmony core over a range; results arrive as takes                             | `prism-engine/`, `engine/suggestionEngine.ts`                           |
| `arrange_for_style` | UNISON accompaniment (comping, bass, drums) from the chords                                 | `src/unison/engine/arrangeForStyle.ts` (first time it's used in Studio) |
| `add_effect`        | Inserts and configures a built-in effect                                                    | effects rack commands                                                   |
| `set_tempo_key`     | Changes tempo, key or time signature                                                        | song controls                                                           |
| `add_section`       | Adds sections or form                                                                       | `store/sectionsSlice.ts` `applyArrangementPatch`                        |
| `generate_audio`    | Starts a GPU job (loop, stem, song, extend, instrument)                                     | job client, below                                                       |
| `split_stems`       | Starts a Demucs job on a clip                                                               | job client                                                              |
| `convert_to_notes`  | Runs Basic Pitch on a clip                                                                  | Basic Pitch worker                                                      |

## 4. Job service

- **API:**
  - `POST /jobs {kind: song|extend|style|loop|oneshot|keybed|stems|lyrics, prompt, tags, lyrics?, bpm, key, bars, seed, n, ref_asset?}` returns `{id}`;
  - `GET /jobs/:id` returns `{state: queued|running|done|failed, progress, takes: [{url, seconds, credit}]}`.
- **Prompts built from Studio's context:**
  - Foundation-1 gets its structured tags: instrument family, timbre, FX, **"N Bars, BPM, Key"** from the project.
  - HeartMuLa gets tags plus lyrics.
  - YuE v1 gets lyrics sections plus the reference audio.
- **Takes:** `n` defaults to 2, like Suno. Each result lands as a **take** on the target clip; nothing replaces work without a commit.
- **Polling first:** progress is polled at 2–5 s (Suno polls too). Streaming previews come later, when the models support streaming inference.
- **Mock provider:** `src/daw/generation/mockProvider.ts` serves pre-rendered files from `public/daw-assets/gen-mock/` with fake progress. Tests and every UI prompt (S8–S10) run against it until the GPU host is chosen.

## 5. Student safety and limits

- **Moderation:** prompts and lyrics are checked at the gateway before any model call. Blocked requests return a plain reason.
- **Teacher control:** generation can be switched off per class, with an on/off per tool family (songs, parts, stems).
- **Quotas:** set per student and per class. Usage is metered in our own units; credits are not exposed.
- **Privacy:** generated audio stays private to the project's owner and class. Reference uploads (YuE "style") are checked for copyright: only the student's own recordings or our library.
- **Labelling:** each clip records which model made it and when. The "AI-generated" badge carries into exports.

## 6. Owner gates before S8

1. **GPU host:** Modal, Replicate, Ryan's backend, or a dedicated GPU. Who pays, and how jobs reach it.
2. **Audio storage:** where takes, uploads and stems live, and for how long. This is the same decision audio import (S6) needs.
3. **Foundation-1 licence:** confirm revenue is under USD 1M, or get the Stability enterprise licence.
4. **The agent model's budget**, and whether the prompt bar is Premium-only.
