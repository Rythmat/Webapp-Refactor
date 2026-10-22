import fs from 'node:fs/promises';
import path from 'node:path';
import { format } from 'prettier';
import ts from 'typescript';
import { repoPrettierOptions } from '../repoContent/tsWrite';

/**
 * Writing a lesson level's fingers back into the lesson files, and nothing
 * else.
 *
 * The console's lessons live in hand-written TypeScript
 * (src/curriculum/data/activityFlows/*_v2.ts), each level's steps in section
 * literals. Repo mode doesn't serve lessons (a lesson is edited through the
 * API), but the fingers an admin settles in the back office belong in these
 * files, where Learn reads them. So on a save the dev server hands the level
 * here: each step is found by its module, section, number and title; each of
 * its notes is checked against the file's (same pitch, same onset); and only
 * then is that note's `finger` set, changed or taken out — every other byte
 * of the file as it was. A step that can't be matched is left alone and
 * reported.
 */

export interface LessonNote {
  midi: number;
  onset: number;
  finger?: number;
}

export interface LessonStep {
  module?: string;
  section: string;
  stepNumber: number;
  activity: string;
  targetNotes?: LessonNote[];
}

export interface LessonBody {
  id?: string;
  sections?: { steps?: LessonStep[] }[];
}

export interface FingerWriteReport {
  /** Repo-relative files changed. */
  files: string[];
  /** Notes whose finger was set, changed or taken out. */
  changed: number;
  /** Steps left alone, and why. */
  skipped: string[];
}

export const LESSON_DIR = 'src/curriculum/data/activityFlows';

const stepKey = (s: {
  module?: string;
  section: string;
  stepNumber: number;
  activity: string;
}) => [s.module ?? '', s.section, s.stepNumber, s.activity].join('|');

const isFinger = (n: unknown): n is 1 | 2 | 3 | 4 | 5 =>
  n === 1 || n === 2 || n === 3 || n === 4 || n === 5;

/** A literal's value: a string, a number, or undefined for anything else. */
function literal(node: ts.Expression | undefined): string | number | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  )
    return -Number(node.operand.text);
  return undefined;
}

const propsOf = (node: ts.ObjectLiteralExpression, sf: ts.SourceFile) =>
  new Map(
    node.properties
      .filter(ts.isPropertyAssignment)
      .map((p) => [p.name.getText(sf), p] as const),
  );

/** Every step literal in a file, by its key. */
export function stepLiterals(source: string, fileName: string) {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const found = new Map<string, ts.ObjectLiteralExpression[]>();
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const p = propsOf(node, sf);
      const section = literal(p.get('section')?.initializer);
      const stepNumber = literal(p.get('stepNumber')?.initializer);
      const activity = literal(p.get('activity')?.initializer);
      if (
        typeof section === 'string' &&
        typeof stepNumber === 'number' &&
        typeof activity === 'string'
      ) {
        const module = literal(p.get('module')?.initializer);
        const key = stepKey({
          module: typeof module === 'string' ? module : undefined,
          section,
          stepNumber,
          activity,
        });
        found.set(key, [...(found.get(key) ?? []), node]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { sf, found };
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

/**
 * The fingers of these steps written into one file's source. Pure: the
 * source in, the new source out, with what changed and what couldn't be.
 */
export function planFingerEdits(
  source: string,
  fileName: string,
  steps: readonly LessonStep[],
): { text: string; changed: number; matched: Set<string>; skipped: string[] } {
  const { sf, found } = stepLiterals(source, fileName);
  const edits: Edit[] = [];
  const matched = new Set<string>();
  const skipped: string[] = [];
  for (const step of steps) {
    const key = stepKey(step);
    const literals = found.get(key);
    if (!literals) continue;
    matched.add(key);
    if (literals.length > 1) {
      skipped.push(`${step.activity}: in ${fileName} more than once`);
      continue;
    }
    const notesProp = propsOf(literals[0], sf).get('targetNotes');
    const notes = step.targetNotes ?? [];
    if (!notesProp || !ts.isArrayLiteralExpression(notesProp.initializer)) {
      if (notes.some((n) => n.finger))
        skipped.push(
          `${step.activity}: its notes aren't written out in ${fileName}`,
        );
      continue;
    }
    const elements = notesProp.initializer.elements;
    const same =
      elements.length === notes.length &&
      elements.every((el, i) => {
        if (!ts.isObjectLiteralExpression(el)) return false;
        const p = propsOf(el, sf);
        return (
          literal(p.get('midi')?.initializer) === notes[i].midi &&
          literal(p.get('onset')?.initializer) === notes[i].onset
        );
      });
    if (!same) {
      skipped.push(`${step.activity}: its notes differ from ${fileName}`);
      continue;
    }
    elements.forEach((el, i) => {
      const obj = el as ts.ObjectLiteralExpression;
      const props = obj.properties;
      const fingerProp = props.find(
        (p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p) && p.name.getText(sf) === 'finger',
      );
      const has = literal(fingerProp?.initializer);
      const want = isFinger(notes[i].finger) ? notes[i].finger : undefined;
      if (has === want) return;
      if (want !== undefined && fingerProp) {
        const init = fingerProp.initializer;
        edits.push({
          start: init.getStart(sf),
          end: init.end,
          text: String(want),
        });
      } else if (want !== undefined) {
        const last = props[props.length - 1];
        if (last)
          edits.push({
            start: last.end,
            end: last.end,
            text: `, finger: ${want}`,
          });
        else
          edits.push({
            start: obj.getStart(sf) + 1,
            end: obj.getStart(sf) + 1,
            text: ` finger: ${want} `,
          });
      } else if (fingerProp) {
        const k = props.indexOf(fingerProp);
        edits.push(
          k > 0
            ? { start: props[k - 1].end, end: fingerProp.end, text: '' }
            : {
                start: fingerProp.getStart(sf),
                end: props[1] ? props[1].getStart(sf) : fingerProp.end,
                text: '',
              },
        );
      }
    });
  }
  let text = source;
  for (const e of [...edits].sort((a, b) => b.start - a.start))
    text = text.slice(0, e.start) + e.text + text.slice(e.end);
  return { text, changed: edits.length, matched, skipped };
}

/** Write a lesson level's fingers into the lesson files under `root`. */
export async function writeLessonFingers(
  root: string,
  body: LessonBody,
): Promise<FingerWriteReport> {
  const steps = (body.sections ?? []).flatMap((s) => s.steps ?? []);
  const dir = path.join(root, LESSON_DIR);
  const names = (await fs.readdir(dir))
    .filter((n) => n.endsWith('_v2.ts'))
    .sort();
  const report: FingerWriteReport = { files: [], changed: 0, skipped: [] };
  const seen = new Map<string, number>();
  const plans: { file: string; source: string; text: string }[] = [];
  for (const name of names) {
    const file = path.join(dir, name);
    const source = await fs.readFile(file, 'utf8');
    const plan = planFingerEdits(source, name, steps);
    for (const key of plan.matched) seen.set(key, (seen.get(key) ?? 0) + 1);
    report.skipped.push(...plan.skipped);
    if (plan.changed) {
      plans.push({ file, source, text: plan.text });
      report.changed += plan.changed;
    }
  }
  for (const step of steps) {
    const count = seen.get(stepKey(step)) ?? 0;
    if (count === 0 && step.targetNotes?.some((n) => n.finger))
      report.skipped.push(`${step.activity}: not found in the lesson files`);
  }
  // A step in two files can't be told apart: write neither.
  if ([...seen.values()].some((c) => c > 1))
    throw new Error('A step of this level is in more than one lesson file.');

  const options = { ...(await repoPrettierOptions()), parser: 'typescript' };
  for (const { file, source, text } of plans) {
    // Laid out as the repo lays it out — unless the file wasn't already, in
    // which case only the fingers move.
    const tidy = (await format(source, options)) === source;
    const out = tidy ? await format(text, options) : text;
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, out);
    await fs.rename(tmp, file);
    report.files.push(path.relative(root, file));
  }
  return report;
}
