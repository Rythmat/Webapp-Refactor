/**
 * Enrich Song Descriptions via Claude API
 *
 * For each song .ts file without `historicalDescription`, calls Claude Sonnet
 * with the song's metadata (artist, title, year, key, tempo, genre, city) and
 * a style guide of curated event narratives, then writes the returned
 * 2-3 sentence description back into the .ts file.
 *
 * The historicalDescription field is the source-of-truth; buildGlobeData.mjs
 * picks it up and uses it as the event's description on the globe.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node src/scripts/enrichSongDescriptions.mjs --pilot
 *   ANTHROPIC_API_KEY=sk-... node src/scripts/enrichSongDescriptions.mjs --dry-run
 *
 * Outputs:
 *   src/scripts/enrichment/_description_audit.json — per-song decision log
 *   src/scripts/enrichment/_description_review.json — low-confidence cases
 */

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const ENRICH_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/scripts/enrichment';
const PILOT_PATH = path.join(ENRICH_DIR, 'pilotSongs.json');
const AUDIT_PATH = path.join(ENRICH_DIR, '_description_audit.json');
const REVIEW_PATH = path.join(ENRICH_DIR, '_description_review.json');

const args = process.argv.slice(2);
const PILOT = args.includes('--pilot');
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3');
const MODEL = 'claude-sonnet-4-6';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Set ANTHROPIC_API_KEY in env before running.');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Style guide system prompt (cached) ──────────────────────────────────
// Verbatim examples from curated event files. Style: 2-3 sentences,
// ~40-70 words, why-it-matters, present tense, no invented facts.
const SYSTEM_PROMPT = `You write short historical narratives for songs displayed as events on a music history globe. Match the style of these existing curated event descriptions:

EXAMPLE 1 (rock & roll origin):
"Elvis Presley records 'That's All Right' at Sun Studio, blending blues, country, and gospel into a new sound. Sam Phillips finally finds what he's been looking for: a white man who can sing with the feel of a Black artist. Rock and roll explodes."

EXAMPLE 2 (band formation):
"Jim Morrison and Ray Manzarek meet on Venice Beach and form The Doors. Their blend of psychedelic rock, blues, and Morrison's poetic lyrics will make them one of the most iconic bands of the 1960s LA scene, alongside Love, The Byrds, and Buffalo Springfield."

EXAMPLE 3 (album release):
"Nirvana's second album Nevermind, featuring 'Smells Like Teen Spirit', is released on DGC Records. It unexpectedly dethrones Michael Jackson from #1 on the Billboard 200, bringing grunge and alternative rock from the Seattle underground to global dominance."

EXAMPLE 4 (genre origin):
"King Oliver and his Creole Jazz Band, featuring a young Louis Armstrong on second cornet, record their first sessions for Gennett Records in Richmond, Indiana. These recordings capture the sound of New Orleans jazz and mark a pivotal moment in recorded music history."

EXAMPLE 5 (scene moment):
"Studio 54 opens in a former CBS studio on West 54th Street in Manhattan. The legendary nightclub becomes the epicenter of disco culture, attracting celebrities, artists, and musicians. DJs pioneer the art of mixing records into continuous dance sets."

EXAMPLE 6 (formative period):
"A young Bob Marley lives in Wilmington, Delaware, working at a Chrysler plant and a DuPont hotel while immersing himself in the American rhythm and blues pouring from radio stations and local venues. During this formative period, he absorbs the sounds of Curtis Mayfield, the Impressions, and Motown — influences that profoundly shape his songwriting and vocal style."

EXAMPLE 7 (mainstream crossover):
"Run-DMC releases their debut album, becoming the first hip hop act to achieve mainstream crossover success. Their hard-hitting beats and street-smart lyrics from Hollis, Queens define the sound of hip hop for a generation and pave the way for rap as a dominant genre."

RULES:
1. Length: 2-3 sentences, 40-70 words.
2. Tense: present tense (e.g., "Stevie Wonder records...", not "recorded").
3. Anchor on the year and place provided in the metadata.
4. Explain why this song matters — what it changed, who it influenced, what scene it captures — not a list of musical metadata.
5. DO NOT invent producers, studios, labels, session musicians, or chart positions unless they appear in the provided metadata. If you don't know specific facts, write about the song's musical and cultural significance in general terms.
6. DO NOT recite the key, tempo, or BPM — that information lives elsewhere in the UI.
7. Use straight quotes (') and (") only — no curly/smart quotes. Use em dashes (—) for asides.
8. Output STRICTLY valid JSON in this shape:
{
  "description": "<the 2-3 sentence narrative>",
  "confidence": "high" | "medium" | "low",
  "factsUsed": ["<short bullets of facts from the metadata you anchored on>"]
}

Set confidence to "low" if you had to be vague or generic because the song/artist is obscure. Set "high" if the song is well-known enough that you can write a specific, factually grounded narrative without inventing details. No prose outside the JSON.`;

// ── Pick songs to process ───────────────────────────────────────────────
const allSlugs = fs
  .readdirSync(SONGS_DIR)
  .filter(
    (f) => f.endsWith('.ts') && !f.startsWith('_') && !f.startsWith('index'),
  )
  .map((f) => f.replace('.ts', ''));

let slugs;
if (PILOT) {
  const pilot = JSON.parse(fs.readFileSync(PILOT_PATH, 'utf-8'));
  slugs = pilot.slugs.filter((s) => allSlugs.includes(s));
} else {
  slugs = allSlugs;
}
console.log(
  `Processing ${slugs.length} songs (pilot=${PILOT}, dry-run=${DRY_RUN}, force=${FORCE})`,
);

// ── Helpers ─────────────────────────────────────────────────────────────
function extractStringField(content, fieldName) {
  const undefRe = new RegExp(`\\b${fieldName}:\\s*undefined`);
  if (undefRe.test(content)) return undefined;
  const patterns = [
    new RegExp(`\\b${fieldName}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'),
    new RegExp(`\\b${fieldName}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 's'),
    new RegExp(`\\b${fieldName}:\\s*\`((?:[^\`\\\\]|\\\\.)*)\``, 's'),
  ];
  for (const pat of patterns) {
    const m = content.match(pat);
    if (m)
      return m[1]
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\`/g, '`')
        .replace(/\\\\/g, '\\');
  }
  return undefined;
}

function getYear(content) {
  if (/\byear:\s*undefined/.test(content)) return undefined;
  const m = content.match(/\byear:\s*(\d+)/);
  return m ? parseInt(m[1]) : undefined;
}

function getStringList(content, fieldName) {
  const m = content.match(new RegExp(`\\b${fieldName}:\\s*\\[([^\\]]*)\\]`));
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.replace(/['"`]/g, '').trim())
    .filter(Boolean);
}

function buildSongMeta(slug, content) {
  return {
    title: extractStringField(content, 'title'),
    artist: extractStringField(content, 'artist'),
    year: getYear(content),
    key: extractStringField(content, 'key'),
    mode: extractStringField(content, 'mode'),
    tempo: (() => {
      const m = content.match(/\btempo:\s*(\d+)/);
      return m ? parseInt(m[1]) : undefined;
    })(),
    genreTags: getStringList(content, 'genreTags'),
    region: extractStringField(content, 'region'),
    country: extractStringField(content, 'country'),
    scene: extractStringField(content, 'scene'),
    era: extractStringField(content, 'era'),
  };
}

function writeBackDescription(filePath, description) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Use JSON.stringify to produce a properly-escaped double-quoted JS string.
  const literal = JSON.stringify(description);
  if (/\bhistoricalDescription:/.test(content)) {
    // Replace existing
    const updated = content.replace(
      /\bhistoricalDescription:\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*,?/s,
      `historicalDescription: ${literal},`,
    );
    if (!DRY_RUN) fs.writeFileSync(filePath, updated);
    return true;
  }
  // Insert after the `year:` line
  const updated = content.replace(
    /^(\s*)year:\s*(\d+|undefined),\s*$/m,
    (m, indent, val) => `${m}\n${indent}historicalDescription: ${literal},`,
  );
  if (updated === content) return false;
  if (!DRY_RUN) fs.writeFileSync(filePath, updated);
  return true;
}

async function describeSong(meta, attempt = 0) {
  const userPayload = JSON.stringify(meta, null, 2);
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Song metadata:\n\`\`\`json\n${userPayload}\n\`\`\`\nReturn the JSON object only.`,
        },
      ],
    });
    const text = response.content[0]?.text || '';
    const cacheStats = {
      cacheCreated: response.usage?.cache_creation_input_tokens,
      cacheRead: response.usage?.cache_read_input_tokens,
      input: response.usage?.input_tokens,
      output: response.usage?.output_tokens,
    };
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else throw new Error('No JSON in response: ' + text.slice(0, 200));
    }
    return { ...parsed, _cache: cacheStats };
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    const transient =
      status === 529 ||
      status === 503 ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 504;
    if (transient && attempt < 6) {
      // Exponential backoff with jitter, capped at 60s
      const base = Math.min(60000, 4000 * Math.pow(2, attempt));
      const wait = base + Math.floor(Math.random() * 2000);
      await new Promise((r) => setTimeout(r, wait));
      return describeSong(meta, attempt + 1);
    }
    throw err;
  }
}

// ── Concurrency limiter (no p-limit dep) ────────────────────────────────
async function runWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Main ────────────────────────────────────────────────────────────────
const audit = [];
const review = [];
const tasks = [];

for (const slug of slugs) {
  const filePath = path.join(SONGS_DIR, `${slug}.ts`);
  const content = fs.readFileSync(filePath, 'utf-8');

  if (!FORCE && extractStringField(content, 'historicalDescription')) {
    audit.push({
      slug,
      decision: 'skip',
      reason: 'historicalDescription already set',
    });
    continue;
  }

  const meta = buildSongMeta(slug, content);
  if (!meta.title || !meta.artist) {
    audit.push({ slug, decision: 'miss', reason: 'missing title or artist' });
    continue;
  }
  tasks.push({ slug, filePath, meta });
}

console.log(
  `Need descriptions for ${tasks.length} songs. Skipped ${audit.length}.`,
);

await runWithLimit(tasks, CONCURRENCY, async (task, idx) => {
  try {
    const out = await describeSong(task.meta);
    const len = out.description?.length ?? 0;
    const conf = out.confidence || 'unknown';
    console.log(
      `[${idx + 1}/${tasks.length}] ${task.slug} (${conf}, ${len} chars, cache read=${out._cache?.cacheRead ?? 0})`,
    );
    const wrote = writeBackDescription(task.filePath, out.description);
    audit.push({
      slug: task.slug,
      decision: 'accept',
      confidence: conf,
      length: len,
      factsUsed: out.factsUsed,
      wrote,
      cache: out._cache,
    });
    if (conf === 'low') {
      review.push({
        slug: task.slug,
        meta: task.meta,
        description: out.description,
        factsUsed: out.factsUsed,
      });
    }
  } catch (err) {
    console.error(
      `[${idx + 1}/${tasks.length}] ${task.slug} FAILED: ${err.message}`,
    );
    audit.push({ slug: task.slug, decision: 'error', error: err.message });
  }
});

fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2));
fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2));

const accepted = audit.filter((a) => a.decision === 'accept').length;
const skipped = audit.filter((a) => a.decision === 'skip').length;
const errored = audit.filter((a) => a.decision === 'error').length;
console.log('\n=== Summary ===');
console.log(`accepted:  ${accepted}`);
console.log(`low-conf:  ${review.length} → ${REVIEW_PATH}`);
console.log(`skipped:   ${skipped}`);
console.log(`errored:   ${errored}`);
console.log(`audit:     ${AUDIT_PATH}`);
if (DRY_RUN) console.log('\n(--dry-run: no .ts files were written)');
