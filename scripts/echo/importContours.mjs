#!/usr/bin/env node
/**
 * Imports the owner's Melody Contour Library (0-based) into Echo's data:
 *
 *   node scripts/echo/importContours.mjs "<path to Melody_Contour_Library_0based.csv>"
 *   npx prettier --write src/curriculum/data/echo/contourLibrary.json
 *
 * The CSV is the CMS export, with the columns
 * `note_count,contour,shape,tier,musical_tag` and a contour written as its
 * values in quotes ("0,-1,2"). It writes every row to
 * src/curriculum/data/echo/contourLibrary.json, in the CSV's order.
 *
 * A contour's id is its values as the CSV writes them ("0,-1,2"), so it
 * stays the same whatever order a later export lists the rows in, and the
 * curated set (echoContours.json) keeps pointing at the same contours. An
 * export with an `id` column keeps its own ids instead. A row that doesn't
 * read (a note count that isn't its length, a tier outside 1–4, an unknown
 * tag, a repeated id) stops the import, and nothing is written.
 *
 * Plain .mjs with node: imports only, like the other scripts here.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'src/curriculum/data/echo/contourLibrary.json');

const TAGS = ['common', 'uncommon', 'rare'];

/** One CSV line as its fields: commas inside double quotes stay put. */
function fields(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(field);
      field = '';
    } else field += c;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error(
      'Usage: node scripts/echo/importContours.mjs <Melody_Contour_Library_0based.csv>',
    );
    process.exit(1);
  }
  const lines = readFileSync(path, 'utf8')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  const header = fields(lines[0]).map((h) => h.toLowerCase());
  const column = (name) => {
    const at = header.indexOf(name);
    if (at < 0 && name !== 'id') {
      throw new Error(`The CSV has no "${name}" column (has: ${header})`);
    }
    return at;
  };
  const at = {
    id: column('id'),
    noteCount: column('note_count'),
    contour: column('contour'),
    shape: column('shape'),
    tier: column('tier'),
    tag: column('musical_tag'),
  };

  const problems = [];
  const seen = new Set();
  const contours = lines.slice(1).map((line, i) => {
    const row = fields(line);
    const where = `row ${i + 2}`;
    const values = row[at.contour].split(',').map((v) => Number(v.trim()));
    const noteCount = Number(row[at.noteCount]);
    const tier = Number(row[at.tier]);
    const tag = row[at.tag].toLowerCase();
    const id = at.id >= 0 && row[at.id] ? row[at.id] : values.join(',');
    if (values.some((v) => !Number.isInteger(v))) {
      problems.push(`${where}: contour "${row[at.contour]}" isn't integers`);
    }
    if (noteCount !== values.length) {
      problems.push(
        `${where}: note_count ${noteCount} but ${values.length} values`,
      );
    }
    if (![1, 2, 3, 4].includes(tier)) {
      problems.push(`${where}: tier "${row[at.tier]}"`);
    }
    if (!TAGS.includes(tag)) problems.push(`${where}: tag "${row[at.tag]}"`);
    if (seen.has(id)) problems.push(`${where}: id "${id}" repeated`);
    seen.add(id);
    return { id, noteCount, contour: values, shape: row[at.shape], tier, tag };
  });
  if (problems.length) {
    console.error(`Not imported:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  const library = {
    about:
      'The Melody Contour Library, 0-based, as the owner keeps it. Written by scripts/echo/importContours.mjs: re-import the CMS export rather than editing it here. A contour id is its values.',
    source: basename(path),
    contours,
  };
  writeFileSync(OUT, `${JSON.stringify(library, null, 2)}\n`);
  console.log(
    `Wrote ${contours.length} contours to ${OUT}.\nNow: npx prettier --write ${OUT}`,
  );
}

main();
