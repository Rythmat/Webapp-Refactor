/**
 * Audit Globe event YouTube links — verify accuracy + find candidates.
 *
 * Validation backbone: YouTube oEmbed (keyless).
 *   https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json
 *   HTTP 200 -> live (returns {title, author_name}); 401/403/404 -> dead.
 *
 * Phases:
 *   --verify          Verify every existing videoId; write _video_audit.json.
 *   --search-missing  Find + oEmbed-validate candidates for events with NO
 *                     videoId (and, with --include=<file>, re-search flagged);
 *                     write _video_candidates.json.
 *
 * Options: --limit=N  --only=<substr in file or id>  --concurrency=N
 *
 * Run under Node 20:  nvm use 20 && node src/scripts/auditVideoLinks.mjs --verify
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const EVENTS_DIR = path.join(ROOT, 'src/components/atlas/data/events');
const SONGS_DIR = path.join(ROOT, 'src/curriculum/data/songs');
const YT_CACHE = path.join(SONGS_DIR, '_youtube_links.json');
const AUDIT_OUT = path.join(__dirname, '_video_audit.json');
const CAND_OUT = path.join(__dirname, '_video_candidates.json');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (k, d) => {
  const a = args.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const LIMIT = parseInt(opt('limit', '0'), 10) || 0;
const ONLY = opt('only', '');
const CONCURRENCY = parseInt(opt('concurrency', '8'), 10) || 8;

/* ── Event parsing (text-based; files are hand/auto TS object literals) ── */

function parseEventsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const file = path.basename(filePath);
  const idRe = /^\s*id:\s*'([^']+)'/gm;
  const matches = [...content.matchAll(idRe)];
  const events = [];
  for (let i = 0; i < matches.length; i++) {
    const id = matches[i][1];
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const block = content.slice(start, end);
    const titleM = block.match(/^\s*title:\s*(['"])((?:\\.|(?!\1).)*)\1/m);
    const vidM = block.match(/^\s*videoId:\s*'([^']+)'/m);
    const yearM = block.match(/^\s*year:\s*(\d+)/m);
    const cityM = block.match(/city:\s*'([^']+)'/);
    const tagsM = block.match(/tags:\s*\[([\s\S]*?)\]/);
    const tags = tagsM
      ? [...tagsM[1].matchAll(/'([^']*)'/g)].map((m) => m[1])
      : [];
    events.push({
      id,
      file,
      surface: id.startsWith('song-') ? 'song' : 'genre',
      title: titleM ? titleM[2].replace(/\\'/g, "'").replace(/\\"/g, '"') : '',
      videoId: vidM ? vidM[1] : null,
      year: yearM ? parseInt(yearM[1], 10) : null,
      city: cityM ? cityM[1] : '',
      tags,
    });
  }
  return events;
}

function allEventFiles() {
  return fs
    .readdirSync(EVENTS_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => path.join(EVENTS_DIR, f));
}

function loadAllEvents() {
  let events = allEventFiles().flatMap(parseEventsFromFile);
  if (ONLY)
    events = events.filter((e) => e.file.includes(ONLY) || e.id.includes(ONLY));
  return events;
}

function loadYtLinks() {
  return fs.existsSync(YT_CACHE)
    ? JSON.parse(fs.readFileSync(YT_CACHE, 'utf-8'))
    : {};
}

/* ── Expected identity for an event ────────────────────────────────────── */

// For songs: "Song — Artist". For genre: the tags carry artist/work keywords.
function expectedFor(event, ytLinks) {
  if (event.surface === 'song') {
    const [songTitle, artist] = event.title.split(' — ');
    const slug = event.id.replace(/^song-/, '');
    const claimed = ytLinks[slug];
    return {
      songTitle: songTitle || event.title,
      artist: artist || '',
      claimedTitle: claimed?.title || '',
      claimedChannel: claimed?.channel || '',
      probe: `${songTitle || event.title} ${artist || ''}`.trim(),
    };
  }
  return {
    songTitle: '',
    artist: '',
    tags: event.tags,
    probe: `${event.tags.slice(0, 3).join(' ')} ${event.title}`.trim(),
  };
}

/* ── Token match scoring ───────────────────────────────────────────────── */

const STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'of',
  'to',
  'in',
  'on',
  'feat',
  'ft',
  'featuring',
  'official',
  'video',
  'audio',
  'lyrics',
  'lyric',
  'hd',
  '4k',
  'remaster',
  'remastered',
  'explicit',
  'visualizer',
  'mv',
  'full',
  'song',
  'music',
  'records',
  'record',
  'releases',
  'release',
  'topic',
]);

function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && t.length > 1 && !STOP.has(t));
}

// Coverage of expected identity tokens found in the fetched title+author.
function scoreMatch(expected, fetchedTitle, fetchedAuthor) {
  const hay = new Set([...tokens(fetchedTitle), ...tokens(fetchedAuthor)]);
  const inHay = (arr) => {
    const t = arr.filter((x) => x.length > 1);
    if (!t.length) return null;
    return t.filter((x) => hay.has(x)).length / t.length;
  };
  let expTokens,
    artistCov = null,
    titleCov = null;
  if (expected.artist || expected.songTitle) {
    titleCov = inHay(tokens(expected.songTitle));
    artistCov = inHay(tokens(expected.artist));
    expTokens = [...tokens(expected.songTitle), ...tokens(expected.artist)];
  } else {
    expTokens = tokens((expected.tags || []).join(' '));
  }
  const overall = inHay(expTokens);
  return {
    coverage: overall == null ? 0 : +overall.toFixed(2),
    titleCoverage: titleCov == null ? null : +titleCov.toFixed(2),
    artistCoverage: artistCov == null ? null : +artistCov.toFixed(2),
  };
}

function classify(surface, live, s) {
  if (!live) return 'dead';
  if (surface === 'song') {
    if (
      s.coverage >= 0.7 ||
      ((s.titleCoverage ?? 0) >= 0.6 && (s.artistCoverage ?? 0) >= 0.5)
    )
      return 'ok';
    if (s.coverage < 0.3 && (s.artistCoverage ?? 0) < 0.5) return 'mismatch';
    return 'uncertain';
  }
  // genre events: descriptive titles — rely on tag overlap, looser bar
  if (s.coverage >= 0.5) return 'ok';
  if (s.coverage < 0.2) return 'mismatch';
  return 'uncertain';
}

/* ── oEmbed + concurrency pool ─────────────────────────────────────────── */

async function oembed(videoId, tries = 3) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}&format=json`;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.status === 200) {
        const j = await res.json();
        return {
          live: true,
          status: 200,
          title: j.title,
          author: j.author_name,
        };
      }
      if (res.status === 401 || res.status === 403 || res.status === 404)
        return { live: false, status: res.status };
      if (res.status === 429)
        await sleep(2000 * attempt); // backoff
      else return { live: false, status: res.status };
    } catch {
      await sleep(500 * attempt);
    }
  }
  return { live: false, status: 0, error: 'fetch-failed' };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, worker, concurrency) {
  const out = new Array(items.length);
  let idx = 0;
  let done = 0;
  async function run() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await worker(items[i], i);
      done++;
      if (done % 50 === 0)
        process.stdout.write(`  ...${done}/${items.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return out;
}

/* ── Phase: verify existing links ──────────────────────────────────────── */

async function verify() {
  const ytLinks = loadYtLinks();
  let events = loadAllEvents().filter((e) => e.videoId);
  if (LIMIT) events = events.slice(0, LIMIT);
  console.log(
    `Verifying ${events.length} existing videoIds (concurrency ${CONCURRENCY})...`,
  );

  const results = await pool(
    events,
    async (e) => {
      const expected = expectedFor(e, ytLinks);
      const r = await oembed(e.videoId);
      const s = r.live ? scoreMatch(expected, r.title, r.author) : {};
      return {
        id: e.id,
        file: e.file,
        surface: e.surface,
        title: e.title,
        videoId: e.videoId,
        live: r.live,
        status: r.status,
        fetchedTitle: r.title || null,
        fetchedAuthor: r.author || null,
        ...s,
        verdict: classify(e.surface, r.live, s),
        expectedProbe: expected.probe,
      };
    },
    CONCURRENCY,
  );

  const by = (v) => results.filter((r) => r.verdict === v);
  const summary = {
    total: results.length,
    ok: by('ok').length,
    uncertain: by('uncertain').length,
    mismatch: by('mismatch').length,
    dead: by('dead').length,
  };
  fs.writeFileSync(
    AUDIT_OUT,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), summary, results },
      null,
      2,
    ),
  );
  console.log('\n=== VERIFY SUMMARY ===');
  console.table(summary);
  console.log(`Dead links: ${by('dead').length}`);
  by('dead').forEach((r) =>
    console.log(
      `  [dead ${r.status}] ${r.id} (${r.file}) ${r.videoId} — ${r.title}`,
    ),
  );
  console.log(`\nWrote ${AUDIT_OUT}`);
}

/* ── Phase: search candidates for events missing a link ────────────────── */

async function searchMissing() {
  const ytSearch = (await import('youtube-search-api')).default;
  const ytLinks = loadYtLinks();
  const TARGETS = opt('targets', '');
  let events;
  if (TARGETS) {
    const ids = new Set(JSON.parse(fs.readFileSync(TARGETS, 'utf-8')));
    events = loadAllEvents().filter((e) => ids.has(e.id));
  } else {
    events = loadAllEvents().filter((e) => !e.videoId);
  }
  if (LIMIT) events = events.slice(0, LIMIT);

  // Resume: keep candidates already gathered in a prior run.
  const out = fs.existsSync(CAND_OUT)
    ? JSON.parse(fs.readFileSync(CAND_OUT, 'utf-8'))
    : {};
  const pending = events.filter((e) => !out[e.id]);
  console.log(
    `Searching candidates for ${pending.length} events (${events.length - pending.length} already cached)...`,
  );
  events = pending;

  let found = 0;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const expected = expectedFor(e, ytLinks);
    let candidates = [];
    try {
      const res = await ytSearch.GetListByKeyword(expected.probe, false, 6);
      const vids = (res?.items || [])
        .filter((it) => it.type === 'video' && it.id)
        .slice(0, 5);
      for (const v of vids) {
        const emb = await oembed(v.id);
        if (!emb.live) continue;
        const s = scoreMatch(expected, emb.title, emb.author);
        candidates.push({
          videoId: v.id,
          searchTitle: v.title,
          fetchedTitle: emb.title,
          fetchedAuthor: emb.author,
          ...s,
        });
      }
      candidates.sort((a, b) => b.coverage - a.coverage);
    } catch (err) {
      candidates = [{ error: String(err?.message || err) }];
    }
    out[e.id] = {
      file: e.file,
      surface: e.surface,
      title: e.title,
      tags: e.tags,
      expectedProbe: expected.probe,
      candidates,
    };
    if (candidates[0]?.coverage != null) found++;
    if ((i + 1) % 10 === 0) {
      console.log(
        `  ${i + 1}/${events.length} searched (${found} with a candidate)`,
      );
      fs.writeFileSync(CAND_OUT, JSON.stringify(out, null, 2));
    }
    await sleep(1000); // rate limit the scraper
  }
  fs.writeFileSync(CAND_OUT, JSON.stringify(out, null, 2));
  console.log(
    `\nWrote ${CAND_OUT} (${Object.keys(out).length} events, ${found} with >=1 live candidate)`,
  );
}

/* ── Phase: dump flagged links (merge audit verdicts + event context) ──── */

const FLAGGED_OUT = path.join(__dirname, '_flagged.json');

function dumpFlagged() {
  const audit = JSON.parse(fs.readFileSync(AUDIT_OUT, 'utf-8'));
  const byId = new Map(loadAllEvents().map((e) => [e.id, e]));
  const flagged = audit.results
    .filter((r) => r.verdict === 'mismatch' || r.verdict === 'uncertain')
    .map((r) => {
      const e = byId.get(r.id) || {};
      return {
        id: r.id,
        file: r.file,
        surface: r.surface,
        title: r.title,
        year: e.year ?? null,
        city: e.city ?? '',
        tags: e.tags ?? [],
        videoId: r.videoId,
        fetchedTitle: r.fetchedTitle,
        fetchedAuthor: r.fetchedAuthor,
        coverage: r.coverage,
        verdict: r.verdict,
      };
    });
  fs.writeFileSync(FLAGGED_OUT, JSON.stringify(flagged, null, 2));
  const dead = audit.results
    .filter((r) => r.verdict === 'dead')
    .map((r) => r.id);
  fs.writeFileSync(
    path.join(__dirname, '_dead.json'),
    JSON.stringify(dead, null, 2),
  );
  console.log(
    `Wrote ${FLAGGED_OUT} (${flagged.length} flagged) and _dead.json (${dead.length} dead)`,
  );
}

/* ── Phase: apply final assignments ────────────────────────────────────── */

// assignments: [{ id, surface, action:'set'|'remove', videoId?, matchTitle?, matchChannel? }]
const ASSIGN_IN = path.join(__dirname, '_final_assignments.json');

function eventBlockBounds(content, id) {
  const idPos = content.indexOf(`id: '${id}'`);
  if (idPos < 0) return null;
  const nextRe = /\n\s{2,6}id: '/g;
  nextRe.lastIndex = idPos + 1;
  const m = nextRe.exec(content);
  return { start: idPos, end: m ? m.index : content.length };
}

// Set/replace/remove the videoId within one event's block. Returns new content or null.
function editVideoIdInBlock(content, id, action, videoId) {
  const b = eventBlockBounds(content, id);
  if (!b) return null;
  let block = content.slice(b.start, b.end);
  const hasVid = /videoId:\s*'[^']*'/.test(block);
  if (action === 'remove') {
    if (!hasVid) return content; // nothing to do
    block = block.replace(/\n\s*videoId:\s*'[^']*',?/, '');
  } else {
    if (hasVid) {
      block = block.replace(/videoId:\s*'[^']*'/, `videoId: '${videoId}'`);
    } else {
      // insert after the tags array's closing "],"
      const tagsPos = block.indexOf('tags:');
      const close = tagsPos >= 0 ? block.indexOf('],', tagsPos) : -1;
      if (close < 0) return null;
      block =
        block.slice(0, close + 2) +
        `\n    videoId: '${videoId}',` +
        block.slice(close + 2);
    }
  }
  return content.slice(0, b.start) + block + content.slice(b.end);
}

function applyAssignments() {
  const assignments = JSON.parse(fs.readFileSync(ASSIGN_IN, 'utf-8'));
  const ytLinks = loadYtLinks();
  const byFile = {};
  const songChanges = [];
  for (const a of assignments) {
    if (a.surface === 'song') songChanges.push(a);
    else (byFile[a.file] ||= []).push(a);
  }

  const counts = {
    setGenre: 0,
    removeGenre: 0,
    setSong: 0,
    removeSong: 0,
    missed: [],
  };

  // Genre/historical files — edit in place.
  for (const [file, list] of Object.entries(byFile)) {
    const fp = path.join(EVENTS_DIR, file);
    let content = fs.readFileSync(fp, 'utf-8');
    for (const a of list) {
      const next = editVideoIdInBlock(content, a.id, a.action, a.videoId);
      if (next == null) {
        counts.missed.push(a.id);
        continue;
      }
      content = next;
      if (a.action === 'set') counts.setGenre++;
      else counts.removeGenre++;
    }
    fs.writeFileSync(fp, content);
  }

  // Song events — update _youtube_links.json (source of truth) AND patch songLibrary.ts in place.
  const songLibPath = path.join(EVENTS_DIR, 'songLibrary.ts');
  let songLib = fs.readFileSync(songLibPath, 'utf-8');
  for (const a of songChanges) {
    const slug = a.id.replace(/^song-/, '');
    if (a.action === 'remove') {
      if (ytLinks[slug]) delete ytLinks[slug].videoId;
      counts.removeSong++;
    } else {
      ytLinks[slug] = {
        ...(ytLinks[slug] || {}),
        videoId: a.videoId,
        ...(a.matchTitle ? { title: a.matchTitle } : {}),
        ...(a.matchChannel ? { channel: a.matchChannel } : {}),
        url: `https://youtube.com/watch?v=${a.videoId}`,
      };
      counts.setSong++;
    }
    const next = editVideoIdInBlock(songLib, a.id, a.action, a.videoId);
    if (next == null) counts.missed.push(a.id);
    else songLib = next;
  }
  fs.writeFileSync(YT_CACHE, JSON.stringify(ytLinks, null, 2));
  fs.writeFileSync(songLibPath, songLib);

  console.log('=== APPLY SUMMARY ===');
  console.table({
    setGenre: counts.setGenre,
    removeGenre: counts.removeGenre,
    setSong: counts.setSong,
    removeSong: counts.removeSong,
  });
  if (counts.missed.length)
    console.log('MISSED (block not found):', counts.missed.join(', '));
}

/* ── Phase: build final assignments from selection picks ───────────────── */

function buildAssignments() {
  const picks = JSON.parse(
    fs.readFileSync(path.join(__dirname, '_selection.json'), 'utf-8'),
  );
  const cands = JSON.parse(fs.readFileSync(CAND_OUT, 'utf-8'));
  const dead = new Set(
    JSON.parse(fs.readFileSync(path.join(__dirname, '_dead.json'), 'utf-8')),
  );
  const replaceTargets = new Set(
    JSON.parse(
      fs.readFileSync(path.join(__dirname, '_replace_targets.json'), 'utf-8'),
    ),
  );
  const replaceWrong = new Set(
    [...replaceTargets].filter((id) => !dead.has(id)),
  );

  const pickById = new Map(picks.map((p) => [p.id, p]));
  const assignments = [];
  const review = []; // confirmed-wrong live links with no confident replacement
  const unresolved = []; // missing events with no confident candidate

  for (const id of Object.keys(cands)) {
    const meta = cands[id];
    const pick = pickById.get(id);
    const hasPick = pick && pick.videoId && pick.videoId.length > 5;
    if (hasPick) {
      assignments.push({
        id,
        surface: meta.surface,
        file: meta.file,
        action: 'set',
        videoId: pick.videoId,
        matchTitle: pick.matchTitle || '',
        matchChannel: pick.matchChannel || '',
      });
    } else if (dead.has(id)) {
      assignments.push({
        id,
        surface: meta.surface,
        file: meta.file,
        action: 'remove',
      });
    } else if (replaceWrong.has(id)) {
      review.push({ id, file: meta.file, title: meta.title });
    } else {
      unresolved.push({ id, file: meta.file, title: meta.title });
    }
  }

  fs.writeFileSync(
    path.join(__dirname, '_final_assignments.json'),
    JSON.stringify(assignments, null, 2),
  );
  fs.writeFileSync(
    path.join(__dirname, '_review.json'),
    JSON.stringify(review, null, 2),
  );
  fs.writeFileSync(
    path.join(__dirname, '_unresolved.json'),
    JSON.stringify(unresolved, null, 2),
  );
  const set = assignments.filter((a) => a.action === 'set');
  console.log('=== BUILD ASSIGNMENTS ===');
  console.table({
    set: set.length,
    setSong: set.filter((a) => a.surface === 'song').length,
    setGenre: set.filter((a) => a.surface === 'genre').length,
    remove: assignments.filter((a) => a.action === 'remove').length,
    reviewWrongKept: review.length,
    unresolvedMissing: unresolved.length,
  });
}

/* ── Main ──────────────────────────────────────────────────────────────── */

async function main() {
  if (has('--verify')) await verify();
  else if (has('--search-missing')) await searchMissing();
  else if (has('--dump-flagged')) dumpFlagged();
  else if (has('--build-assignments')) buildAssignments();
  else if (has('--apply')) applyAssignments();
  else {
    console.log('Specify a phase: --verify | --search-missing');
    console.log('Options: --limit=N --only=<substr> --concurrency=N');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
