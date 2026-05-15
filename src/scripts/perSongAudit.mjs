/**
 * Per-Song Visual Audit Tool
 *
 * Renders each PDF, extracts ground truth (chord names, measures per row,
 * time signature), and compares against the generated .ts file.
 *
 * Produces a detailed report showing EVERY discrepancy.
 *
 * Usage: node src/scripts/perSongAudit.mjs [--only=slug] [--batch=N] [--offset=N]
 */

import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_DIR = '/Users/marfizo/Downloads/NEW BASS SOUL PROP BOOK';
const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';

const args = process.argv.slice(2);
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const BATCH = parseInt(
  args.find((a) => a.startsWith('--batch='))?.split('=')[1] || '647',
);
const OFFSET = parseInt(
  args.find((a) => a.startsWith('--offset='))?.split('=')[1] || '0',
);

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['''`ʼ\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

/* ── Extract PDF ground truth ───────────────────────────────────────── */

async function extractGroundTruth(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data }).promise;

  const allItems = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      const text = item.str.trim();
      if (!text) continue;
      allItems.push({
        text,
        x: Math.round(item.transform[4]),
        y: Math.round(viewport.height - item.transform[5]),
        fontSize: Math.round(Math.abs(item.transform[0])),
        page: p,
      });
    }
  }

  // ── Measure numbers (bars per row) ──
  const measureNums = allItems
    .filter(
      (i) =>
        /^\d+$/.test(i.text) &&
        i.x < 85 &&
        i.fontSize >= 8 &&
        i.fontSize <= 10 &&
        i.y > 150 &&
        parseInt(i.text) > 1,
    )
    .sort((a, b) => a.page - b.page || a.y - b.y)
    .map((i) => ({ num: parseInt(i.text), y: i.y, page: i.page }));

  const barsPerRow = [];
  for (let i = 0; i < measureNums.length - 1; i++) {
    const bars = measureNums[i + 1].num - measureNums[i].num;
    if (bars > 0 && bars <= 12) {
      barsPerRow.push({
        startMeasure: measureNums[i].num,
        numBars: bars,
        y: measureNums[i].y,
        page: measureNums[i].page,
      });
    }
  }

  // ── Time signature ──
  const timeSigItems = allItems.filter(
    (i) =>
      i.page === 1 &&
      i.y > 130 &&
      i.y < 160 &&
      /^[2-9]$/.test(i.text) &&
      i.fontSize >= 18,
  );
  let timeSig = [4, 4];
  if (timeSigItems.length >= 2) {
    const sorted = timeSigItems.sort((a, b) => a.y - b.y);
    timeSig = [parseInt(sorted[0].text), parseInt(sorted[1].text)];
  }

  // ── Chord systems ──
  const chordRoots = allItems.filter(
    (i) =>
      i.fontSize >= 8 &&
      i.fontSize <= 12 &&
      /^[A-G]$/.test(i.text) &&
      i.y > 100,
  );
  const qualityItems = allItems.filter(
    (i) =>
      i.fontSize >= 7 &&
      i.fontSize <= 12 &&
      /^(min7?|maj7?|m7?|dim7?|aug|dom7?|7|9|11|13|sus[24]?)$/i.test(i.text) &&
      i.y > 100,
  );
  const slashItems = allItems.filter(
    (i) =>
      i.fontSize >= 8 &&
      i.fontSize <= 12 &&
      /^\/[A-G]/.test(i.text) &&
      i.y > 100,
  );
  const combinedItems = allItems.filter(
    (i) =>
      i.fontSize >= 8 &&
      i.fontSize <= 12 &&
      i.y > 100 &&
      i.text.length >= 2 &&
      /^[A-G]/.test(i.text) &&
      !/^(Fine|Funk|Bass|Beat|Bridge|Chorus)/.test(i.text),
  );

  // Group roots into y-bands (systems)
  const systems = [];
  for (const root of chordRoots) {
    const sys = systems.find(
      (s) => s.page === root.page && Math.abs(s.y - root.y) <= 6,
    );
    if (sys) sys.roots.push(root);
    else systems.push({ y: root.y, page: root.page, roots: [root] });
  }

  // For each system, assemble complete chord names
  const systemChords = [];
  for (const sys of systems.sort((a, b) => a.page - b.page || a.y - b.y)) {
    const chords = [];
    for (const root of sys.roots.sort((a, b) => a.x - b.x)) {
      let name = root.text;
      // Quality
      const qual = qualityItems
        .filter(
          (q) =>
            q.page === root.page &&
            Math.abs(q.y - root.y) <= 5 &&
            q.x > root.x &&
            q.x < root.x + 25,
        )
        .sort((a, b) => a.x - b.x);
      for (const q of qual) name += q.text;
      // Slash
      const slash = slashItems.find(
        (s) =>
          s.page === root.page &&
          Math.abs(s.y - root.y) <= 5 &&
          s.x >
            root.x +
              (qual.length > 0 ? qual[qual.length - 1].x - root.x + 15 : 8) &&
          s.x < root.x + 60,
      );
      if (slash) name += slash.text;
      chords.push({
        name: name
          .replace(/([A-G])#/g, '$1♯')
          .replace(/([A-G])b(?![a-z])/g, '$1♭'),
        x: root.x,
      });
    }
    // Also add combined items not covered by assembly
    for (const ci of combinedItems) {
      if (ci.page === sys.page && Math.abs(ci.y - sys.y) <= 6) {
        const nearby = chords.find((c) => Math.abs(c.x - ci.x) <= 15);
        if (!nearby) {
          const normalized = ci.text
            .replace(/([A-G])#/g, '$1♯')
            .replace(/([A-G])b(?![a-z])/g, '$1♭');
          chords.push({ name: normalized, x: ci.x });
        }
      }
    }
    chords.sort((a, b) => a.x - b.x);

    // Find matching barsPerRow
    const matchingRow = barsPerRow.find(
      (r) => r.page === sys.page && Math.abs(r.y - sys.y) <= 15,
    );

    systemChords.push({
      page: sys.page,
      y: sys.y,
      chords: chords.map((c) => c.name),
      numBars: matchingRow?.numBars || 4,
      startMeasure: matchingRow?.startMeasure,
    });
  }

  // ── Section markers ──
  const sectionMarkers = allItems
    .filter(
      (i) =>
        i.fontSize >= 10 &&
        i.fontSize <= 14 &&
        /^[A-G]$/.test(i.text) &&
        i.x < 80 &&
        i.y > 130,
    )
    .map((i) => ({ label: i.text, y: i.y, page: i.page }));

  // ── Total chord count ──
  const totalChords = systemChords.reduce((s, sys) => s + sys.chords.length, 0);

  return {
    timeSig,
    barsPerRow,
    systemChords,
    sectionMarkers,
    totalChords,
    numPages: doc.numPages,
    measureNums: measureNums.map((m) => m.num),
  };
}

/* ── Parse generated file ───────────────────────────────────────────── */

function parseGenerated(slug) {
  const tsPath = path.join(SONGS_DIR, `${slug}.ts`);
  if (!fs.existsSync(tsPath)) return null;
  const content = fs.readFileSync(tsPath, 'utf-8');

  const timeSigMatch = content.match(/timeSignature: \[(\d+), (\d+)\]/);
  const timeSig = timeSigMatch
    ? [parseInt(timeSigMatch[1]), parseInt(timeSigMatch[2])]
    : [4, 4];

  const chords = [...content.matchAll(/chordName: '([^']+)'/g)].map(
    (m) => m[1],
  );
  const beats = [...content.matchAll(/beat: (\d+)/g)].map((m) =>
    parseInt(m[1]),
  );
  const durations = [...content.matchAll(/duration: (\d+)/g)].map((m) =>
    parseInt(m[1]),
  );

  const sections = [];
  const sectionBlocks = content.split(/\n\s*\{[\s\n]*id: '/);
  for (let i = 1; i < sectionBlocks.length; i++) {
    const block = sectionBlocks[i];
    const label = block.match(/label: '([^']+)'/)?.[1] || '?';
    const mpr = block.match(/measuresPerRow: (\d+)/)?.[1];
    const barCount = (block.match(/\{ chords: \[/g) || []).length;
    sections.push({
      label,
      measuresPerRow: mpr ? parseInt(mpr) : 4,
      bars: barCount,
    });
  }

  const totalBars = sections.reduce((s, sec) => s + sec.bars, 0);

  return { timeSig, chords, beats, durations, sections, totalBars };
}

/* ── Compare ────────────────────────────────────────────────────────── */

function auditSong(slug, pdfTruth, generated) {
  const issues = [];

  // Time signature
  if (
    pdfTruth.timeSig[0] !== generated.timeSig[0] ||
    pdfTruth.timeSig[1] !== generated.timeSig[1]
  ) {
    issues.push({
      type: 'time_signature',
      pdf: pdfTruth.timeSig.join('/'),
      gen: generated.timeSig.join('/'),
    });
  }

  // Total chord count
  if (Math.abs(pdfTruth.totalChords - generated.chords.length) > 2) {
    issues.push({
      type: 'chord_count',
      pdf: pdfTruth.totalChords,
      gen: generated.chords.length,
      diff: generated.chords.length - pdfTruth.totalChords,
    });
  }

  // Bars per row
  for (const sys of pdfTruth.systemChords) {
    if (sys.numBars && sys.numBars !== 4) {
      // Check if any generated section has matching measuresPerRow
      const hasMatch = generated.sections.some(
        (s) => s.measuresPerRow === sys.numBars,
      );
      if (!hasMatch) {
        issues.push({
          type: 'bars_per_row',
          detail: `PDF system at y:${sys.y} has ${sys.numBars} bars, no section has measuresPerRow:${sys.numBars}`,
          pdfBars: sys.numBars,
        });
        break; // Only report once
      }
    }
  }

  // Beat placement: chords on beat 4 with duration 1 are suspicious
  // (most chords should be on beat 1 with full-bar duration)
  let beat4Count = 0;
  let beat1Count = 0;
  for (let i = 0; i < generated.beats.length; i++) {
    if (generated.beats[i] === 4 && generated.durations[i] === 1) beat4Count++;
    if (generated.beats[i] === 1) beat1Count++;
  }
  const beat4Ratio =
    generated.beats.length > 0 ? beat4Count / generated.beats.length : 0;
  if (beat4Ratio > 0.3) {
    issues.push({
      type: 'suspicious_beats',
      detail: `${beat4Count}/${generated.beats.length} chords on beat 4 with duration 1 (${Math.round(beat4Ratio * 100)}%)`,
      beat4Count,
      beat1Count,
      total: generated.beats.length,
    });
  }

  // Chord name comparison (multiset)
  const pdfChordSet = {};
  for (const sys of pdfTruth.systemChords) {
    for (const c of sys.chords) {
      const norm = c
        .replace(/♯/g, '#')
        .replace(/♭/g, 'b')
        .replace(/\s+/g, '')
        .toLowerCase();
      pdfChordSet[norm] = (pdfChordSet[norm] || 0) + 1;
    }
  }
  const genChordSet = {};
  for (const c of generated.chords) {
    const norm = c
      .replace(/♯/g, '#')
      .replace(/♭/g, 'b')
      .replace(/\s+/g, '')
      .toLowerCase();
    genChordSet[norm] = (genChordSet[norm] || 0) + 1;
  }
  // Find chords in PDF but not in generated
  const missingChords = [];
  for (const [chord, count] of Object.entries(pdfChordSet)) {
    const genCount = genChordSet[chord] || 0;
    if (genCount < count)
      missingChords.push({ chord, missing: count - genCount });
  }
  const extraChords = [];
  for (const [chord, count] of Object.entries(genChordSet)) {
    const pdfCount = pdfChordSet[chord] || 0;
    if (pdfCount < count) extraChords.push({ chord, extra: count - pdfCount });
  }
  if (missingChords.length > 0 || extraChords.length > 0) {
    issues.push({
      type: 'chord_names',
      missing: missingChords,
      extra: extraChords,
    });
  }

  return {
    slug,
    pdfChords: pdfTruth.totalChords,
    genChords: generated.chords.length,
    pdfTimeSig: pdfTruth.timeSig.join('/'),
    genTimeSig: generated.timeSig.join('/'),
    pdfBarsPerRow: pdfTruth.barsPerRow.map((r) => r.numBars),
    genMeasuresPerRow: [
      ...new Set(generated.sections.map((s) => s.measuresPerRow)),
    ],
    issues,
    score: Math.max(0, 100 - issues.length * 15),
  };
}

/* ── Main ───────────────────────────────────────────────────────────── */

async function main() {
  const files = fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .sort()
    .slice(OFFSET, OFFSET + BATCH);

  const filtered = ONLY
    ? files.filter((f) => slugify(f.replace(/\.pdf$/i, '')) === ONLY)
    : files;

  console.log(`Auditing ${filtered.length} songs...`);

  const results = [];
  let processed = 0;

  for (const file of filtered) {
    const slug = slugify(file.replace(/\.pdf$/i, ''));
    try {
      const pdfTruth = await extractGroundTruth(path.join(PDF_DIR, file));
      const generated = parseGenerated(slug);
      if (!generated) {
        results.push({ slug, issues: [{ type: 'missing_file' }] });
        continue;
      }

      const result = auditSong(slug, pdfTruth, generated);
      results.push(result);
    } catch (err) {
      results.push({
        slug,
        issues: [{ type: 'error', detail: err.message }],
        score: 0,
      });
    }
    processed++;
    if (processed % 50 === 0)
      console.log(`  ${processed}/${filtered.length}...`);
  }

  // ── Summary ──
  const perfect = results.filter((r) => r.issues?.length === 0);
  const withIssues = results.filter((r) => r.issues?.length > 0);

  const issueTypes = {};
  for (const r of withIssues) {
    for (const i of r.issues) {
      issueTypes[i.type] = (issueTypes[i.type] || 0) + 1;
    }
  }

  console.log(`\n══ Per-Song Audit Report ══`);
  console.log(`  Songs: ${results.length}`);
  console.log(
    `  Perfect: ${perfect.length}/${results.length} (${Math.round((perfect.length / results.length) * 100)}%)`,
  );
  console.log(`  With issues: ${withIssues.length}`);
  console.log(`\n  Issue types:`);
  for (const [type, count] of Object.entries(issueTypes).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${type}: ${count}`);
  }

  // Show worst 20
  const worst = [...withIssues]
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 20);
  console.log(`\n  Worst 20:`);
  for (const r of worst) {
    const issueStr = r.issues.map((i) => i.type).join(', ');
    console.log(`    ${(r.slug || '?').padEnd(35)} ${issueStr}`);
  }

  // Time sig mismatches
  const timeSigIssues = withIssues.filter((r) =>
    r.issues.some((i) => i.type === 'time_signature'),
  );
  if (timeSigIssues.length > 0) {
    console.log(`\n  Time signature mismatches (${timeSigIssues.length}):`);
    for (const r of timeSigIssues.slice(0, 15)) {
      const i = r.issues.find((i) => i.type === 'time_signature');
      console.log(`    ${r.slug.padEnd(35)} PDF: ${i.pdf}  Gen: ${i.gen}`);
    }
  }

  // Beat placement issues
  const beatIssues = withIssues.filter((r) =>
    r.issues.some((i) => i.type === 'suspicious_beats'),
  );
  if (beatIssues.length > 0) {
    console.log(`\n  Suspicious beat placement (${beatIssues.length}):`);
    for (const r of beatIssues.slice(0, 15)) {
      const i = r.issues.find((i) => i.type === 'suspicious_beats');
      console.log(`    ${r.slug.padEnd(35)} ${i.detail}`);
    }
  }

  // Write report
  const reportPath = path.join(SONGS_DIR, '_per_song_audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n  Report: ${reportPath}`);
}

main().catch(console.error);
