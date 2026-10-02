import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SuggestionDecision } from '@/content/suggestions/types';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  DECISIONS_ARTIFACTS_VERSION,
  decisionsFileText,
  parseDecisionsFile,
} from '@/features/admin/content/mock/decisions';
import {
  acquireRunLock,
  type RunLock,
} from '@/scripts/enrichment/import/runLock';
import type { GitRunner } from './gitStatus';
import { gitHolds, type ImportReport } from './importAll';
import { addedSourceMentions, type KnownWrong } from './importRules';
import {
  CHORD_SPELLING_FIXES,
  fixChord,
  gateProblems,
  planSheetImport,
  readProgressionSheet,
  type SheetImportPlan,
  type SheetRead,
} from './progressionSheet';
import {
  DECISIONS_PATH,
  IMPORT_LOCK_FILE,
  loadRepoStore,
  type RepoStore,
  repoContentRoot,
  writeRepoFiles,
} from './repoStore';
import { type FilePlan, type ItemChange, sha256 } from './sources/common';
import { LIBRARY_FILE } from './sources/progressions';
import { readXlsx } from './xlsx';

/**
 * The progression sheet import (Amendment 8, phase 8.2): the owner's sheet
 * "Every Chord Progression", read one last time into the chord progression
 * library, after which the sheet is retired and progressions are edited in
 * Cortex.
 *
 *   npx tsx src/scripts/repoContent/importProgressionSheet.ts --dry-run <workbook.xlsx>
 *   npx tsx src/scripts/repoContent/importProgressionSheet.ts --dry-run --sheet <workbook.xlsx> --report <out.md>
 *
 * Run from the repo root; `REPO_CONTENT_ROOT` points it at a copy of the
 * repo instead. The workbook is the sheet as Google exports it (File,
 * Download, Microsoft Excel).
 *
 * What it changes is decided in `progressionSheet.ts`: four misspelled
 * chords, empty song and artist text the sheet fills, and the songs the
 * app's linker is sure of. Vibes, styles and complexity are compared and
 * never written. Nothing is added or taken away.
 *
 * How it goes:
 *  1. Read the workbook. Then take the bulk import's run lock
 *     (`IMPORT_LOCK_FILE`): one import at a time, and a repo-mode dev
 *     server saves nothing while it is held. A dry run takes it too, so it
 *     never reads files another import is halfway through writing.
 *  2. Load the repo store, the songs and the committed decisions log, and
 *     plan (`planSheetImport`).
 *  3. Hand the changed entries to the progressions adapter, which works out
 *     the library file's new text, and read that back
 *     (`RepoStore.plan`, `verify`).
 *  4. The gate: only the fields the import may change move
 *     (`gateProblems`), only the library and the decisions log are
 *     written, no file comes to name an outside catalogue, the workbook
 *     read cleanly, and planning again from the files as they would be
 *     changes nothing (the import is idempotent).
 *  5. A dry run stops here, reads every data file again and checks each
 *     still has the hash it had when loaded: it writes nothing. A real run
 *     asks git whether it holds the files as they are (as the bulk import
 *     does), checks they are still the ones planned from, writes them, and
 *     checks what landed.
 *
 * Nothing here is shown on the site; the report is for the owner.
 */

type Body = Record<string, unknown>;

export interface SheetImportOptions {
  /** Plan, check and report, and write no data file. */
  dryRun: boolean;
  /** The workbook's path; or `read`, for a sheet already read. */
  workbook?: string;
  read?: SheetRead;
  /** The repo, or a copy of it; `repoContentRoot()` by default. */
  root?: string;
  /** Write even over files git does not hold as they are. */
  allowUncommitted?: boolean;
  /** How git is run; false for no git at all. */
  git?: GitRunner | false;
  /** `KNOWN_WRONG` by default. */
  knownWrong?: readonly KnownWrong[];
  now?: () => Date;
  log?: (line: string) => void;
}

export interface SheetImportReport {
  generatedAt: string;
  dryRun: boolean;
  root: string;
  /** The workbook's file name, or `(rows given)`. */
  workbook: string;
  /** Whether it wrote the data files (never on a dry run). */
  wrote: boolean;
  read: SheetRead;
  plan: SheetImportPlan;
  /** The library's entries, as loaded. */
  libraryEntries: number;
  /** The files a real run writes. */
  files: {
    path: string;
    items: number;
    bytesBefore: number | null;
    bytesAfter: number | null;
  }[];
  /** Planning again from the files as a real run would leave them. */
  secondRun: { changes: number; decisions: number };
  gate: { ok: boolean; problems: string[] };
  git: ImportReport['git'];
  /**
   * Every data file the store read, and the decisions log, hashed when
   * loaded and again at the end: on a dry run none may move.
   */
  hashes: { files: number; moved: string[] };
}

/** Reads a workbook into the sheet's progression rows. */
export function readWorkbook(path: string): SheetRead {
  return readProgressionSheet(readXlsx(readFileSync(path)));
}

/** The decisions log as committed; throws when it cannot be read in full. */
async function committedDecisions(store: RepoStore): Promise<{
  decisions: SuggestionDecision[];
  text: string | null;
  sha: string | null;
}> {
  const file = await store.reader.read(DECISIONS_PATH);
  if (!file) return { decisions: [], text: null, sha: null };
  const parsed = parseDecisionsFile(file.text);
  if (parsed.error || parsed.refused.length)
    throw new Error(
      `${DECISIONS_PATH} has rows that cannot be read (${
        parsed.error ?? parsed.refused.join(', ')
      }); fix the file first`,
    );
  return { decisions: parsed.decisions, text: file.text, sha: file.sha256 };
}

const bodiesOf = (store: RepoStore): Body[] =>
  store.items('chord_progression').map((item) => item.body as Body);

const songsOf = (store: RepoStore): Song[] =>
  store.items('song').map((item) => item.body as unknown as Song);

/** Runs the import. Throws before writing anything when it cannot finish. */
export async function runSheetImport(
  options: SheetImportOptions,
): Promise<SheetImportReport> {
  const root = options.root ?? repoContentRoot();
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  if (!existsSync(join(root, LIBRARY_FILE)))
    throw new Error(
      `${root} is not a copy of the repo: it has no ${LIBRARY_FILE}`,
    );
  if (!options.read && !options.workbook)
    throw new Error(
      'name the workbook to read (the sheet, downloaded as .xlsx)',
    );
  const read = options.read ?? readWorkbook(options.workbook!);
  const workbook = options.workbook
    ? basename(options.workbook)
    : '(rows given)';
  log(
    `Read ${read.rows.length} progression rows from ${read.tabs.length} tabs of ${workbook}`,
  );

  let lock: RunLock;
  try {
    lock = acquireRunLock(join(root, IMPORT_LOCK_FILE), { now });
  } catch (error) {
    const holder = /\(process \d+, since [^)]+\)/.exec(
      (error as Error).message,
    );
    throw new Error(
      `another import is running on this copy of the repo ${holder?.[0] ?? ''} and holds ${IMPORT_LOCK_FILE}: wait for it to finish, or stop it first`,
    );
  }
  try {
    log(`Loading the repo store from ${root}`);
    const store = await loadRepoStore({ root });
    const committed = await committedDecisions(store);
    const loadedHashes = store.fileIndex();
    loadedHashes.set(DECISIONS_PATH, committed.sha);

    const at = now().toISOString();
    const plan = planSheetImport({
      read,
      bodies: bodiesOf(store),
      songs: songsOf(store),
      decisions: committed.decisions,
      knownWrong: options.knownWrong,
      at,
    });
    log(
      `Paired ${plan.pairing.pairs.length} rows; ${plan.changes.length} entries would change`,
    );

    // The library file, worked out by its adapter and read back.
    const changes: ItemChange[] = plan.changes.map((change) => ({
      kind: 'chord_progression',
      slug: String(change.id),
      body: change.after,
    }));
    const plans = changes.length ? await store.plan(changes) : [];
    const after = await store.verify(changes, plans);
    const decisionsPlan: FilePlan | null = plan.decisions.length
      ? {
          path: DECISIONS_PATH,
          before: committed.text,
          baseSha256: committed.sha,
          text: decisionsFileText({
            artifactsVersion: DECISIONS_ARTIFACTS_VERSION,
            decisions: [...committed.decisions, ...plan.decisions],
          }),
          items: [],
        }
      : null;
    const writes = decisionsPlan ? [...plans, decisionsPlan] : plans;

    // Idempotent: planned again from the files as they would be, nothing moves.
    const again = planSheetImport({
      read,
      bodies: bodiesOf(after),
      songs: songsOf(after),
      decisions: [...committed.decisions, ...plan.decisions],
      knownWrong: options.knownWrong,
      at,
    });
    const secondRun = {
      changes: again.changes.length,
      decisions: again.decisions.length,
    };

    const gate = { ok: true, problems: [] as string[] };
    for (const change of plan.changes)
      for (const problem of gateProblems(change.before, change.after))
        gate.problems.push(`id ${change.id}: ${problem}`);
    for (const planned of writes) {
      if (planned.path !== LIBRARY_FILE && planned.path !== DECISIONS_PATH)
        gate.problems.push(
          `the plan writes ${planned.path}, which the import never writes`,
        );
      const added = addedSourceMentions(planned.before, planned.text);
      if (added.length)
        gate.problems.push(
          `${planned.path} would come to name an outside catalogue (${added.slice(0, 3).join(', ')})`,
        );
    }
    for (const problem of read.problems)
      gate.problems.push(`the workbook: ${problem}`);
    for (const problem of plan.chordProblems)
      gate.problems.push(
        `${problem.where} has the chord "${problem.chord}", which Prism cannot read (${problem.why})`,
      );
    if (secondRun.changes || secondRun.decisions)
      gate.problems.push(
        `a second run would change ${secondRun.changes} more entries, so the import is not idempotent`,
      );
    gate.ok = gate.problems.length === 0;

    const report: SheetImportReport = {
      generatedAt: at,
      dryRun: options.dryRun,
      root,
      workbook,
      wrote: false,
      read,
      plan,
      libraryEntries: store.items('chord_progression').length,
      files: writes.map((planned) => ({
        path: planned.path,
        items: planned.items.length,
        bytesBefore:
          planned.before === null ? null : Buffer.byteLength(planned.before),
        bytesAfter:
          planned.text === null ? null : Buffer.byteLength(planned.text),
      })),
      secondRun,
      gate,
      git: await gitHolds(root, writes, options.git),
      hashes: { files: loadedHashes.size, moved: [] },
    };

    if (!options.dryRun) {
      if (!gate.ok)
        throw new Error(
          `the gate refused the plan, so no data file was written: ${gate.problems.slice(0, 5).join('; ')}`,
        );
      if (report.git.uncommitted.length && !options.allowUncommitted)
        throw new Error(
          `git does not hold ${report.git.uncommitted
            .map((file) => file.path)
            .join(
              ', ',
            )} as they are, so a run that failed part way could not be undone from git: commit them first, or pass --allow-uncommitted. No data file was written`,
        );
      if (writes.length) {
        await store.checkBases(writes);
        log(`Writing ${writes.length} files`);
        await writeRepoFiles(
          root,
          writes.map(({ path, text }) => ({ path, text })),
        );
        for (const planned of writes) {
          const landed = await store.reader.read(planned.path);
          if (
            (landed?.sha256 ?? null) !==
            (planned.text === null ? null : sha256(planned.text))
          )
            throw new Error(
              `${planned.path} does not hold what was written; restore it from git and run again`,
            );
        }
        report.wrote = true;
      }
    }

    // Every data file hashed again: a dry run must have moved none, and a
    // real run only the files it wrote.
    const written = new Set(
      report.wrote ? writes.map((planned) => planned.path) : [],
    );
    for (const [path, sha] of loadedHashes) {
      if (written.has(path)) continue;
      const now = await store.reader.read(path);
      if ((now?.sha256 ?? null) !== sha) report.hashes.moved.push(path);
    }
    if (report.hashes.moved.length)
      throw new Error(
        `files changed on disk during the run, and the import did not write them: ${report.hashes.moved.join(', ')}`,
      );
    return report;
  } finally {
    lock.release();
  }
}

/* ── The owner's report ────────────────────────────────────────────── */

const code = (value: string) => `\`${value.replace(/`/g, "'")}\``;
const chordsText = (chords: readonly string[]) => chords.map(code).join(' → ');
const cellText = (value: string) =>
  value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
/** `a`, `a and b`, `a, b and c`; a dash for none. */
const listText = (values: readonly string[]) =>
  values.length > 1
    ? `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`
    : (values[0] ?? '—');

/** `n thing` or `n things`. */
const count = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

function table(
  head: readonly string[],
  rows: readonly (readonly string[])[],
): string[] {
  return [
    `| ${head.join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.map(cellText).join(' | ')} |`),
  ];
}

/** Up to `n` items spread evenly over a list, in its order. */
function spread<T>(items: readonly T[], n: number): T[] {
  if (items.length <= n) return [...items];
  return Array.from(
    { length: n },
    (_, index) => items[Math.floor((index * items.length) / n)],
  );
}

function tagTally(tally: Record<string, number>): string {
  const entries = Object.entries(tally).sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1),
  );
  return entries.length
    ? entries.map(([tag, n]) => `${tag} ${n}`).join(', ')
    : 'none';
}

/** The report the owner reads before the real run, as Markdown. */
export function reportMarkdown(report: SheetImportReport): string {
  const { plan, read } = report;
  const { pairing } = plan;
  const exact = pairing.pairs.filter((pair) => pair.how === 'exact').length;
  const corrected = pairing.pairs.length - exact;
  const bodyOf = new Map<number, Body>();
  for (const change of plan.changes) bodyOf.set(change.id, change.before);
  for (const pair of pairing.pairs) bodyOf.set(pair.entry.id, pair.entry.body);
  for (const entry of pairing.unpaired) bodyOf.set(entry.id, entry.body);
  const tags = (id: number, field: string) => {
    const value = bodyOf.get(id)?.[field];
    return Array.isArray(value) && value.length ? value.join(', ') : '—';
  };
  const textOf = (id: number, field: string) => {
    const value = bodyOf.get(id)?.[field];
    return typeof value === 'string' && value.trim() ? value : '—';
  };
  const fixedChords = (id: number) => {
    const value = bodyOf.get(id)?.chords;
    return Array.isArray(value)
      ? value.map((chord) => fixChord(String(chord)))
      : [];
  };
  const clear = plan.complexity.filter((row) => row.kind === 'clear');
  const slash = plan.complexity.filter((row) => row.kind === 'slash');
  const fieldsChanged = (id: number) => {
    const change = plan.changes.find((c) => c.id === id)!;
    return Object.keys(change.after).filter(
      (key) =>
        JSON.stringify(change.before[key]) !==
        JSON.stringify(change.after[key]),
    );
  };
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(
    `# Progression sheet import: ${report.dryRun ? 'dry run' : 'run'}`,
    '',
    `${report.generatedAt.slice(0, 10)}. The sheet "Every Chord Progression" (\`${report.workbook}\`), read against the chord progression library (${count(report.libraryEntries, 'entry', 'entries')}).`,
    report.dryRun
      ? 'This was a dry run: **nothing was written**. Every data file was hashed before and after, and none moved.'
      : report.wrote
        ? 'This run wrote the files listed under "What a real run writes".'
        : 'This run had nothing to write.',
    '',
    '## In short',
    '',
    `- **Read.** ${count(read.rows.length, 'progression row')} in ${count(read.tabs.length, 'tab')}. ${count(read.wrongTab.length, 'row sits', 'rows sit')} in the wrong tab; they are matched by their chords, so it does not matter.`,
    `- **Paired.** ${pairing.pairs.length} rows pair with a library entry: ${exact} exactly and ${corrected} once a misspelled chord is corrected. ${count(pairing.secondCopies.length, 'row is a second copy', 'rows are second copies')} of a progression the library holds once, and ${pairing.secondCopies.length === 1 ? 'is' : 'are'} skipped. ${pairing.notInLibrary.length ? `${count(pairing.notInLibrary.length, 'row is', 'rows are')} not in the library at all; the import adds nothing, so ${pairing.notInLibrary.length === 1 ? 'it is' : 'they are'} listed below.` : 'Every row is already in the library, so nothing new is added.'}`,
    `- **Kept.** ${count(pairing.unpaired.length, 'library entry', 'library entries')} no row pairs with (${listText(pairing.unpaired.map((e) => `id ${e.id}`))}) ${pairing.unpaired.length === 1 ? 'stays' : 'stay'} as ${pairing.unpaired.length === 1 ? 'it is' : 'they are'}.`,
    `- **Chords corrected.** ${count(plan.chordFixes.length, 'library entry', 'library entries')} (${listText(plan.chordFixes.map((fix) => `id ${fix.id}`))}), and ${count(plan.sheetFixes.length, 'sheet row')}.`,
    `- **Text.** ${plan.textMerges.length ? `${count(plan.textMerges.length, 'empty song or artist field')} filled from the sheet.` : 'No song or artist text to add: the library already has every name the sheet gives.'}${plan.textDiffers.length ? ` ${count(plan.textDiffers.length, 'field is', 'fields are')} written differently in the two; the library's stays.` : ''}`,
    `- **Song links.** ${plan.songLinks.length ? `${count(plan.songLinks.length, 'new song link')}.` : 'No new song links: every sure match is already linked.'}${plan.songLinksHeld.length ? ` ${count(plan.songLinksHeld.length, 'match is', 'matches are')} held back (see "Song links").` : ''}`,
    `- **Vibes, styles and complexity** are compared and never changed. Vibes differ on ${plan.vibes.rows.length} of the ${plan.vibes.sheetHas} rows where the sheet has vibes; styles on ${plan.styles.rows.length} of ${plan.styles.sheetHas}; the stored complexity looks wrong on ${count(clear.length, 'entry', 'entries')}, and ${slash.length} more depend on how slash chords are read.`,
    `- **Duplicates.** ${count(plan.duplicates.length, 'pair', 'pairs')} of entries share one chord sequence.`,
    `- **A real run** would change ${count(plan.changes.length, 'entry', 'entries')} in ${count(report.files.length, 'file')}. Run twice, the second run changes ${report.secondRun.changes}. The safety checks ${report.gate.ok ? 'pass' : `**fail**: ${report.gate.problems.join('; ')}`}.`,
    '- **Two decisions** are needed before the real run: Q7 (the two cut-off copies) and Q8 (the duplicate pairs). They are at the end of this report.',
    '',
    '## What the sheet holds',
    '',
    ...table(
      ['Tab', 'Rows', 'Columns read'],
      read.tabs.map((tab) => [
        tab.name,
        String(tab.progressions),
        Object.entries(tab.columns)
          .filter(([, role]) => role !== 'chord')
          .map(([column, role]) => `${role} (${column})`)
          .join(', ') || 'chords only',
      ]),
    ),
    '',
    `The ${listText(read.otherTabs.map((name) => `"${name}"`))} tab holds the vibe and style rules, not progressions. Phase 8.6 turns those rules into app logic. ${count(read.labels.length, 'row is a heading', 'rows are headings')}, such as "Starting on the 1", and ${read.labels.length === 1 ? 'is' : 'are'} not read as a progression.`,
    '',
  );
  if (read.wrongTab.length)
    push(
      'Rows in the wrong tab:',
      '',
      ...table(
        ['Tab', 'Row', 'First chord', 'Belongs in'],
        read.wrongTab.map((row) => [
          row.tab,
          String(row.row),
          code(row.first),
          row.belongsIn ?? 'no tab (a chord with no tab of its own)',
        ]),
      ),
      '',
    );
  if (read.unlabelled.length)
    push(
      "Song names in a column with no heading. They are read as the row's song:",
      '',
      ...table(
        ['Tab', 'Cell', 'Text'],
        read.unlabelled.map((cell) => [
          cell.tab,
          `${cell.column}${cell.row}`,
          cell.text,
        ]),
      ),
      '',
    );
  if (read.problems.length)
    push(
      'Could not be read:',
      '',
      ...read.problems.map((problem) => `- ${problem}`),
      '',
    );

  push(
    '## Chord spelling fixes',
    '',
    `${count(Object.keys(CHORD_SPELLING_FIXES).length, 'chord is', 'chords are')} misspelled. The fix list is written out in the import, and nothing is guessed:`,
    '',
    ...table(
      ['Written', 'Corrected'],
      Object.entries(CHORD_SPELLING_FIXES).map(([from, to]) => [
        code(from),
        code(to),
      ]),
    ),
    '',
    "The brief found the first four. The last two are stray spaces in two of the sheet's cells; the brief's reading of the sheet had already tidied them, so it did not see them. Neither is in the library, which spells both chords correctly.",
    '',
    'In the library, the progression text, chord count, starting chord and starting degree are worked out again with the corrected chords:',
    '',
    ...table(
      ['Id', 'Before', 'After'],
      plan.chordFixes.map((fix) => [
        String(fix.id),
        chordsText(fix.before),
        chordsText(fix.after),
      ]),
    ),
    '',
    'In the sheet (corrected before pairing):',
    '',
    ...table(
      ['Tab', 'Row', 'Before', 'After'],
      plan.sheetFixes.map((fix) => [
        fix.tab,
        String(fix.row),
        chordsText(fix.before),
        chordsText(fix.after),
      ]),
    ),
    '',
  );
  push(
    plan.chordProblems.length
      ? `Chords Prism still cannot read after the fixes: ${plan.chordProblems.map((p) => `${p.where} ${code(p.chord)} (${p.why})`).join('; ')}.`
      : 'After the fixes, every chord in the sheet and in the library is a chord Prism knows.',
    '',
    '## Pairing',
    '',
    `Rows are paired with entries by their chords. When a sequence appears more than once, the copies pair in order: the first row with the lowest id. ${exact} rows match exactly. ${corrected} match once the spelling is corrected (${listText(pairing.pairs.filter((p) => p.how === 'corrected').map((p) => `id ${p.entry.id}`))}).`,
    '',
  );
  if (pairing.secondCopies.length)
    push(
      'Second copies, skipped. The library holds each of these once, and that entry pairs with the first copy:',
      '',
      ...table(
        ['Tab', 'Row', 'Chords', 'Paired copy', 'What the second copy carries'],
        pairing.secondCopies.map(({ row, of }) => {
          const first = pairing.pairs.find((p) => p.entry.id === of);
          return [
            row.tab,
            String(row.row),
            chordsText(row.chords),
            `id ${of}${first ? ` (${first.row.tab} row ${first.row.row})` : ''}`,
            [
              row.vibe && `vibes "${row.vibe}"`,
              row.song && `song "${row.song}"`,
              row.artist && `artist "${row.artist}"`,
            ]
              .filter(Boolean)
              .join('; ') || 'nothing',
          ];
        }),
      ),
      '',
    );
  if (pairing.notInLibrary.length)
    push(
      'Rows the library does not hold. Nothing is added, so these stay out:',
      '',
      ...table(
        ['Tab', 'Row', 'Chords'],
        pairing.notInLibrary.map((row) => [
          row.tab,
          String(row.row),
          chordsText(row.chords),
        ]),
      ),
      '',
    );

  push('## Song and artist text', '');
  push(
    plan.textMerges.length
      ? 'Empty fields the sheet fills (where both have text, the library keeps its own):'
      : 'Nothing to fill. Wherever the sheet names a song or an artist, the library already has the same text.',
    '',
  );
  if (plan.textMerges.length)
    push(
      ...table(
        ['Id', 'Field', 'Text', 'From'],
        plan.textMerges.map((m) => [
          String(m.id),
          m.field,
          m.value,
          `${m.tab} row ${m.row}`,
        ]),
      ),
      '',
    );
  if (plan.textDiffers.length)
    push(
      "Written differently in the two (the library's stays):",
      '',
      ...table(
        ['Id', 'Field', 'Library', 'Sheet'],
        plan.textDiffers.map((d) => [
          String(d.id),
          d.field,
          d.library,
          d.sheet,
        ]),
      ),
      '',
    );

  push(
    '## Song links',
    '',
    'The app\'s own linker reads each progression\'s song text. Only its sure matches are linked: the title and the artist the sheet names must both agree with one song in the library. The "Hallelujah" match, which the import rules know is wrong, stays out.',
    '',
  );
  push(
    ...(plan.songLinks.length
      ? table(
          ['Id', 'Song', 'Artist', 'Why'],
          plan.songLinks.map((link) => [
            String(link.id),
            link.title,
            link.artist,
            link.why,
          ]),
        )
      : ['No new links: every sure match is already linked.']),
    '',
  );
  if (plan.songLinksHeld.length)
    push(
      'Matches held back:',
      '',
      ...table(
        ['Id', 'Song', 'Linker', 'Why'],
        plan.songLinksHeld.map((link) => [
          String(link.id),
          `${link.title} (${link.artist})`,
          link.tier,
          link.reason,
        ]),
      ),
      '',
    );
  if (plan.likelyLinks.length)
    push(
      `${count(plan.likelyLinks.length, 'likely match is', 'likely matches are')} not linked. A person checks ${plan.likelyLinks.length === 1 ? 'it' : 'them'} in the Table: ${plan.likelyLinks.map((link) => `id ${link.id} "${link.title}"`).join(', ')}.`,
      '',
    );

  const tagSection = (
    title: string,
    comparison: SheetImportPlan['vibes'],
    column: string,
  ) => {
    push(
      `## ${title} (reported, not changed)`,
      '',
      `The sheet has ${column} on ${count(comparison.sheetHas, 'paired row')}. ${comparison.same} match the library exactly. The library has every sheet ${column.replace(/s$/, '')} and more on ${comparison.libraryHasMore}. The library has none on ${comparison.libraryEmpty}. On ${comparison.differ}, the sheet has one the library lacks.`,
      '',
      `- In the sheet, not the library: ${tagTally(comparison.onlyInSheet)}.`,
      `- In the library, not the sheet: ${tagTally(comparison.onlyInLibrary)}.`,
      '',
    );
    const empty = comparison.rows.filter((row) => !row.library.length);
    if (empty.length)
      push(
        `The library has no ${column} at all on ${listText(empty.map((row) => `id ${row.id}`))}, where the sheet gives some. The import leaves them empty, as it does every ${column.replace(/s$/, '')}; the rules of phase 8.6 will suggest ${column} for every entry.`,
        '',
      );
    if (comparison.rows.length)
      push(
        `${comparison.rows.length > 15 ? '15 examples, spread across the library' : 'Every difference'}:`,
        '',
        ...table(
          ['Id', 'Sheet', 'Library', 'Row'],
          spread(comparison.rows, 15).map((row) => [
            String(row.id),
            row.sheet.join(', '),
            row.library.join(', ') || '—',
            `${row.tab} row ${row.row}`,
          ]),
        ),
        '',
      );
  };
  tagSection('Vibes', plan.vibes, 'vibes');
  tagSection('Styles', plan.styles, 'styles');

  push(
    '## Complexity (reported, not changed)',
    '',
    "The sheet has no complexity column, so each entry's stored complexity is checked against its chords. A chord with three notes is a triad, four is a 7th (or 6th) chord, and five or more is extended. The richest chord decides. There are two readings:",
    '',
    '- **by name**: what the chord type says, ignoring a slash bass;',
    '- **by sound**: the notes Prism actually plays, bass included.',
    '',
    'The readings differ only for slash chords.',
    '',
  );
  if (clear.length)
    push(
      'Both readings disagree with the stored value:',
      '',
      ...table(
        ['Id', 'Chords', 'Stored', 'From the chords'],
        clear.map((row) => [
          String(row.id),
          chordsText(row.chords),
          row.stored,
          row.byName ?? 'unknown chord',
        ]),
      ),
      '',
    );
  if (slash.length)
    push(
      'These depend on how a slash chord is read (brief Q6, asked at the Tesseract check-in):',
      '',
      ...table(
        ['Id', 'Chords', 'Stored', 'By name', 'By sound'],
        slash.map((row) => [
          String(row.id),
          chordsText(row.chords),
          row.stored,
          row.byName ?? '?',
          row.bySound ?? '?',
        ]),
      ),
      '',
    );
  push(
    `The research brief counted 7 (ids 12, 636, 678, 679, 680, 697 and 698) with a single reading. Here the entries whose slash chords split the two readings are listed on their own${slash.length ? ` (${listText(slash.map((row) => String(row.id)))})` : ''}.`,
    '',
    '## What a real run writes',
    '',
  );
  push(
    ...(plan.changes.length
      ? table(
          ['Id', 'Fields that change'],
          plan.changes.map((change) => [
            String(change.id),
            fieldsChanged(change.id).join(', '),
          ]),
        )
      : ['Nothing.']),
    '',
    ...report.files.map(
      (file) =>
        `- ${code(file.path)}: ${count(file.items, 'entry', 'entries')}, ${file.bytesBefore ?? 0} → ${file.bytesAfter ?? 0} bytes.`,
    ),
    '',
    '## How this was checked',
    '',
    `- **Nothing written.** ${count(report.hashes.files, 'data file')}, the decisions log included, were hashed when loaded and again at the end. ${report.hashes.moved.length ? `Moved: ${report.hashes.moved.join(', ')}.` : 'None moved.'}`,
    `- **The plan reads back.** The library file's new text was worked out by the same writer the console uses, then loaded again. Every entry came out as intended, and nothing else moved.`,
    `- **Idempotent.** Planned again from the files as the run would leave them, it changes ${report.secondRun.changes} entries and links ${report.secondRun.decisions} songs.`,
    `- **The gate.** Only chords (by the fix list), the four fields that follow from them, empty song and artist text, and new song links may change. Only the library file and the decisions log may be written, and nothing may come to name an outside catalogue. ${report.gate.ok ? 'Passed.' : `Failed: ${report.gate.problems.join('; ')}.`}`,
    `- **Git.** ${!report.git.answered ? `Did not answer (${report.git.error ?? 'no repository'}).` : report.git.uncommitted.length ? `${report.git.uncommitted.map((f) => code(f.path)).join(', ')} ${report.git.uncommitted.length === 1 ? 'has' : 'have'} changes not yet committed. A real run refuses until they are committed (or is told \`--allow-uncommitted\`), so a failed run can be undone from git.` : 'Holds every file a real run writes.'}`,
    '',
    '## Running it',
    '',
    '```',
    `npx tsx src/scripts/repoContent/importProgressionSheet.ts --dry-run --sheet <workbook.xlsx> --report <report.md>`,
    `npx tsx src/scripts/repoContent/importProgressionSheet.ts --sheet <workbook.xlsx>   # the real run, once Q7 and Q8 are answered`,
    '```',
    '',
  );

  // The two questions come last, so the report ends on what the owner decides.
  const fullIds = plan.cutOffs.flatMap((cut) => cut.continuedBy);
  const fullUntagged = fullIds.filter(
    (id) => tags(id, 'vibes') === '—' && tags(id, 'styles') === '—',
  );
  const dupLinks = plan.duplicates
    .flatMap((dup) => dup.ids)
    .filter((id) => tags(id, 'songIds') !== '—');
  push(
    '## Two decisions before the real run',
    '',
    '### Q7. The two cut-off copies',
    '',
    `Ids ${listText(plan.cutOffs.map((c) => String(c.id)))} are copies of longer progressions with the last chord missing. The sheet only has the full versions, which the library also holds.`,
    '',
    ...table(
      ['Id', 'Chords', 'Vibes', 'Styles', 'Song', 'Song links'],
      plan.cutOffs.flatMap((cut) => [
        [
          String(cut.id),
          chordsText(cut.chords),
          tags(cut.id, 'vibes'),
          tags(cut.id, 'styles'),
          textOf(cut.id, 'song'),
          tags(cut.id, 'songIds'),
        ],
        ...cut.continuedBy.map((id) => [
          `${id} (full)`,
          chordsText(fixedChords(id)),
          tags(id, 'vibes'),
          tags(id, 'styles'),
          textOf(id, 'song'),
          tags(id, 'songIds'),
        ]),
      ]),
    ),
    '',
    'Options:',
    '',
    `- **A. Keep both, and copy their vibes and styles to the full versions.** ${fullUntagged.length === fullIds.length ? 'The full versions have none today.' : `Of the full versions, ${listText(fullUntagged.map(String))} ${fullUntagged.length === 1 ? 'has' : 'have'} none today.`} Nothing is deleted, and the short ones end inside the full ones' branches in Tesseract.`,
    '- **B. Retire the cut-off copies.** Their vibes and styles move to the full versions, and the two ids are never used again.',
    '',
    'Recommendation: **A**. You asked to keep them, and copying the tags gives the full versions what they lack.',
    '',
    '### Q8. The duplicate pairs',
    '',
    'Each pair below is the same progression twice. The sheet has both copies too, so both pair.',
    '',
    ...table(
      ['Ids', 'Chords', 'Vibes', 'Styles', 'Complexity'],
      plan.duplicates.map((dup) => [
        dup.ids.join(' and '),
        chordsText(dup.chords),
        dup.ids.map((id) => tags(id, 'vibes')).join(' / '),
        dup.ids.map((id) => tags(id, 'styles')).join(' / '),
        dup.ids
          .map((id) => String(bodyOf.get(id)?.complexity ?? '—'))
          .join(' / '),
      ]),
    ),
    '',
    'Options:',
    '',
    '- **A. Merge each pair.** The lower id keeps the union of both sets of tags, and the higher id is retired and never used again.',
    '- **B. Keep both copies.** Tesseract then shows two ids on one node, and its drawer offers both.',
    '',
    `Recommendation: **A**. Chord editing in Cortex (phase 8.7) checks for duplicates, and these pairs would be its first finds. One thing to check first: UNISON stores progression ids, so a retired id must not be one it still uses. ${dupLinks.length ? `Ids ${listText(dupLinks.map(String))} have song links, which a merge keeps.` : 'None of these entries has a song link.'}`,
    '',
  );
  return `${out.join('\n')}\n`;
}

/* ── The command line ──────────────────────────────────────────────── */

export const USAGE = `Usage (from the repo root):
  npx tsx src/scripts/repoContent/importProgressionSheet.ts [--dry-run] [--sheet] WORKBOOK.xlsx [--report OUT.md] [--json OUT.json] [--allow-uncommitted]

  --dry-run            plan and check everything, and write no data file
  --sheet PATH         the sheet, downloaded as .xlsx (or give it as the one argument)
  --report PATH        write the owner's report (Markdown) there
  --json PATH          write the whole report (JSON) there
  --allow-uncommitted  write even over files git does not hold as they are

REPO_CONTENT_ROOT=<dir> runs it on a copy of the repo instead.`;

export interface CliArgs {
  dryRun: boolean;
  sheet: string | null;
  report: string | null;
  json: string | null;
  allowUncommitted: boolean;
  help: boolean;
}

/** Reads the command line; throws with a message to print above the usage. */
export function parseCliArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    sheet: null,
    report: null,
    json: null,
    allowUncommitted: false,
    help: false,
  };
  const tokens = argv.flatMap((token) =>
    /^--[a-z-]+=/.test(token) ? token.split(/=(.*)/s, 2) : [token],
  );
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = () => {
      const value = tokens[(index += 1)];
      if (value === undefined || value.startsWith('--'))
        throw new Error(`${token} needs a value`);
      return value;
    };
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--allow-uncommitted') args.allowUncommitted = true;
    else if (token === '--sheet') args.sheet = next();
    else if (token === '--report') args.report = next();
    else if (token === '--json') args.json = next();
    else if (token === '--help' || token === '-h') args.help = true;
    else if (!token.startsWith('-') && args.sheet === null) args.sheet = token;
    else throw new Error(`unknown argument ${token}`);
  }
  return args;
}

/** One line per count, for the terminal. */
export function summaryLines(report: SheetImportReport): string[] {
  const { plan } = report;
  return [
    `${report.dryRun ? 'Dry run' : 'Import'} of ${report.workbook} over ${report.root}`,
    `Read ${report.read.rows.length} rows from ${report.read.tabs.length} tabs (${report.read.wrongTab.length} in the wrong tab, ${report.read.problems.length} problems)`,
    `Paired ${plan.pairing.pairs.length} (${plan.pairing.pairs.filter((p) => p.how === 'exact').length} exact, ${plan.pairing.pairs.filter((p) => p.how === 'corrected').length} corrected); ${plan.pairing.secondCopies.length} second copies skipped; ${plan.pairing.notInLibrary.length} not in the library; unpaired ids ${plan.pairing.unpaired.map((e) => e.id).join(', ') || 'none'}`,
    `Chords corrected on ids ${plan.chordFixes.map((f) => f.id).join(', ') || 'none'}; ${plan.sheetFixes.length} sheet rows corrected`,
    `Text filled: ${plan.textMerges.length}; written differently: ${plan.textDiffers.length}; song links: ${plan.songLinks.length} (held back ${plan.songLinksHeld.length}, likely ${plan.likelyLinks.length})`,
    `Reported only: vibes differ on ${plan.vibes.rows.length}/${plan.vibes.sheetHas}, styles on ${plan.styles.rows.length}/${plan.styles.sheetHas}, complexity on ${plan.complexity.length}; ${plan.duplicates.length} duplicate pairs`,
    `Entries changed: ${plan.changes.length}; a second run would change ${report.secondRun.changes}`,
    report.gate.ok
      ? 'Gate: passed'
      : `Gate: FAILED: ${report.gate.problems.join('; ')}`,
    `Data files hashed before and after: ${report.hashes.files}, moved ${report.hashes.moved.length}`,
    report.wrote
      ? 'Files written.'
      : report.dryRun
        ? 'Dry run: no data file written.'
        : 'Nothing to write.',
  ];
}

async function main(argv: readonly string[]): Promise<void> {
  let args: CliArgs;
  try {
    args = parseCliArgs(argv);
  } catch (error) {
    console.error(`${(error as Error).message}\n\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    console.log(USAGE);
    return;
  }
  const sheet = args.sheet ?? process.env.PROGRESSION_SHEET_XLSX ?? null;
  if (!sheet) {
    console.error(`name the workbook to read\n\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  const report = await runSheetImport({
    dryRun: args.dryRun,
    workbook: resolve(sheet),
    allowUncommitted: args.allowUncommitted,
    log: (line) => console.log(line),
  });
  for (const [path, text] of [
    [args.report, () => reportMarkdown(report)],
    [args.json, () => `${JSON.stringify(report, null, 1)}\n`],
  ] as const) {
    if (!path) continue;
    const target = resolve(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text());
    console.log(`Report: ${target}`);
  }
  for (const line of summaryLines(report)) console.log(line);
  if (!report.gate.ok) process.exitCode = 1;
}

/** Run as a script, not when a test imports it. */
const isMain =
  !!process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain)
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
