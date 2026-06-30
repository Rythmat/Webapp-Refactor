/**
 * OCR Visual Audit Tool
 *
 * Renders each PDF to PNG, runs OCR on chord regions, and compares
 * the visual content against the text layer extraction.
 *
 * Focuses on detecting font encoding mismatches where the visual display
 * differs from the text layer (e.g., /C displayed but /F in text layer).
 *
 * Usage: node src/scripts/ocrAudit.mjs [--batch=N] [--offset=N] [--only=slug]
 *
 * Output: src/curriculum/data/songs/_ocr_audit.json
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

const PDF_DIR = '/Users/marfizo/Downloads/NEW BASS SOUL PROP BOOK';
const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const TMP_DIR = '/tmp/ocr_audit';
const SCALE = 300 / 72; // PDF points → 300 DPI pixels

const args = process.argv.slice(2);
const BATCH = parseInt(
  args.find((a) => a.startsWith('--batch='))?.split('=')[1] || '647',
);
const OFFSET = parseInt(
  args.find((a) => a.startsWith('--offset='))?.split('=')[1] || '0',
);
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['''`ʼ\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

/* ── Render PDF page to PNG ─────────────────────────────────────────── */

function renderPage(pdfPath, pageNum, outBase) {
  try {
    execSync(
      `/opt/anaconda3/bin/pdftoppm "${pdfPath}" "${outBase}" -png -r 300 -f ${pageNum} -l ${pageNum}`,
      { timeout: 15000 },
    );
    // pdftoppm appends -N to the filename
    const candidates = [
      `${outBase}-${pageNum}.png`,
      `${outBase}-0${pageNum}.png`,
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } catch {
    return null;
  }
  return null;
}

/* ── OCR a chord system line ────────────────────────────────────────── */

async function ocrSystemLine(worker, pngPath, y, minX, maxX, pageWidth) {
  const pixelY = Math.round(y * SCALE);
  const pixelMinX = Math.max(0, Math.round(minX * SCALE) - 20);
  const pixelMaxX = Math.min(
    Math.round(pageWidth * SCALE),
    Math.round(maxX * SCALE) + 100,
  );
  const cropW = pixelMaxX - pixelMinX;
  const cropH = 50;
  const cropY = Math.max(0, pixelY - 25);

  try {
    const meta = await sharp(pngPath).metadata();
    if (cropY + cropH > meta.height || pixelMinX + cropW > meta.width)
      return null;

    const region = await sharp(pngPath)
      .extract({
        left: pixelMinX,
        top: cropY,
        width: Math.min(cropW, meta.width - pixelMinX),
        height: Math.min(cropH, meta.height - cropY),
      })
      .resize({ width: Math.min(cropW * 2, 4000) }) // 2x for better OCR
      .greyscale()
      .normalise()
      .toBuffer();

    const { data } = await worker.recognize(region);
    return {
      text: data.text.trim().replace(/\n/g, ' '),
      confidence: data.confidence,
    };
  } catch {
    return null;
  }
}

/* ── Extract chord positions from PDF text layer ────────────────────── */

async function getTextLayerChords(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data }).promise;
  const systems = []; // { page, y, chords: [{text, x}], minX, maxX }

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();

    const items = tc.items
      .filter((i) => i.str.trim())
      .map((i) => ({
        text: i.str.trim(),
        x: Math.round(i.transform[4]),
        y: Math.round(viewport.height - i.transform[5]),
        fontSize: Math.round(Math.abs(i.transform[0])),
      }));

    // Find chord roots (single letters A-G at chord height)
    const roots = items.filter(
      (i) =>
        i.fontSize >= 8 &&
        i.fontSize <= 12 &&
        /^[A-G]$/.test(i.text) &&
        i.y > 100,
    );

    // Group into y-bands
    for (const root of roots) {
      const existing = systems.find(
        (s) => s.page === p && Math.abs(s.y - root.y) <= 6,
      );
      if (existing) {
        existing.chords.push({ text: root.text, x: root.x });
        existing.minX = Math.min(existing.minX, root.x);
        existing.maxX = Math.max(existing.maxX, root.x);
      } else {
        systems.push({
          page: p,
          y: root.y,
          chords: [{ text: root.text, x: root.x }],
          minX: root.x,
          maxX: root.x,
        });
      }
    }

    // Also find combined chord items and slash items for each system
    const combinedOrSlash = items.filter(
      (i) =>
        i.fontSize >= 8 &&
        i.fontSize <= 12 &&
        i.y > 100 &&
        (/^[A-G].*\//.test(i.text) ||
          /^\/[A-G]/.test(i.text) ||
          (i.text.length >= 2 && /^[A-G]/.test(i.text))),
    );

    for (const item of combinedOrSlash) {
      const sys = systems.find(
        (s) => s.page === p && Math.abs(s.y - item.y) <= 6,
      );
      if (sys) {
        sys.minX = Math.min(sys.minX, item.x);
        sys.maxX = Math.max(sys.maxX, item.x);
      }
    }
  }

  return { systems, pageWidth: 612, numPages: doc.numPages };
}

/* ── Parse generated .ts file for chord names ───────────────────────── */

function getGeneratedChords(slug) {
  const tsPath = path.join(SONGS_DIR, `${slug}.ts`);
  if (!fs.existsSync(tsPath)) return [];
  const content = fs.readFileSync(tsPath, 'utf-8');
  return [...content.matchAll(/chordName: '([^']+)'/g)].map((m) => m[1]);
}

/* ── Normalize OCR output for comparison ────────────────────────────── */

function normalizeOcr(text) {
  return text
    .replace(/[|!l]/g, '/') // Common OCR misreads of /
    .replace(/H/g, '#') // H often misread for #
    .replace(/Gmim/g, 'Gmin') // Common OCR error
    .replace(/Chmin/g, 'C#min') // Common OCR error
    .replace(/mm/g, 'min') // mm → min
    .replace(/\/\//g, '/') // // → /
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract chord-like tokens from OCR text */
function extractOcrChords(ocrText) {
  const normalized = normalizeOcr(ocrText);
  const tokens = normalized.split(/\s+/);
  const chords = [];

  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i];
    // Combine adjacent quality tokens
    if (
      i + 1 < tokens.length &&
      /^(min7?|maj7?|dim|aug|7|sus)/i.test(tokens[i + 1])
    ) {
      tok += tokens[i + 1];
      i++;
    }
    // Combine adjacent slash tokens
    if (i + 1 < tokens.length && tokens[i + 1].startsWith('/')) {
      tok += tokens[i + 1];
      i++;
    }
    if (/^[A-G]/.test(tok) && tok.length >= 1) {
      chords.push(tok);
    }
  }
  return chords;
}

/* ── Main audit ─────────────────────────────────────────────────────── */

async function auditSong(worker, pdfPath) {
  const fileName = path.basename(pdfPath, '.pdf');
  const slug = slugify(fileName);
  const outBase = path.join(TMP_DIR, slug);

  const result = {
    slug,
    fileName,
    systems: [],
    discrepancies: [],
    introChords: null,
  };

  let textData;
  try {
    textData = await getTextLayerChords(pdfPath);
  } catch (err) {
    result.error = 'text_extraction_failed: ' + err.message;
    return result;
  }

  const genChords = getGeneratedChords(slug);
  result.generatedCount = genChords.length;
  result.textLayerSystems = textData.systems.length;

  // Render pages and OCR each system
  const renderedPages = new Map(); // page number → png path

  for (const sys of textData.systems) {
    // Render page if not already done
    if (!renderedPages.has(sys.page)) {
      const pngPath = renderPage(pdfPath, sys.page, outBase + '_p' + sys.page);
      if (pngPath) renderedPages.set(sys.page, pngPath);
    }

    const pngPath = renderedPages.get(sys.page);
    if (!pngPath) continue;

    // OCR this system line
    const ocr = await ocrSystemLine(
      worker,
      pngPath,
      sys.y,
      sys.minX,
      sys.maxX,
      textData.pageWidth,
    );
    if (!ocr) continue;

    const ocrChords = extractOcrChords(ocr.text);
    const textChords = sys.chords.map((c) => c.text);

    result.systems.push({
      page: sys.page,
      y: sys.y,
      textLayer: textChords.join(' '),
      ocrRaw: ocr.text,
      ocrChords,
      confidence: ocr.confidence,
    });

    // Look for discrepancies — specifically bass notes and accidentals
    // Compare OCR chord list vs text layer chord list
    if (ocr.confidence > 30) {
      // Check if OCR found different bass notes than text layer
      const ocrSlash = ocrChords.filter((c) => c.includes('/'));
      for (const ocrChord of ocrSlash) {
        const slashIdx = ocrChord.lastIndexOf('/');
        const ocrBass = ocrChord.slice(slashIdx + 1).replace(/[^A-G#b♯♭]/g, '');
        if (!ocrBass || !/^[A-G]/.test(ocrBass)) continue;

        // Find corresponding chord in generated file
        const ocrRoot = ocrChord.charAt(0);
        const genMatch = genChords.find(
          (g) => g.startsWith(ocrRoot) && g.includes('/'),
        );
        if (genMatch) {
          const genBass = genMatch
            .slice(genMatch.lastIndexOf('/') + 1)
            .replace(/[^A-G♯♭]/g, '');
          if (genBass && ocrBass.charAt(0) !== genBass.charAt(0)) {
            result.discrepancies.push({
              type: 'bass_note_mismatch',
              system: sys.y,
              page: sys.page,
              ocrChord,
              ocrBass: ocrBass.charAt(0),
              genChord: genMatch,
              genBass,
              confidence: ocr.confidence,
            });
          }
        }
      }
    }
  }

  // Check for intro chords (y < 130) that might be missed
  const introSystems = textData.systems.filter(
    (s) => s.page === 1 && s.y < 130,
  );
  if (introSystems.length > 0) {
    result.introChords = {
      found: true,
      y: introSystems[0].y,
      chordCount: introSystems[0].chords.length,
      inGenerated: genChords.length > introSystems[0].chords.length, // rough check
    };
  }

  // Clean up rendered PNGs
  for (const png of renderedPages.values()) {
    try {
      fs.unlinkSync(png);
    } catch {}
  }

  return result;
}

async function main() {
  // Create temp dir
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const files = fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .sort()
    .slice(OFFSET, OFFSET + BATCH);

  const filteredFiles = ONLY
    ? files.filter((f) => slugify(f.replace(/\.pdf$/i, '')) === ONLY)
    : files;

  console.log(`OCR auditing ${filteredFiles.length} PDFs...`);

  const worker = await Tesseract.createWorker('eng');

  const results = [];
  let processed = 0;
  let totalDiscrepancies = 0;
  let totalIntros = 0;

  for (const file of filteredFiles) {
    const pdfPath = path.join(PDF_DIR, file);
    try {
      const result = await auditSong(worker, pdfPath);
      results.push(result);
      totalDiscrepancies += result.discrepancies.length;
      if (result.introChords?.found) totalIntros++;
    } catch (err) {
      results.push({
        slug: slugify(file.replace('.pdf', '')),
        error: err.message,
      });
    }
    processed++;
    if (processed % 25 === 0) {
      console.log(
        `  Processed ${processed}/${filteredFiles.length} (${totalDiscrepancies} discrepancies found)...`,
      );
    }
  }

  await worker.terminate();

  // Summary
  const withDiscrepancies = results.filter((r) => r.discrepancies?.length > 0);
  const withIntros = results.filter((r) => r.introChords?.found);
  const errors = results.filter((r) => r.error);

  console.log(`\n══ OCR Audit Report ══`);
  console.log(`  Songs audited: ${results.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(
    `  Songs with bass note discrepancies: ${withDiscrepancies.length}`,
  );
  console.log(`  Songs with intro chords (y<130): ${withIntros.length}`);
  console.log(`  Total discrepancies: ${totalDiscrepancies}`);

  if (withDiscrepancies.length > 0) {
    console.log(`\n  Bass note discrepancies:`);
    for (const r of withDiscrepancies) {
      console.log(`    ${r.slug}:`);
      for (const d of r.discrepancies.slice(0, 3)) {
        console.log(
          `      OCR: ${d.ocrChord} (bass: ${d.ocrBass}) vs Gen: ${d.genChord} (bass: ${d.genBass}) [conf: ${d.confidence}%]`,
        );
      }
    }
  }

  if (withIntros.length > 0) {
    console.log(`\n  Songs with intro chords above main staff:`);
    for (const r of withIntros.slice(0, 20)) {
      console.log(
        `    ${r.slug}: y=${r.introChords.y}, ${r.introChords.chordCount} chords`,
      );
    }
  }

  // Write report
  const reportPath = path.join(SONGS_DIR, '_ocr_audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n  Report: ${reportPath}`);
}

main().catch(console.error);
