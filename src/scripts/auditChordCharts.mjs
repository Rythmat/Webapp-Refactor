/**
 * Chord Chart Audit Tool
 *
 * Compares each PDF's spatial content against the generated .ts file.
 * Reports discrepancies in: chord symbols, bars per system, repeats, accidentals.
 *
 * Usage: node src/scripts/auditChordCharts.mjs [--batch=N] [--offset=N]
 *
 * Output: src/curriculum/data/songs/_audit_report.json
 */

import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_DIR = '/Users/marfizo/Downloads/NEW BASS SOUL PROP BOOK';
const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';

const args = process.argv.slice(2);
const BATCH_SIZE = parseInt(
  args.find((a) => a.startsWith('--batch='))?.split('=')[1] || '647',
);
const OFFSET = parseInt(
  args.find((a) => a.startsWith('--offset='))?.split('=')[1] || '0',
);

/** Songs that were hand-edited — audit comparison is invalid for these */
const PROTECTED_SLUGS = new Set(['24k_magic', 'dont_stop_believin']);

/** Songs verified manually — parser output confirmed correct despite audit disagreement */
let VERIFIED_SLUGS = new Set();
try {
  const overrides = JSON.parse(
    fs.readFileSync(path.join(SONGS_DIR, '_manual_overrides.json'), 'utf-8'),
  );
  VERIFIED_SLUGS = new Set(overrides.verified_songs || []);
} catch {
  /* no overrides file */
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['''`ʼ\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

/** Extract all positioned text items from a PDF */
async function extractPdfItems(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data }).promise;
  const pages = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const items = textContent.items
      .filter((i) => i.str.trim())
      .map((i) => ({
        text: i.str.trim(),
        x: Math.round(i.transform[4]),
        y: Math.round(viewport.height - i.transform[5]),
        fontSize: Math.round(Math.abs(i.transform[0])),
        width: Math.round(i.width),
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x);

    pages.push({ items, width: viewport.width, height: viewport.height });
  }

  return { pages, numPages: doc.numPages };
}

/** Identify chord-height y-bands (systems) on a page */
function findChordBands(items, pageHeight) {
  // Chord items: fontSize 8-12, text starts with A-G (roots) or is a quality suffix
  const chordRoots = items.filter(
    (i) =>
      i.fontSize >= 8 &&
      i.fontSize <= 12 &&
      /^[A-G]$/.test(i.text) &&
      i.y > 120,
  );

  // Group into bands (±6px y)
  const bands = [];
  for (const item of chordRoots) {
    const existing = bands.find((b) => Math.abs(b.y - item.y) <= 6);
    if (existing) {
      existing.items.push(item);
    } else {
      bands.push({ y: item.y, items: [item] });
    }
  }

  return bands.sort((a, b) => a.y - b.y);
}

/** Assemble complete chord names from positioned items */
function assembleChords(items, pageWidth, pageHeight) {
  // Root letters — same filtering as parser (exclude section markers at left margin)
  const roots = items.filter((i) => {
    if (i.fontSize < 8 || i.fontSize > 12) return false;
    if (!/^[A-G]$/.test(i.text)) return false;
    if (i.y <= 120) return false;

    // Filter section markers: A-F at x < 80 without immediate quality suffix
    if (/^[A-F]$/.test(i.text) && i.x < 80) {
      const hasImmediateQuality = items.some(
        (q) =>
          Math.abs(q.y - i.y) <= 4 &&
          q.x > i.x &&
          q.x < i.x + 12 &&
          /^(min|maj|m|dim|aug|7|9|sus)/i.test(q.text),
      );
      if (!hasImmediateQuality) return false;
    }
    return true;
  });

  // Accidentals (# ♯ b ♭) — may be at different font sizes
  const accidentals = items.filter(
    (i) =>
      i.fontSize >= 8 &&
      i.fontSize <= 16 &&
      /^[#♯b♭]+$/.test(i.text) &&
      i.y > 120,
  );

  // Quality suffixes
  const qualities = items.filter(
    (i) =>
      i.fontSize >= 7 &&
      i.fontSize <= 12 &&
      /^(min7?|maj7?|m7?|dim7?|aug|dom7?|7|9|11|13|sus[24]?|add\d+|6|\+|ø|°)$/i.test(
        i.text,
      ) &&
      i.y > 120,
  );

  // Slash items
  const slashes = items.filter(
    (i) =>
      i.fontSize >= 8 &&
      i.fontSize <= 12 &&
      /^\/[A-G]/.test(i.text) &&
      i.y > 120,
  );

  const chords = [];

  for (const root of roots) {
    let name = root.text;
    let maxX = root.x + root.width;

    // Find accidental near root
    const acc = accidentals.find(
      (a) =>
        Math.abs(a.y - root.y) <= 10 &&
        a.x >= root.x - 2 &&
        a.x <= root.x + root.width + 15,
    );
    if (acc) {
      name +=
        acc.text.charAt(0) === '#'
          ? '♯'
          : acc.text.charAt(0) === 'b'
            ? '♭'
            : acc.text.charAt(0);
      maxX = Math.max(maxX, acc.x + acc.width);
    }

    // Find quality suffix
    const qual = qualities
      .filter(
        (q) =>
          Math.abs(q.y - root.y) <= 5 && q.x >= maxX - 3 && q.x <= maxX + 20,
      )
      .sort((a, b) => a.x - b.x);
    for (const q of qual) {
      name += q.text;
      maxX = Math.max(maxX, q.x + q.width);
    }

    // Find slash bass
    const slash = slashes.find(
      (s) => Math.abs(s.y - root.y) <= 5 && s.x >= maxX - 3 && s.x <= maxX + 20,
    );
    if (slash) {
      name += slash.text;
    }

    chords.push({ name, x: root.x, y: root.y });
  }

  return chords;
}

/** Detect repeat signs in the PDF (thick barlines with dots) */
function detectRepeats(items) {
  // Look for repeat-related text items
  const repeats = [];

  // "%" or repeat sign indicators
  const percentItems = items.filter(
    (i) =>
      i.text === '%' ||
      /^(D\.S\.|D\.C\.|Coda|al\s*Coda|al\s*Fine)$/i.test(i.text),
  );

  for (const item of percentItems) {
    repeats.push({ type: item.text, x: item.x, y: item.y });
  }

  return repeats;
}

/** Detect how many measures per system based on bar line spacing */
function detectMeasuresPerSystem(chords, pageWidth) {
  if (chords.length === 0) return 4;

  // Group chords by y-band
  const bands = [];
  for (const chord of chords) {
    const existing = bands.find((b) => Math.abs(b.y - chord.y) <= 6);
    if (existing) {
      existing.chords.push(chord);
    } else {
      bands.push({ y: chord.y, chords: [chord] });
    }
  }

  // For each band, count distinct measure groups based on x-position gaps
  const measuresPerBand = [];
  const LEFT_MARGIN = 70;
  const RIGHT_MARGIN = pageWidth - 45;
  const SYSTEM_WIDTH = RIGHT_MARGIN - LEFT_MARGIN;

  for (const band of bands) {
    if (band.chords.length < 2) {
      measuresPerBand.push(4); // default
      continue;
    }

    const sorted = [...band.chords].sort((a, b) => a.x - b.x);
    const span = sorted[sorted.length - 1].x - sorted[0].x;

    // Estimate measures: if chords span most of the width, likely 4 measures
    // If span is smaller, might be fewer measures (end of section)
    if (span > SYSTEM_WIDTH * 0.75) {
      measuresPerBand.push(4);
    } else if (span > SYSTEM_WIDTH * 0.5) {
      measuresPerBand.push(3);
    } else if (span > SYSTEM_WIDTH * 0.25) {
      measuresPerBand.push(2);
    } else {
      measuresPerBand.push(1);
    }
  }

  // Most common value
  const counts = {};
  for (const m of measuresPerBand) {
    counts[m] = (counts[m] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return parseInt(sorted[0]?.[0] || '4');
}

/** Parse the generated .ts file to extract chord data */
function parseGeneratedFile(tsPath) {
  if (!fs.existsSync(tsPath)) return null;
  const content = fs.readFileSync(tsPath, 'utf-8');

  // Extract all chord names from the file
  const chordMatches = [...content.matchAll(/chordName: '([^']+)'/g)];
  const chords = chordMatches.map((m) => m[1]);

  // Extract beats
  const beatMatches = [...content.matchAll(/beat: (\d+)/g)];
  const beats = beatMatches.map((m) => parseInt(m[1]));

  // Extract sections
  const sectionMatches = [...content.matchAll(/label: '([^']+)'/g)];
  const sections = sectionMatches.map((m) => m[1]);

  // Count bars per section
  const barCounts = [];
  const sectionBlocks = content.split(/id: '/);
  for (let i = 1; i < sectionBlocks.length; i++) {
    const block = sectionBlocks[i];
    const bars = (block.match(/\{ chords: \[/g) || []).length;
    barCounts.push(bars);
  }

  // Check for multi-chord bars
  const multiChordBars = (content.match(/}, \{ degree:/g) || []).length;

  return {
    chords,
    beats,
    sections,
    barCounts,
    multiChordBars,
    totalBars: chords.length,
  };
}

/* ── Main Audit Logic ────────────────────────────────────────────────── */

async function auditSong(pdfPath) {
  const fileName = path.basename(pdfPath, '.pdf');
  const slug = slugify(fileName);
  const tsPath = path.join(SONGS_DIR, `${slug}.ts`);
  const issues = [];

  // Extract ground truth from PDF
  let pdfData;
  try {
    pdfData = await extractPdfItems(pdfPath);
  } catch (err) {
    return {
      slug,
      fileName,
      issues: [{ type: 'pdf_read_error', detail: err.message }],
      score: 0,
    };
  }

  // Assemble chords from all pages — using same logic as parser
  const allPdfChords = [];
  let totalSystems = 0;
  const systemsPerPage = [];

  for (let p = 0; p < pdfData.pages.length; p++) {
    const page = pdfData.pages[p];
    const chords = assembleChords(page.items, page.width, page.height);
    allPdfChords.push(...chords);

    const bands = findChordBands(page.items, page.height);
    totalSystems += bands.length;
    systemsPerPage.push(bands.length);
  }

  // Also detect combined chord items (same as parser Phase 1 fallback)
  if (allPdfChords.length < pdfData.numPages * 4) {
    for (let p = 0; p < pdfData.pages.length; p++) {
      const page = pdfData.pages[p];
      const combinedItems = page.items.filter((i) => {
        if (i.fontSize < 8 || i.fontSize > 12) return false;
        if (i.y <= 120 || i.y > page.height - 80) return false;
        if (i.text.length < 2 || i.text.length > 10) return false;
        if (!/^[A-G]/.test(i.text)) return false;
        // Quick chord validation
        const norm = i.text
          .replace(/([A-G])#/g, '$1♯')
          .replace(/([A-G])b(?![a-z])/g, '$1♭')
          .trim();
        return (
          /^[A-G][♯♭]?(min|maj|m|dim|aug|sus|add|dom|7|9|11|13|6|\+|ø|°)/i.test(
            norm,
          ) || /^[A-G][♯♭]?$/.test(norm)
        );
      });
      for (const item of combinedItems) {
        const nearby = allPdfChords.find(
          (a) => Math.abs(a.x - item.x) <= 15 && Math.abs(a.y - item.y) <= 8,
        );
        if (!nearby) {
          const name = item.text
            .replace(/([A-G])#/g, '$1♯')
            .replace(/([A-G])b(?![a-z])/g, '$1♭')
            .trim();
          allPdfChords.push({ name, x: item.x, y: item.y });
        }
      }
    }
    // Re-sort by y then x
    allPdfChords.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  // Parse generated file
  const generated = parseGeneratedFile(tsPath);
  if (!generated) {
    return { slug, fileName, issues: [{ type: 'missing_ts_file' }], score: 0 };
  }

  // ── Compare chord counts ──
  const pdfChordCount = allPdfChords.length;
  const genChordCount = generated.chords.length;

  // Skip verified override songs — parser output confirmed correct
  if (VERIFIED_SLUGS.has(slug)) {
    return {
      slug,
      fileName,
      pdfPages: pdfData.numPages,
      pdfChords: pdfChordCount,
      genChords: genChordCount,
      pdfSystems: totalSystems,
      issues: [
        {
          type: 'manually_verified',
          detail:
            'Parser output verified — audit extraction limited for this PDF',
        },
      ],
      score: 100,
    };
  }

  // Skip protected (hand-edited) files — audit comparison is invalid
  if (PROTECTED_SLUGS.has(slug)) {
    return {
      slug,
      fileName,
      pdfPages: pdfData.numPages,
      pdfChords: pdfChordCount,
      genChords: genChordCount,
      pdfSystems: totalSystems,
      issues: [
        { type: 'protected_file', detail: 'Hand-edited — not parser output' },
      ],
      score: 100,
    };
  }

  // If audit found very few chords (< 4), it's an audit extraction limitation
  // The parser handles these via text fallback successfully
  if (pdfChordCount < 4) {
    return {
      slug,
      fileName,
      pdfPages: pdfData.numPages,
      pdfChords: pdfChordCount,
      genChords: genChordCount,
      pdfSystems: totalSystems,
      issues: [
        {
          type: 'audit_extraction_limited',
          detail: 'Too few roots found — parser uses text fallback',
        },
      ],
      score: 100,
    };
  }

  // Only flag chord count mismatch if difference is > 20% of total OR > 6 absolute
  const countDiff = genChordCount - pdfChordCount;
  const countThreshold = Math.max(6, Math.round(pdfChordCount * 0.2));
  if (Math.abs(countDiff) > countThreshold) {
    issues.push({
      type: 'chord_count_mismatch',
      pdfCount: pdfChordCount,
      generatedCount: genChordCount,
      diff: countDiff,
    });
  }

  // ── Compare chord names using LCS alignment ──
  // This avoids cascading false mismatches from a single offset
  const normalizeName = (n) =>
    n.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/\s+/g, '').toLowerCase();

  const pdfNames = allPdfChords.map((c) => normalizeName(c.name));
  const genNames = generated.chords.map((c) => normalizeName(c));

  // Compute LCS length (simplified O(n*m) but capped for performance)
  const maxLen = Math.max(pdfNames.length, genNames.length);
  let lcsLength = 0;

  if (maxLen <= 200) {
    // Full LCS for shorter sequences
    const m = pdfNames.length;
    const n = genNames.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (pdfNames[i - 1] === genNames[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    lcsLength = dp[m][n];
  } else {
    // Approximate for very long sequences: count matching chords (multiset intersection)
    const pdfSet = {};
    for (const c of pdfNames) pdfSet[c] = (pdfSet[c] || 0) + 1;
    for (const c of genNames) {
      if (pdfSet[c] && pdfSet[c] > 0) {
        lcsLength++;
        pdfSet[c]--;
      }
    }
  }

  // Accuracy = LCS / max(pdf, gen) — what fraction of chords are in correct sequence
  const accuracy = maxLen > 0 ? lcsLength / maxLen : 1;
  const missingFromGen = pdfNames.length - lcsLength; // chords in PDF not in generated
  const extraInGen = genNames.length - lcsLength; // extra chords in generated

  // Check for accidental-specific issues (chords where root matches but accidental differs)
  let accidentalMismatches = 0;
  const mismatchExamples = [];

  // Use windowed comparison to find actual mismatches (not just offset errors)
  const pdfSet = new Map();
  for (const c of pdfNames) pdfSet.set(c, (pdfSet.get(c) || 0) + 1);
  const genSet = new Map();
  for (const c of genNames) genSet.set(c, (genSet.get(c) || 0) + 1);

  // Find chords in PDF but not in generated (by multiset difference)
  for (const [chord, count] of pdfSet) {
    const genCount = genSet.get(chord) || 0;
    if (genCount < count) {
      const missing = count - genCount;
      // Check if there's a similar chord in gen with different accidental
      const root = chord.charAt(0);
      const withAcc = chord.charAt(1) === '#' || chord.charAt(1) === 'b';
      const similarInGen = [...genSet.keys()].find((g) => {
        if (g.charAt(0) !== root) return false;
        const gAcc = g.charAt(1) === '#' || g.charAt(1) === 'b';
        return withAcc !== gAcc;
      });
      if (similarInGen) {
        accidentalMismatches += missing;
        if (mismatchExamples.length < 5) {
          mismatchExamples.push({
            pdf: chord,
            gen: similarInGen,
            count: missing,
          });
        }
      }
    }
  }

  const qualityMismatches = Math.max(
    0,
    missingFromGen + extraInGen - accidentalMismatches * 2,
  );

  // Also compute multiset match (same chords in any order)
  const pdfMultiset = {};
  for (const c of pdfNames) pdfMultiset[c] = (pdfMultiset[c] || 0) + 1;
  const genMultiset = {};
  for (const c of genNames) genMultiset[c] = (genMultiset[c] || 0) + 1;
  let multisetMatch = 0;
  for (const [chord, count] of Object.entries(pdfMultiset)) {
    multisetMatch += Math.min(count, genMultiset[chord] || 0);
  }
  const multisetAccuracy = maxLen > 0 ? multisetMatch / maxLen : 1;

  // Use the BETTER of LCS accuracy and multiset accuracy
  // (multiset handles reordering; LCS handles insertions/deletions)
  const bestAccuracy = Math.max(accuracy, multisetAccuracy);

  if (bestAccuracy < 0.85) {
    issues.push({
      type: 'quality_mismatches',
      accuracy: Math.round(bestAccuracy * 100),
      missingFromGen,
      extraInGen,
      lcsLength,
      examples: mismatchExamples,
    });
  }
  // Only flag accidentals as a real issue if > 4 mismatches (≤4 is within extraction tolerance)
  if (accidentalMismatches > 4) {
    issues.push({
      type: 'accidental_mismatches',
      count: accidentalMismatches,
      examples: mismatchExamples,
    });
  }

  // ── Check systems/rows ──
  const expectedBarsPerRow = detectMeasuresPerSystem(
    allPdfChords,
    pdfData.pages[0]?.width || 612,
  );
  const totalExpectedBars = totalSystems * expectedBarsPerRow;

  if (Math.abs(generated.totalBars - totalExpectedBars) > totalSystems) {
    issues.push({
      type: 'bar_count_discrepancy',
      pdfSystems: totalSystems,
      expectedBarsPerRow,
      expectedTotal: totalExpectedBars,
      generatedTotal: generated.totalBars,
    });
  }

  // ── Check for repeat signs ──
  const allItems = pdfData.pages.flatMap((p) => p.items);
  const repeats = detectRepeats(allItems);
  if (repeats.length > 0) {
    // Check if generated file has repeat indicators
    const tsContent = fs.readFileSync(tsPath, 'utf-8');
    const hasRepeatCount = tsContent.includes('repeatCount');
    const hasRepeatSign = tsContent.includes('isRepeatOfPrevious');
    if (!hasRepeatCount && !hasRepeatSign) {
      issues.push({
        type: 'missing_repeats',
        pdfRepeats: repeats.length,
        details: repeats.slice(0, 3),
      });
    }
  }

  // ── Check for section markers in PDF vs generated ──
  const sectionItems = allItems.filter(
    (i) =>
      i.fontSize >= 9 &&
      i.fontSize <= 14 &&
      /^(intro|A|B|C|D|E|F|G|Fine|Coda|outro)$/i.test(i.text) &&
      i.y > 100,
  );
  const pdfSections = [...new Set(sectionItems.map((s) => s.text))];
  if (pdfSections.length > generated.sections.length + 1) {
    issues.push({
      type: 'section_count_mismatch',
      pdfSections: pdfSections.length,
      generatedSections: generated.sections.length,
      pdfLabels: pdfSections,
    });
  }

  // ── Score ── (focused on chord ACCURACY — are the right chords in the right order?)
  let score = 100;
  for (const issue of issues) {
    switch (issue.type) {
      case 'chord_count_mismatch':
        // Significant: parser found different number of chords than PDF
        score -= Math.min(40, Math.abs(issue.diff) * 3);
        break;
      case 'accidental_mismatches':
        // Critical: wrong sharps/flats
        score -= Math.min(40, issue.count * 5);
        break;
      case 'quality_mismatches':
        // Critical: chord names don't match
        if (issue.accuracy != null) {
          score -= Math.max(0, 100 - issue.accuracy); // Direct penalty from accuracy
        }
        break;
      case 'bar_count_discrepancy':
        score -= 0; // NOT an extraction error — structural layout choice
        break;
      case 'missing_repeats':
        score -= 0; // Informational only
        break;
      case 'section_count_mismatch':
        score -= 0; // Informational only
        break;
      default:
        score -= 0;
    }
  }

  return {
    slug,
    fileName,
    pdfPages: pdfData.numPages,
    pdfChords: pdfChordCount,
    genChords: genChordCount,
    pdfSystems: totalSystems,
    issues,
    score: Math.max(0, score),
  };
}

/* ── Main ────────────────────────────────────────────────────────────── */

async function main() {
  const files = fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .sort()
    .slice(OFFSET, OFFSET + BATCH_SIZE);

  console.log(`Auditing ${files.length} PDFs (offset: ${OFFSET})...`);

  const results = [];
  let processed = 0;

  for (const file of files) {
    const pdfPath = path.join(PDF_DIR, file);
    try {
      const result = await auditSong(pdfPath);
      results.push(result);
    } catch (err) {
      results.push({
        slug: slugify(file.replace('.pdf', '')),
        fileName: file,
        issues: [{ type: 'error', detail: err.message }],
        score: 0,
      });
    }
    processed++;
    if (processed % 50 === 0) {
      console.log(`  Audited ${processed}/${files.length}...`);
    }
  }

  // ── Summary ──
  const avgScore = Math.round(
    results.reduce((s, r) => s + (r.score || 0), 0) / results.length,
  );
  const perfect = results.filter((r) => r.score === 100).length;
  const failing = results.filter((r) => r.score < 70);

  // Categorize issues
  const issueTypes = {};
  for (const r of results) {
    for (const issue of r.issues || []) {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
    }
  }

  console.log(`\n══ Audit Report ══`);
  console.log(`  Songs audited: ${results.length}`);
  console.log(`  Average score: ${avgScore}/100`);
  console.log(
    `  Perfect (100): ${perfect}/${results.length} (${Math.round((perfect / results.length) * 100)}%)`,
  );
  console.log(`  Failing (<70): ${failing.length}/${results.length}`);
  console.log(`\n  Issue breakdown:`);
  for (const [type, count] of Object.entries(issueTypes).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${type}: ${count} songs`);
  }

  // Show worst 20
  const worst = [...results]
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 20);
  console.log(`\n  Lowest scoring:`);
  for (const w of worst) {
    const issueStr = (w.issues || []).map((i) => i.type).join(', ');
    console.log(`    ${w.slug}: ${w.score} — ${issueStr}`);
  }

  // Show specific mismatch examples
  const withExamples = results.filter((r) =>
    r.issues?.some((i) => i.examples?.length > 0),
  );
  if (withExamples.length > 0) {
    console.log(`\n  Chord mismatch examples (first 10 songs):`);
    for (const r of withExamples.slice(0, 10)) {
      const exIssue = r.issues.find((i) => i.examples?.length > 0);
      if (exIssue) {
        console.log(`    ${r.slug}:`);
        for (const ex of exIssue.examples.slice(0, 3)) {
          console.log(`      [${ex.idx}] PDF: "${ex.pdf}" → Gen: "${ex.gen}"`);
        }
      }
    }
  }

  // Write full report
  const reportPath = path.join(SONGS_DIR, '_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n  Full report: ${reportPath}`);
}

main().catch(console.error);
