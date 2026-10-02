import { inflateRawSync } from 'node:zlib';

/**
 * Reads the cell text of an Excel workbook (.xlsx), with nothing but Node.
 *
 * The progression sheet import (`importProgressionSheet.ts`) reads the
 * owner's Google Sheet as Google exports it, once, and the repo has no
 * spreadsheet library; a workbook is a zip of XML parts, so this reads
 * just enough of both. It knows:
 *  - the zip's central directory, with entries stored or deflated (the two
 *    methods every spreadsheet program writes);
 *  - the workbook's sheet list, in tab order, and where each sheet's part
 *    is (`xl/workbook.xml` and its relationships);
 *  - the shared strings, rich text runs joined;
 *  - each cell as text: shared and inline strings, formula results and
 *    numbers as written, booleans as `TRUE` or `FALSE`.
 *
 * Styles, formulas, dates and merged cells are not read: the import needs
 * the text. Node only.
 */

/** One tab: its name as the tab shows it, and its non-empty cells by row. */
export interface XlsxSheet {
  name: string;
  /** Row number (1-based, as the sheet shows it) to column letter to text. */
  rows: Map<number, Map<string, string>>;
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

/** The zip's entries by name, read from its central directory. */
function zipEntries(bytes: Buffer): Map<string, ZipEntry> {
  // The end record sits in the last 22 bytes, or before a trailing comment
  // of up to 64 KiB.
  let end = -1;
  for (
    let at = bytes.length - 22;
    at >= Math.max(0, bytes.length - 22 - 0xffff);
    at -= 1
  ) {
    if (bytes.readUInt32LE(at) === EOCD_SIGNATURE) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new Error('not a zip file (no end of central directory)');
  const count = bytes.readUInt16LE(end + 10);
  let at = bytes.readUInt32LE(end + 16);
  const entries = new Map<string, ZipEntry>();
  for (let index = 0; index < count; index += 1) {
    if (bytes.readUInt32LE(at) !== CENTRAL_SIGNATURE)
      throw new Error('the zip central directory is damaged');
    const method = bytes.readUInt16LE(at + 10);
    const compressedSize = bytes.readUInt32LE(at + 20);
    const nameLength = bytes.readUInt16LE(at + 28);
    const extraLength = bytes.readUInt16LE(at + 30);
    const commentLength = bytes.readUInt16LE(at + 32);
    const localOffset = bytes.readUInt32LE(at + 42);
    const name = bytes.toString('utf8', at + 46, at + 46 + nameLength);
    entries.set(name, { method, compressedSize, localOffset });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** One entry's bytes, inflated. */
function zipRead(bytes: Buffer, entry: ZipEntry, name: string): Buffer {
  const at = entry.localOffset;
  if (bytes.readUInt32LE(at) !== LOCAL_SIGNATURE)
    throw new Error(`the zip entry ${name} is damaged`);
  const start =
    at + 30 + bytes.readUInt16LE(at + 26) + bytes.readUInt16LE(at + 28);
  const data = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return Buffer.from(data);
  if (entry.method === 8) return inflateRawSync(data);
  throw new Error(
    `the zip entry ${name} uses compression method ${entry.method}, which this reader does not know`,
  );
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/** XML text with its entities and character references read. */
export function xmlText(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    const ref = String(name);
    if (ref[0] === '#') {
      const code =
        ref[1] === 'x' || ref[1] === 'X'
          ? parseInt(ref.slice(2), 16)
          : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[ref] ?? whole;
  });
}

/** An element's attributes, by name (prefixes kept: `r:id`). */
function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g))
    out[match[1]] = xmlText(match[2]);
  return out;
}

/** The text of every `<t>` in a fragment, joined; phonetic runs left out. */
function runsText(fragment: string): string {
  const bare = fragment.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let out = '';
  for (const match of bare.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g))
    out += xmlText(match[1] ?? '');
  return out;
}

/** `B12` → `B`. */
const columnOf = (ref: string) => /^[A-Z]+/.exec(ref)?.[0] ?? '';

/** Every cell of one sheet's XML, as text. */
function sheetRows(
  xml: string,
  shared: readonly string[],
): Map<number, Map<string, string>> {
  const rows = new Map<number, Map<string, string>>();
  let nextRow = 1;
  for (const rowMatch of xml.matchAll(
    /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g,
  )) {
    const rowAttrs = attributes(rowMatch[1]);
    const number = rowAttrs.r ? Number(rowAttrs.r) : nextRow;
    nextRow = number + 1;
    const cells = new Map<string, string>();
    for (const cell of (rowMatch[2] ?? '').matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const attrs = attributes(cell[1]);
      const body = cell[2] ?? '';
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let text: string;
      switch (attrs.t) {
        case 's':
          text = raw === undefined ? '' : (shared[Number(raw)] ?? '');
          break;
        case 'inlineStr':
          text = runsText(/<is>([\s\S]*?)<\/is>/.exec(body)?.[1] ?? '');
          break;
        case 'b':
          text = raw === undefined ? '' : raw === '1' ? 'TRUE' : 'FALSE';
          break;
        default:
          text = raw === undefined ? '' : xmlText(raw);
      }
      if (text === '' || !attrs.r) continue;
      cells.set(columnOf(attrs.r), text);
    }
    if (cells.size) rows.set(number, cells);
  }
  return rows;
}

/** Joins a part's relative target onto the folder its relationships sit beside. */
function resolveTarget(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').filter(Boolean);
  for (const step of target.split('/')) {
    if (step === '..') parts.pop();
    else if (step && step !== '.') parts.push(step);
  }
  return parts.join('/');
}

/** Every tab of a workbook, in tab order, as text. Throws on a file that is not one. */
export function readXlsx(bytes: Uint8Array): XlsxSheet[] {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = zipEntries(buffer);
  const part = (name: string): string | null => {
    const entry = entries.get(name);
    return entry ? zipRead(buffer, entry, name).toString('utf8') : null;
  };
  const workbook = part('xl/workbook.xml');
  if (workbook === null)
    throw new Error('not an Excel workbook (it has no xl/workbook.xml)');
  const rels = part('xl/_rels/workbook.xml.rels') ?? '';
  const targets = new Map<string, string>();
  for (const match of rels.matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const attrs = attributes(match[1]);
    if (attrs.Id && attrs.Target)
      targets.set(attrs.Id, resolveTarget('xl', attrs.Target));
  }
  const sharedXml = part('xl/sharedStrings.xml') ?? '';
  const shared = [
    ...sharedXml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g),
  ].map((match) => runsText(match[1] ?? ''));

  const sheets: XlsxSheet[] = [];
  for (const match of workbook.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const attrs = attributes(match[1]);
    const path = targets.get(attrs['r:id'] ?? '');
    if (!attrs.name || !path) continue;
    const xml = part(path);
    if (xml === null)
      throw new Error(`the workbook names ${path}, which it does not hold`);
    sheets.push({ name: attrs.name, rows: sheetRows(xml, shared) });
  }
  return sheets;
}
