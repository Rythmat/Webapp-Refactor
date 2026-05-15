/**
 * Beat-grid ingestion via Replicate-hosted beat_this.
 *
 * For each song with a YouTube audioSource, this script extracts the audio
 * via yt-dlp, uploads it to Replicate, runs the beat_this model, and writes
 * the result to src/curriculum/data/songs/_beats/<slug>.json.
 *
 * Cost: ~$0.022 per song on Replicate. Idempotent — already-processed songs
 * are skipped unless --force is passed.
 *
 * Prerequisites:
 *   brew install yt-dlp ffmpeg
 *   export REPLICATE_API_TOKEN=r8_...
 *
 * Usage:
 *   node src/scripts/ingestBeats.mjs                         # all songs
 *   node src/scripts/ingestBeats.mjs --only=24k_magic        # one song
 *   node src/scripts/ingestBeats.mjs --limit=5               # first 5
 *   node src/scripts/ingestBeats.mjs --force                 # overwrite
 *   node src/scripts/ingestBeats.mjs --dry-run               # plan only
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const BEATS_DIR = path.join(SONGS_DIR, '_beats');
const REPLICATE_MODEL = 'xavriley/beat_this';
const REPLICATE_API = 'https://api.replicate.com/v1';

const args = process.argv.slice(2);
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const LIMIT = Number(
  args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? Infinity,
);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');

const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN && !DRY_RUN) {
  console.error(
    'REPLICATE_API_TOKEN env var is required (set with `export REPLICATE_API_TOKEN=...`).',
  );
  process.exit(1);
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function extractYouTubeId(uri) {
  const m = uri.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/,
  );
  return m?.[1] ?? null;
}

function findYouTubeSource(content) {
  // Match audioSources entries with provider: 'youtube'
  const match = content.match(
    /\{\s*provider:\s*['"]youtube['"],\s*uri:\s*['"]([^'"]+)['"]/,
  );
  return match?.[1] ?? null;
}

function findTimeSignature(content) {
  // timeSignature: [4, 4]
  const match = content.match(/timeSignature:\s*\[\s*(\d+)\s*,\s*\d+\s*\]/);
  return match ? Number(match[1]) : 4;
}

async function replicateFetch(pathName, init = {}) {
  const res = await fetch(`${REPLICATE_API}${pathName}`, {
    ...init,
    headers: {
      Authorization: `Token ${TOKEN}`,
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate ${pathName} -> ${res.status}: ${text}`);
  }
  return res.json();
}

async function uploadAudioToReplicate(filePath) {
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: 'audio/mp4' });
  const form = new FormData();
  form.append('content', blob, path.basename(filePath));

  const res = await fetch(`${REPLICATE_API}/files`, {
    method: 'POST',
    headers: { Authorization: `Token ${TOKEN}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate /files upload failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.urls?.get ?? json.url;
}

async function runBeatThis(audioUrl) {
  const created = await replicateFetch(
    `/models/${REPLICATE_MODEL}/predictions`,
    {
      method: 'POST',
      body: JSON.stringify({ input: { audio: audioUrl } }),
    },
  );

  let prediction = created;
  while (
    prediction.status === 'starting' ||
    prediction.status === 'processing'
  ) {
    await new Promise((r) => setTimeout(r, 2000));
    prediction = await replicateFetch(`/predictions/${prediction.id}`);
  }
  if (prediction.status !== 'succeeded') {
    throw new Error(
      `beat_this status=${prediction.status}: ${JSON.stringify(prediction.error ?? prediction)}`,
    );
  }
  return prediction.output;
}

function extractAudio(videoUrl, outPath) {
  execFileSync(
    'yt-dlp',
    [
      '-q',
      '-f',
      'bestaudio',
      '-x',
      '--audio-format',
      'm4a',
      '-o',
      outPath,
      videoUrl,
    ],
    { stdio: 'inherit' },
  );
}

function normalizeOutput(output, beatsPerBar) {
  // beat_this returns either {beats, downbeats} or arrays of objects.
  // Normalize to { beats: number[], downbeats: number[] }.
  let beats = [];
  let downbeats = [];

  if (output?.beats && Array.isArray(output.beats)) {
    beats = output.beats
      .map((b) => (typeof b === 'number' ? b : (b?.time ?? b?.t)))
      .filter((n) => Number.isFinite(n));
  }
  if (output?.downbeats && Array.isArray(output.downbeats)) {
    downbeats = output.downbeats
      .map((b) => (typeof b === 'number' ? b : (b?.time ?? b?.t)))
      .filter((n) => Number.isFinite(n));
  }
  // Fallback shapes
  if (!beats.length && Array.isArray(output)) {
    beats = output
      .map((b) => (typeof b === 'number' ? b : (b?.time ?? b?.t)))
      .filter((n) => Number.isFinite(n));
  }

  beats.sort((a, b) => a - b);
  downbeats.sort((a, b) => a - b);

  const anchorBeatIdx = downbeats.length > 0 ? beats.indexOf(downbeats[0]) : 0;

  return {
    beats,
    downbeats,
    beatsPerBar,
    anchorBeatIdx: anchorBeatIdx >= 0 ? anchorBeatIdx : 0,
  };
}

/* ── Main ────────────────────────────────────────────────────────────── */

async function main() {
  if (!fs.existsSync(BEATS_DIR)) fs.mkdirSync(BEATS_DIR, { recursive: true });

  const songFiles = fs
    .readdirSync(SONGS_DIR)
    .filter(
      (f) => f.endsWith('.ts') && !f.startsWith('_') && !f.startsWith('index'),
    )
    .map((f) => f.replace('.ts', ''));

  const filtered = ONLY ? songFiles.filter((s) => s === ONLY) : songFiles;
  console.log(`Considering ${filtered.length} song files`);

  const todo = [];
  for (const slug of filtered) {
    const sidecarPath = path.join(BEATS_DIR, `${slug}.json`);
    if (!FORCE && fs.existsSync(sidecarPath)) continue;

    const tsContent = fs.readFileSync(
      path.join(SONGS_DIR, `${slug}.ts`),
      'utf-8',
    );
    const youtubeUri = findYouTubeSource(tsContent);
    if (!youtubeUri) continue;
    const videoId = extractYouTubeId(youtubeUri);
    if (!videoId) continue;
    const beatsPerBar = findTimeSignature(tsContent);
    todo.push({ slug, youtubeUri, videoId, beatsPerBar });

    if (todo.length >= LIMIT) break;
  }

  console.log(`To process: ${todo.length} song(s).`);
  if (DRY_RUN) {
    todo.forEach((s) => console.log(`  ${s.slug}  ${s.videoId}`));
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beat-ingest-'));
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < todo.length; i++) {
    const { slug, youtubeUri, videoId, beatsPerBar } = todo[i];
    const audioPath = path.join(tmpDir, `${slug}.m4a`);
    const sidecarPath = path.join(BEATS_DIR, `${slug}.json`);

    try {
      console.log(
        `\n[${i + 1}/${todo.length}] ${slug} (${videoId}) — extracting audio…`,
      );
      extractAudio(youtubeUri, audioPath);

      console.log(`  uploading to Replicate…`);
      const audioUrl = await uploadAudioToReplicate(audioPath);

      console.log(`  running beat_this…`);
      const output = await runBeatThis(audioUrl);

      const normalized = normalizeOutput(output, beatsPerBar);
      if (normalized.beats.length === 0) throw new Error('no beats returned');

      const sidecar = {
        videoId,
        model: REPLICATE_MODEL,
        ingestedAt: new Date().toISOString(),
        ...normalized,
      };
      fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
      console.log(
        `  ✓ wrote ${path.relative(SONGS_DIR, sidecarPath)} (${normalized.beats.length} beats, ${normalized.downbeats.length} downbeats, anchor=${normalized.anchorBeatIdx})`,
      );
      ok++;
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
      fail++;
    } finally {
      try {
        fs.unlinkSync(audioPath);
      } catch {
        /* ignore */
      }
    }

    // Light rate-limit guard
    await new Promise((r) => setTimeout(r, 1000));
  }

  try {
    fs.rmdirSync(tmpDir);
  } catch {
    /* ignore */
  }

  console.log(`\n═══ Beat ingest complete ═══`);
  console.log(`  Succeeded: ${ok}`);
  console.log(`  Failed:    ${fail}`);
  console.log(`  Sidecars:  ${BEATS_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
