#!/usr/bin/env node
/* eslint-env node */
/**
 * One-shot migration: rewrite each song file's `genreTags: [...]` array to use
 * only the 14 canonical Courses genres. See plan in
 * /Users/marfizo/.claude/plans/create-a-plan-to-sleepy-book.md for the mapping
 * rationale.
 *
 * Usage:
 *   node scripts/normalize-song-genres.mjs            # apply in-place
 *   node scripts/normalize-song-genres.mjs --dry-run  # show diffs + stats only
 */

import { glob, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SONGS_DIR = path.join(REPO, 'src/curriculum/data/songs');

const DRY_RUN = process.argv.includes('--dry-run');

/** @type {Record<string, string[]>} */
const TAG_MAP = {
  // single → rock
  rock: ['rock'],
  classic_rock: ['rock'],
  art_rock: ['rock'],
  glam_rock: ['rock'],
  indie_rock: ['rock'],
  alternative_rock: ['rock'],
  blues_rock: ['rock'],
  punk_rock: ['rock'],
  acoustic_rock: ['rock'],
  lounge_rock: ['rock'],
  shuffle_rock: ['rock'],
  grunge_rock: ['rock'],
  straight_eighth_rock: ['rock'],
  straight_eighth_classic_rock: ['rock'],
  rock_shuffle: ['rock'],
  new_wave: ['rock'],

  // single → pop
  pop: ['pop'],
  pop_ballad: ['pop'],
  classic_pop: ['pop'],
  dance_pop: ['pop'],
  glam_pop: ['pop'],
  indie_pop: ['pop'],
  pop_waltz: ['pop'],
  ballad: ['pop'],
  traditional_ballad: ['pop'],
  straight_eighth_pop: ['pop'],
  pop_ballad_slow_rubato: ['pop'],
  disney: ['pop'],

  // single → funk
  funk: ['funk'],
  funky_groove: ['funk'],
  straight_eighth_funk: ['funk'],
  disco: ['funk'],

  // single → hip hop
  hip_hop: ['hip hop'],

  // single → rnb (R&B, Soul, Motown all collapse here)
  'R&B': ['rnb'],
  r_and_b: ['rnb'],
  soul: ['rnb'],
  motown: ['rnb'],
  classic_soul: ['rnb'],
  classic_motown: ['rnb'],
  'classic_R&B': ['rnb'],
  'soul_R&B': ['rnb'],

  // single → jazz
  jazz: ['jazz'],
  jazz_ballad: ['jazz'],
  jazz_waltz: ['jazz'],
  slow_swing: ['jazz'],
  swing: ['jazz'],

  // single → blues
  blues: ['blues'],

  // single → folk (country collapses here)
  folk: ['folk'],
  folk_song: ['folk'],
  folk_ballad: ['folk'],
  bluegrass: ['folk'],
  irish_folk: ['folk'],
  singer_songwriter: ['folk'],
  country: ['folk'],
  classic_country: ['folk'],
  country_ballad: ['folk'],

  // single → neo-soul
  neo_soul: ['neo-soul'],

  // single → latin
  latin: ['latin'],
  calypso: ['latin'],

  // single → reggae
  reggae: ['reggae'],
  reggae_fusion: ['reggae'],

  // single → jam-band
  jam_band: ['jam-band'],
  jam_rock: ['jam-band'],

  // compound: rock + pop
  pop_rock: ['pop', 'rock'],
  classic_pop_rock: ['pop', 'rock'],
  classic_rock_pop: ['pop', 'rock'],
  rock_pop: ['pop', 'rock'],
  straight_eighth_pop_rock: ['pop', 'rock'],

  // compound: rock + folk
  folk_rock: ['folk', 'rock'],
  classic_folk_rock: ['folk', 'rock'],
  indie_folk_rock: ['folk', 'rock'],

  // compound: funk + pop
  funky_pop: ['funk', 'pop'],

  // compound: funk + rnb
  funky_soul: ['funk', 'rnb'],
  funky_motown: ['funk', 'rnb'],
  straight_eighth_funky_soul: ['funk', 'rnb'],

  // compound: jazz + other
  funky_jazz: ['funk', 'jazz'],
  funky_jazz_soul: ['funk', 'jazz', 'rnb'],
  funky_soul_jazz: ['funk', 'jazz', 'rnb'],
  classic_jazz_pop: ['jazz', 'pop'],
  jazzy_pop: ['jazz', 'pop'],

  // compound: funk + rock
  funk_rock: ['funk', 'rock'],
  funk_fusion: ['funk', 'rock'],

  // compound: funk + reggae
  funky_reggae: ['funk', 'reggae'],

  // compound: country → folk + rock/pop
  country_rock: ['folk', 'rock'],
  country_pop: ['folk', 'pop'],
  country_pop_ballad: ['folk', 'pop'],
  country_folk: ['folk'],

  // compound: latin + other
  latin_pop: ['latin', 'pop'],
  latin_funk: ['funk', 'latin'],
  latin_rock: ['latin', 'rock'],

  // compound: electronic
  synth_pop: ['electronic', 'pop'],

  // compound: hip hop + other
  hip_hop_soul: ['hip hop', 'rnb'],
  'hip_hop_R&B': ['hip hop', 'rnb'],
  'hip_hop,_funky': ['funk', 'hip hop'],

  // compound: blues
  blues_jazz: ['blues', 'jazz'],
  bluesy_pop: ['blues', 'pop'],

  // compound: ska (treat as reggae-adjacent)
  ska_rock: ['reggae', 'rock'],
  ska_punk: ['reggae', 'rock'],
};

const CANONICAL_SET = new Set([
  'pop',
  'rock',
  'hip hop',
  'rnb',
  'jazz',
  'blues',
  'folk',
  'funk',
  'neo-soul',
  'electronic',
  'latin',
  'reggae',
  'jam-band',
  'african',
]);

function mapTag(tag) {
  if (CANONICAL_SET.has(tag)) return [tag];
  return TAG_MAP[tag] ?? null;
}

function formatTagsArray(tags) {
  const parts = tags.map((t) => `'${t}'`);
  return `[${parts.join(', ')}]`;
}

async function main() {
  const files = [];
  for await (const entry of glob('*.ts', { cwd: SONGS_DIR })) {
    if (entry.startsWith('_') || entry === 'index.ts') continue;
    files.push(path.join(SONGS_DIR, entry));
  }
  files.sort();

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const unmapped = new Map(); // tag -> count
  const dryRunSamples = [];

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const m = text.match(/(\s*)genreTags:\s*\[([^\]]*)\],?/);
    if (!m) {
      skipped++;
      continue;
    }
    const indent = m[1];
    const inner = m[2];
    const sourceTags = Array.from(inner.matchAll(/'([^']+)'/g)).map(
      (mm) => mm[1],
    );
    const out = new Set();
    let anyUnmapped = false;
    for (const tag of sourceTags) {
      const mapped = mapTag(tag);
      if (!mapped) {
        unmapped.set(tag, (unmapped.get(tag) ?? 0) + 1);
        anyUnmapped = true;
        continue;
      }
      for (const m2 of mapped) out.add(m2);
    }
    if (anyUnmapped && out.size === 0) {
      // nothing canonical — keep original to avoid empty array
      skipped++;
      continue;
    }
    const sorted = Array.from(out).sort();
    const newLine = `${indent}genreTags: ${formatTagsArray(sorted)},`;
    const oldLine = m[0].endsWith(',') ? m[0] : m[0] + ',';
    if (newLine.trim() === oldLine.trim()) {
      unchanged++;
      continue;
    }
    const newText = text.replace(m[0], newLine);
    if (DRY_RUN) {
      if (dryRunSamples.length < 10) {
        dryRunSamples.push({
          file: path.relative(REPO, file),
          before: oldLine.trim(),
          after: newLine.trim(),
        });
      }
    } else {
      await writeFile(file, newText, 'utf8');
    }
    updated++;
  }

  console.log(`\n=== ${DRY_RUN ? 'DRY RUN' : 'APPLIED'} ===`);
  console.log(`Files scanned:   ${files.length}`);
  console.log(`Updated:         ${updated}`);
  console.log(`Unchanged:       ${unchanged}`);
  console.log(`Skipped (no tag line or fully unmapped): ${skipped}`);

  if (unmapped.size > 0) {
    console.log(`\nTags with NO MAPPING (review and add to TAG_MAP):`);
    for (const [t, n] of Array.from(unmapped.entries()).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${n.toString().padStart(4)}  ${t}`);
    }
  } else {
    console.log(`\nAll source tags had a mapping.`);
  }

  if (DRY_RUN && dryRunSamples.length > 0) {
    console.log(`\nSample changes (first ${dryRunSamples.length}):`);
    for (const s of dryRunSamples) {
      console.log(`\n  ${s.file}`);
      console.log(`    -  ${s.before}`);
      console.log(`    +  ${s.after}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
