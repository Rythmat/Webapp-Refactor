/**
 * Converts 14 Style DNA CSVs into TypeScript data files.
 *
 * Usage: node scripts/convertStyleDna.mjs
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CSV_DIR = path.join(
  os.homedir(),
  'Desktop/Music Atlas Curriculum/csv Files/csv_Style DNA',
);
const OUT_DIR = path.join(process.cwd(), 'src/curriculum/data/styleDna');

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(content) {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = fields[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Genre ID mapping
// ---------------------------------------------------------------------------

const GENRE_FILE_MAP = {
  African: 'african',
  Blues: 'blues',
  Electronic: 'electronic',
  Folk: 'folk',
  Funk: 'funk',
  Hip_Hop: 'hipHop',
  'Hip-Hop': 'hipHop',
  Jam_Band: 'jamBand',
  'Jam Band': 'jamBand',
  Jazz: 'jazz',
  Latin: 'latin',
  Neo_Soul: 'neoSoul',
  'Neo Soul': 'neoSoul',
  'Neo-Soul': 'neoSoul',
  Pop: 'pop',
  Reggae: 'reggae',
  RnB: 'rnb',
  'R&B': 'rnb',
  Rock: 'rock',
};

// ---------------------------------------------------------------------------
// Build structured data
// ---------------------------------------------------------------------------

function buildStyleDna(rows) {
  const levels = new Map();

  for (const row of rows) {
    const levelNum = parseInt(row.level);
    if (isNaN(levelNum)) continue;

    if (!levels.has(levelNum)) {
      levels.set(levelNum, {
        level: levelNum,
        subtitle: row.level_subtitle || '',
        artists: [],
        vocabulary: [],
      });
    }

    const levelData = levels.get(levelNum);

    if (row.entry_type === 'artist_reference') {
      levelData.artists.push({
        name: row.artist || '',
        description: row.description || '',
        tags: row.style_ref_tags
          ? row.style_ref_tags
              .split(' | ')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      });
    } else if (row.entry_type === 'musical_vocabulary') {
      levelData.vocabulary.push({
        category: row.category || '',
        description: row.description || '',
      });
    }
  }

  return Array.from(levels.values()).sort((a, b) => a.level - b.level);
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function genLevelTS(levelData) {
  const lines = [
    `  {`,
    `    level: ${levelData.level},`,
    `    subtitle: '${escapeStr(levelData.subtitle)}',`,
    `    artists: [`,
  ];

  for (const artist of levelData.artists) {
    lines.push(`      {`);
    lines.push(`        name: '${escapeStr(artist.name)}',`);
    lines.push(`        description: '${escapeStr(artist.description)}',`);
    lines.push(
      `        tags: [${artist.tags.map((t) => `'${escapeStr(t)}'`).join(', ')}],`,
    );
    lines.push(`      },`);
  }

  lines.push(`    ],`);
  lines.push(`    vocabulary: [`);

  for (const vocab of levelData.vocabulary) {
    lines.push(`      {`);
    lines.push(`        category: '${escapeStr(vocab.category)}',`);
    lines.push(`        description: '${escapeStr(vocab.description)}',`);
    lines.push(`      },`);
  }

  lines.push(`    ],`);
  lines.push(`  },`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const csvFiles = fs.readdirSync(CSV_DIR).filter((f) => f.endsWith('.csv'));
  console.log(`Found ${csvFiles.length} CSV files`);

  const indexExports = [];

  for (const csvFile of csvFiles) {
    const match = csvFile.match(/^(.+?)_Style_DNA\.csv$/);
    if (!match) {
      console.warn(`Skipping: ${csvFile}`);
      continue;
    }

    const genreRaw = match[1];
    const genreId = GENRE_FILE_MAP[genreRaw];
    if (!genreId) {
      console.warn(`Unknown genre: ${genreRaw}`);
      continue;
    }

    const csvContent = fs.readFileSync(path.join(CSV_DIR, csvFile), 'utf-8');
    const rows = parseCSV(csvContent);
    const levels = buildStyleDna(rows);

    const fileLines = [
      `/**`,
      ` * Auto-generated Style DNA for ${genreId}.`,
      ` * Source: ~/Desktop/Music Atlas Curriculum/csv Files/csv_Style DNA/`,
      ` */`,
      ``,
      `import type { StyleDnaLevel } from './types';`,
      ``,
      `export const ${genreId}StyleDna: StyleDnaLevel[] = [`,
    ];

    for (const level of levels) {
      fileLines.push(genLevelTS(level));
    }

    fileLines.push(`];`);
    fileLines.push(``);

    const filePath = path.join(OUT_DIR, `${genreId}.ts`);
    fs.writeFileSync(filePath, fileLines.join('\n'));

    const totalArtists = levels.reduce((s, l) => s + l.artists.length, 0);
    const totalVocab = levels.reduce((s, l) => s + l.vocabulary.length, 0);
    console.log(
      `  ${genreId}.ts — ${levels.length} levels, ${totalArtists} artists, ${totalVocab} vocabulary entries`,
    );
    indexExports.push(genreId);
  }

  // Generate types file
  const typesContent = [
    `/**`,
    ` * Style DNA types.`,
    ` */`,
    ``,
    `export interface ArtistReference {`,
    `  name: string;`,
    `  description: string;`,
    `  tags: string[];`,
    `}`,
    ``,
    `export interface VocabularyEntry {`,
    `  category: string;`,
    `  description: string;`,
    `}`,
    ``,
    `export interface StyleDnaLevel {`,
    `  level: number;`,
    `  subtitle: string;`,
    `  artists: ArtistReference[];`,
    `  vocabulary: VocabularyEntry[];`,
    `}`,
    ``,
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'types.ts'), typesContent.join('\n'));

  // Generate index with lazy loaders
  const indexLines = [
    `/**`,
    ` * Auto-generated barrel for Style DNA data.`,
    ` */`,
    ``,
    `import type { StyleDnaLevel } from './types';`,
    `export type { ArtistReference, VocabularyEntry, StyleDnaLevel } from './types';`,
    ``,
    `const cache = new Map<string, StyleDnaLevel[]>();`,
    ``,
  ];

  for (const genreId of indexExports) {
    const cap = genreId[0].toUpperCase() + genreId.slice(1);
    indexLines.push(
      `export async function load${cap}StyleDna(): Promise<StyleDnaLevel[]> {`,
    );
    indexLines.push(
      `  if (cache.has('${genreId}')) return cache.get('${genreId}')!;`,
    );
    indexLines.push(`  const mod = await import('./${genreId}');`);
    indexLines.push(`  cache.set('${genreId}', mod.${genreId}StyleDna);`);
    indexLines.push(`  return mod.${genreId}StyleDna;`);
    indexLines.push(`}`);
    indexLines.push(``);
  }

  indexLines.push(
    `export async function getStyleDna(genreId: string): Promise<StyleDnaLevel[] | null> {`,
  );
  indexLines.push(
    `  const loaderMap: Record<string, () => Promise<StyleDnaLevel[]>> = {`,
  );
  for (const genreId of indexExports) {
    const cap = genreId[0].toUpperCase() + genreId.slice(1);
    indexLines.push(`    '${genreId}': load${cap}StyleDna,`);
  }
  indexLines.push(`  };`);
  indexLines.push(`  const loader = loaderMap[genreId];`);
  indexLines.push(`  if (!loader) return null;`);
  indexLines.push(`  return loader();`);
  indexLines.push(`}`);
  indexLines.push(``);

  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), indexLines.join('\n'));
  console.log(`\nGenerated: types.ts, index.ts`);
  console.log(`Total: ${indexExports.length} genres`);
}

main();
