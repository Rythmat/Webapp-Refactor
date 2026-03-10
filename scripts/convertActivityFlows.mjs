/**
 * Converts 42 activity flow CSVs + MD technical params into TypeScript data files.
 *
 * Usage: node scripts/convertActivityFlows.mjs
 *
 * Reads from: ~/Desktop/Music Atlas Curriculum/csv Files/csv_Activity Flows/
 *             ~/Desktop/Music Atlas Curriculum/md Files/md_Activity Flows/
 * Writes to:  src/curriculum/data/activityFlows/
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CSV_DIR = path.join(
  os.homedir(),
  'Desktop/Music Atlas Curriculum/csv Files/csv_Activity Flows',
);
const MD_DIR = path.join(
  os.homedir(),
  'Desktop/Music Atlas Curriculum/md Files/md_Activity Flows',
);
const OUT_DIR = path.join(process.cwd(), 'src/curriculum/data/activityFlows');

// ---------------------------------------------------------------------------
// Assessment type mapping
// ---------------------------------------------------------------------------

function parseAssessmentType(text) {
  if (!text || text.trim() === '') return null;
  const t = text.toLowerCase();
  if (t.includes('no pass/fail')) return null;
  if (t.includes('duration')) return 'pitch_order_timing_duration';
  if (t.includes('onset timing') || t.includes('+ timing'))
    return 'pitch_order_timing';
  if (
    t.includes('any order') ||
    (t.includes('exact') && t.includes('no timing') && !t.includes('order'))
  )
    return 'pitch_only';
  if (
    t.includes('correct order') ||
    t.includes('correct notes') ||
    t.includes('exact note')
  ) {
    if (t.includes('no timing')) return 'pitch_order';
    return 'pitch_order_timing';
  }
  if (t.includes('exact voicing') && t.includes('no timing'))
    return 'pitch_only';
  if (t.includes('exact voicing')) return 'pitch_order_timing';
  // Default: if it mentions notes but nothing specific
  return 'pitch_order';
}

// ---------------------------------------------------------------------------
// CSV parsing (simple, handles quoted fields with commas)
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
// Section parsing
// ---------------------------------------------------------------------------

function parseSectionId(sectionStr) {
  if (!sectionStr) return null;
  if (sectionStr.includes('SECTION A')) return 'A';
  if (sectionStr.includes('SECTION B')) return 'B';
  if (sectionStr.includes('SECTION C')) return 'C';
  if (sectionStr.includes('SECTION D')) return 'D';
  return null;
}

function sectionName(id) {
  return { A: 'Melody', B: 'Chords', C: 'Bass', D: 'Play-Along' }[id] || id;
}

// ---------------------------------------------------------------------------
// MD technical params parsing
// ---------------------------------------------------------------------------

function parseMDParams(mdContent) {
  const params = {
    title: '',
    defaultKey: 'C major',
    tempoRange: [100, 120],
    swing: 0,
    grooves: [],
  };

  // Title from first heading
  const titleMatch = mdContent.match(/^#\s+(.+?)(?:\s*—\s*"(.+?)")?$/m);
  if (titleMatch) {
    params.title = titleMatch[2] || titleMatch[1];
  }

  // Default key — MD format: "- **Default key**: C major"
  const keyMatch = mdContent.match(/Default key\**[:\s]+(.+)/i);
  if (keyMatch) params.defaultKey = keyMatch[1].replace(/\*+/g, '').trim();

  // Tempo — MD format: "- **Tempo**: [70, 110]"
  const tempoMatch = mdContent.match(/Tempo\**[:\s]+\[(\d+),\s*(\d+)\]/i);
  if (tempoMatch)
    params.tempoRange = [parseInt(tempoMatch[1]), parseInt(tempoMatch[2])];

  // Swing — MD format: "- **Swing**: 0" or "- **Swing**: 5-8"
  const swingMatch = mdContent.match(/Swing\**[:\s]+([\d-]+)/i);
  if (swingMatch) {
    const val = swingMatch[1];
    if (val.includes('-')) {
      const parts = val.split('-').map(Number);
      params.swing = Math.round((parts[0] + parts[1]) / 2);
    } else {
      params.swing = parseInt(val);
    }
  }

  // Grooves — MD format: "- **Grooves**: groove_pop_01, groove_pop_02"
  const grooveMatch = mdContent.match(/Grooves\**[:\s]+(.+)/i);
  if (grooveMatch) {
    // Extract all groove_xxx IDs, handling ranges like groove_jazz_01-03
    const raw = grooveMatch[1].replace(/\*+/g, '');
    const parts = raw
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    const grooves = [];
    for (const part of parts) {
      const rangeMatch = part.match(/^(groove_\w+_)(\d+)-(\d+)$/);
      if (rangeMatch) {
        const prefix = rangeMatch[1];
        const start = parseInt(rangeMatch[2]);
        const end = parseInt(rangeMatch[3]);
        for (let i = start; i <= end; i++) {
          grooves.push(`${prefix}${String(i).padStart(2, '0')}`);
        }
      } else if (part.startsWith('groove_')) {
        grooves.push(part);
      }
    }
    params.grooves = grooves;
  }

  return params;
}

// ---------------------------------------------------------------------------
// Build activity flow from CSV rows + MD params
// ---------------------------------------------------------------------------

function buildActivityFlow(rows, mdParams, genre, level) {
  const sections = new Map();

  let stepNumber = 0;
  for (const row of rows) {
    const sectionId = parseSectionId(row.section);
    if (!sectionId) continue; // Skip generation header rows

    if (!sections.has(sectionId)) {
      sections.set(sectionId, {
        id: sectionId,
        name: sectionName(sectionId),
        steps: [],
      });
    }

    // Skip "C1.1-C1.6" placeholder rows
    if (row.activity && row.activity.includes('-C1.6')) continue;

    stepNumber++;
    const step = {
      stepNumber,
      module: row.module || `${genre}_l${level}`,
      section: sectionId,
      subsection: row.subsection || '',
      activity: row.activity || '',
      direction: row.direction || '',
      assessment: parseAssessmentType(row.assessment),
      tag: row.tag || '',
      styleRef: row.style_ref || '',
      successFeedback: row.success_feedback || '',
      contentGeneration: row.content_generation || '',
    };

    sections.get(sectionId).steps.push(step);
  }

  return {
    genre,
    level,
    title: mdParams.title || `${genre} Level ${level}`,
    params: {
      defaultKey: mdParams.defaultKey,
      tempoRange: mdParams.tempoRange,
      swing: mdParams.swing,
      grooves: mdParams.grooves,
    },
    sections: Array.from(sections.values()),
  };
}

// ---------------------------------------------------------------------------
// TS code generation
// ---------------------------------------------------------------------------

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function genStepTS(step, indent) {
  const i = ' '.repeat(indent);
  const lines = [
    `${i}{`,
    `${i}  stepNumber: ${step.stepNumber},`,
    `${i}  module: '${escapeStr(step.module)}',`,
    `${i}  section: '${step.section}',`,
    `${i}  subsection: '${escapeStr(step.subsection)}',`,
    `${i}  activity: '${escapeStr(step.activity)}',`,
    `${i}  direction: '${escapeStr(step.direction)}',`,
    `${i}  assessment: ${step.assessment ? `'${step.assessment}'` : 'null'},`,
    `${i}  tag: '${escapeStr(step.tag)}',`,
    `${i}  styleRef: '${escapeStr(step.styleRef)}',`,
    `${i}  successFeedback: '${escapeStr(step.successFeedback)}',`,
    `${i}  contentGeneration: '${escapeStr(step.contentGeneration)}',`,
    `${i}},`,
  ];
  return lines.join('\n');
}

function genFlowTS(flow, varName) {
  const lines = [
    `export const ${varName}: ActivityFlow = {`,
    `  genre: '${escapeStr(flow.genre)}',`,
    `  level: ${flow.level},`,
    `  title: '${escapeStr(flow.title)}',`,
    `  params: {`,
    `    defaultKey: '${escapeStr(flow.params.defaultKey)}',`,
    `    tempoRange: [${flow.params.tempoRange.join(', ')}],`,
    `    swing: ${flow.params.swing},`,
    `    grooves: [${flow.params.grooves.map((g) => `'${g}'`).join(', ')}],`,
    `  },`,
    `  sections: [`,
  ];

  for (const section of flow.sections) {
    lines.push(`    {`);
    lines.push(`      id: '${section.id}',`);
    lines.push(`      name: '${section.name}',`);
    lines.push(`      steps: [`);
    for (const step of section.steps) {
      lines.push(genStepTS(step, 8));
    }
    lines.push(`      ],`);
    lines.push(`    },`);
  }

  lines.push(`  ],`);
  lines.push(`};`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Genre name mapping
// ---------------------------------------------------------------------------

const GENRE_FILE_MAP = {
  African: 'african',
  Blues: 'blues',
  Electronic: 'electronic',
  Folk: 'folk',
  Funk: 'funk',
  Hip_Hop: 'hipHop',
  Jam_Band: 'jamBand',
  Jazz: 'jazz',
  Latin: 'latin',
  Neo_Soul: 'neoSoul',
  Pop: 'pop',
  Reggae: 'reggae',
  RnB: 'rnb',
  Rock: 'rock',
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const csvFiles = fs.readdirSync(CSV_DIR).filter((f) => f.endsWith('.csv'));
  console.log(`Found ${csvFiles.length} CSV files`);

  // Group by genre
  const genreFlows = new Map();

  for (const csvFile of csvFiles) {
    const match = csvFile.match(/^(.+?)_Level_(\d+)_Activity_Flow\.csv$/);
    if (!match) {
      console.warn(`Skipping unrecognized file: ${csvFile}`);
      continue;
    }

    const genreRaw = match[1];
    const level = parseInt(match[2]);
    const genreId = GENRE_FILE_MAP[genreRaw];
    if (!genreId) {
      console.warn(`Unknown genre: ${genreRaw}`);
      continue;
    }

    // Read CSV
    const csvContent = fs.readFileSync(path.join(CSV_DIR, csvFile), 'utf-8');
    const rows = parseCSV(csvContent);

    // Read MD params
    const mdFile = csvFile.replace('.csv', '.md');
    const mdPath = path.join(MD_DIR, mdFile);
    let mdParams = {
      title: `${genreRaw.replace(/_/g, ' ')} Level ${level}`,
      defaultKey: 'C major',
      tempoRange: [100, 120],
      swing: 0,
      grooves: [],
    };
    if (fs.existsSync(mdPath)) {
      const mdContent = fs.readFileSync(mdPath, 'utf-8');
      mdParams = parseMDParams(mdContent);
    } else {
      console.warn(`No MD file found for: ${mdFile}`);
    }

    const flow = buildActivityFlow(rows, mdParams, genreId, level);

    if (!genreFlows.has(genreId)) {
      genreFlows.set(genreId, []);
    }
    genreFlows.get(genreId).push(flow);
  }

  // Generate per-genre TS files
  const indexExports = [];

  for (const [genreId, flows] of genreFlows) {
    flows.sort((a, b) => a.level - b.level);

    const fileLines = [
      `/**`,
      ` * Auto-generated activity flows for ${genreId}.`,
      ` * Source: ~/Desktop/Music Atlas Curriculum/csv Files/csv_Activity Flows/`,
      ` */`,
      ``,
      `import type { ActivityFlow } from '../../types/activity';`,
      ``,
    ];

    for (const flow of flows) {
      const varName = `${genreId}L${flow.level}`;
      fileLines.push(genFlowTS(flow, varName));
      fileLines.push('');
    }

    // Export all levels
    const varNames = flows.map((f) => `${genreId}L${f.level}`);
    fileLines.push(
      `export const ${genreId}Flows = [${varNames.join(', ')}] as const;`,
    );
    fileLines.push('');

    const filePath = path.join(OUT_DIR, `${genreId}.ts`);
    fs.writeFileSync(filePath, fileLines.join('\n'));
    console.log(
      `  Generated: ${genreId}.ts (${flows.length} levels, ${flows.reduce((s, f) => s + f.sections.reduce((ss, sec) => ss + sec.steps.length, 0), 0)} steps)`,
    );

    indexExports.push({ genreId, varNames });
  }

  // Generate index.ts with lazy loaders
  const indexLines = [
    `/**`,
    ` * Auto-generated barrel for activity flow data.`,
    ` * Lazy-loaded per genre to minimize initial bundle.`,
    ` */`,
    ``,
    `import type { ActivityFlow } from '../../types/activity';`,
    ``,
    `// ---------------------------------------------------------------------------`,
    `// Lazy loaders`,
    `// ---------------------------------------------------------------------------`,
    ``,
    `const cache = new Map<string, ActivityFlow[]>();`,
    ``,
  ];

  for (const { genreId } of indexExports) {
    indexLines.push(
      `export async function load${genreId[0].toUpperCase() + genreId.slice(1)}Flows(): Promise<ActivityFlow[]> {`,
    );
    indexLines.push(`  const key = '${genreId}';`);
    indexLines.push(`  if (cache.has(key)) return cache.get(key)!;`);
    indexLines.push(`  const mod = await import('./${genreId}');`);
    indexLines.push(`  const flows = [...mod.${genreId}Flows];`);
    indexLines.push(`  cache.set(key, flows);`);
    indexLines.push(`  return flows;`);
    indexLines.push(`}`);
    indexLines.push(``);
  }

  // Convenience: load all
  indexLines.push(
    `export async function loadAllFlows(): Promise<Map<string, ActivityFlow[]>> {`,
  );
  indexLines.push(`  const all = new Map<string, ActivityFlow[]>();`);
  indexLines.push(`  const loaders = [`);
  for (const { genreId } of indexExports) {
    indexLines.push(
      `    ['${genreId}', load${genreId[0].toUpperCase() + genreId.slice(1)}Flows] as const,`,
    );
  }
  indexLines.push(`  ];`);
  indexLines.push(`  await Promise.all(loaders.map(async ([id, loader]) => {`);
  indexLines.push(`    all.set(id, await loader());`);
  indexLines.push(`  }));`);
  indexLines.push(`  return all;`);
  indexLines.push(`}`);
  indexLines.push(``);

  // Get flow by genre + level
  indexLines.push(
    `export async function getActivityFlow(genreId: string, level: number): Promise<ActivityFlow | null> {`,
  );
  indexLines.push(
    `  const loaderMap: Record<string, () => Promise<ActivityFlow[]>> = {`,
  );
  for (const { genreId } of indexExports) {
    indexLines.push(
      `    '${genreId}': load${genreId[0].toUpperCase() + genreId.slice(1)}Flows,`,
    );
  }
  indexLines.push(`  };`);
  indexLines.push(`  const loader = loaderMap[genreId];`);
  indexLines.push(`  if (!loader) return null;`);
  indexLines.push(`  const flows = await loader();`);
  indexLines.push(`  return flows.find(f => f.level === level) ?? null;`);
  indexLines.push(`}`);
  indexLines.push(``);

  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), indexLines.join('\n'));
  console.log(`  Generated: index.ts`);

  // Summary
  let totalSteps = 0;
  let totalFlows = 0;
  for (const [, flows] of genreFlows) {
    totalFlows += flows.length;
    for (const flow of flows) {
      for (const section of flow.sections) {
        totalSteps += section.steps.length;
      }
    }
  }
  console.log(
    `\nTotal: ${totalFlows} flows, ${totalSteps} steps across ${genreFlows.size} genres`,
  );
}

main();
