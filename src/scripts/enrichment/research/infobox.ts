/**
 * Reading a Wikipedia article's music infobox: pure functions over wikitext,
 * no network. `wikipedia.ts` fetches the articles; this turns their lead
 * section into the facts the Artists table holds.
 *
 * Wikitext is not a grammar anyone parses fully, so this reads only what an
 * infobox field needs: the template's top-level `|name = value` pairs (nested
 * templates and links kept whole), and in each value its list items and
 * wikilinks. References, comments and footnote templates are dropped first.
 */

/** A music infobox's own name, or one that embeds one (`module =`). */
const INFOBOX_START =
  /\{\{\s*infobox[ _](musical[ _]artist|band|musician|singer|rapper|person|artist|comedian|actor)\b/gi;

/** The template text from `{{` at `start` to its balanced `}}`. */
function balancedTemplate(text: string, start: number): string | null {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') {
      depth++;
      i++;
    } else if (text[i] === '}' && text[i + 1] === '}') {
      depth--;
      i++;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Splits on `sep` where no `{{ }}` or `[[ ]]` is open. */
export function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = [];
  let curly = 0;
  let square = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{') {
      curly++;
      i++;
    } else if (two === '}}') {
      curly = Math.max(0, curly - 1);
      i++;
    } else if (two === '[[') {
      square++;
      i++;
    } else if (two === ']]') {
      square = Math.max(0, square - 1);
      i++;
    } else if (curly === 0 && square === 0 && text.startsWith(sep, i)) {
      out.push(text.slice(from, i));
      from = i + sep.length;
      i += sep.length - 1;
    }
  }
  out.push(text.slice(from));
  return out;
}

/** References, comments and footnote templates out; whitespace folded. */
export function stripNoise(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(
      /\{\{\s*(efn|sfn|refn|r|citation needed|cn|better source needed|nbsp|snd|·|dot|when\??|clarify|dubious|failed verification|according to whom\??)\b[^{}]*\}\}/gi,
      (m) => (/^\{\{\s*(nbsp|snd)/i.test(m) ? ' ' : ''),
    );
}

/** The template's parameters, keys lower-cased with spaces as `_`. */
function paramsOf(template: string): Record<string, string> {
  const inner = template.slice(2, -2);
  const parts = splitTopLevel(inner, '|').slice(1);
  const out: Record<string, string> = {};
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim().toLowerCase().replace(/\s+/g, '_');
    const value = part.slice(eq + 1).trim();
    if (key && value && !(key in out)) out[key] = value;
  }
  return out;
}

export interface Infobox {
  /** 'musical artist', 'person', … as the article names it. */
  template: string;
  params: Record<string, string>;
}

/**
 * The article's music infobox: the first `Infobox musical artist` (or band,
 * musician, singer), or a person/actor infobox, with any infobox embedded in
 * one of its fields (`module = {{Infobox musical artist|embed=yes …}}`)
 * merged in where the outer one is silent.
 */
export function findInfobox(wikitext: string): Infobox | null {
  const text = stripNoise(wikitext);
  const found: Infobox[] = [];
  for (const match of text.matchAll(INFOBOX_START)) {
    const template = balancedTemplate(text, match.index!);
    if (!template) continue;
    found.push({
      template: match[1].toLowerCase().replace(/_/g, ' '),
      params: paramsOf(template),
    });
  }
  if (!found.length) return null;
  const musical = found.find((b) =>
    /musical artist|band|musician|singer|rapper/.test(b.template),
  );
  const outer = found[0];
  if (!musical || musical === outer) return outer;
  return {
    template: musical.template,
    params: { ...musical.params, ...outer.params, ...musical.params },
  };
}

export interface Link {
  /** The article linked to, as written: 'Bass guitar'. */
  target: string;
  /** What the reader sees: 'bass'. */
  label: string;
}

/** `[[A|B]]` → { target: 'A', label: 'B' }, files and categories left out. */
export function linksIn(text: string): Link[] {
  const out: Link[] = [];
  for (const m of text.matchAll(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g)) {
    const target = m[1].trim();
    if (/^(file|image|category|wikt|wiktionary):/i.test(target)) continue;
    out.push({
      target: target.replace(/#.*$/, '').replace(/_/g, ' '),
      label: (m[2] ?? m[1]).trim(),
    });
  }
  return out;
}

/** Wikitext to the words a reader sees. */
export function plain(text: string): string {
  return stripNoise(text)
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{\s*(?:nowrap|small|lang\|[^|}]+)\|([^{}]*)\}\}/gi, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LIST_TEMPLATE =
  /^\{\{\s*(flatlist|flat list|hlist|plainlist|plain list|ubl|unbulleted list|bulleted list|blist|nowrap|unbulleted_list|startflatlist|endflatlist)\s*\|?/i;

export interface ListItem {
  text: string;
  link: Link | null;
}

/**
 * A field's list: `{{hlist|a|b}}`, `{{flatlist|\n* a\n* b}}`, `a, b`,
 * `a<br>b` or `* a\n* b` — each item's words and its first link.
 */
export function listItems(value: string): ListItem[] {
  let text = stripNoise(value).trim();
  const pieces: string[] = [];
  const unwrap = (chunk: string) => {
    const t = chunk.trim();
    if (LIST_TEMPLATE.test(t) && t.endsWith('}}')) {
      const inner = t.slice(2, -2);
      const args = splitTopLevel(inner, '|').slice(1);
      // Named arguments (`class=`, `style=`) are formatting, not items.
      for (const arg of args) if (!/^\s*\w+\s*=/.test(arg)) unwrap(arg);
      return;
    }
    for (const line of t.split(/\n|<br\s*\/?>/i)) {
      const l = line.replace(/^\s*[*#]\s*/, '').trim();
      if (!l) continue;
      for (const part of splitTopLevel(l, ',')) {
        for (const p of splitTopLevel(part, ';')) {
          for (const q of splitTopLevel(p, ' / ')) pieces.push(q);
        }
      }
    }
  };
  text = text.replace(/\{\{\s*(startflatlist|endflatlist)\s*\}\}/gi, '');
  unwrap(text);
  return pieces
    .map((piece) => {
      const links = linksIn(piece);
      return { text: plain(piece), link: links[0] ?? null };
    })
    .filter((item) => item.text && !/^(and|or)$/i.test(item.text));
}

const pad = (n: number) => String(n).padStart(2, '0');

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** A real calendar day, or null. */
function isoDay(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > last) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * `birth_date` as precise as it is given: 'YYYY-MM-DD', 'YYYY-MM' or 'YYYY'.
 * Reads `{{birth date and age|1942|11|27}}` (any `df=`/`mf=` flags),
 * `{{birth year and age|1950}}`, `{{birth-date|…}}` and plain text such as
 * "May 5, 1988", "5 May 1988", "1988". A circa ("c. 1940") is refused.
 */
export function parseBirthDate(value: string): string | null {
  const text = stripNoise(value);
  if (/\b(c\.|circa|ca\.|approx)/i.test(plain(text))) return null;
  const tpl = text.match(
    /\{\{\s*(birth[ _-]?date(?:[ _]and[ _]age)?|bda|dob|birth[ _]year[ _]and[ _]age|birth[ _]year)\s*\|([^{}]*)\}\}/i,
  );
  if (tpl) {
    const positional = splitTopLevel(tpl[2], '|')
      .map((s) => s.trim())
      .filter((s) => s && !s.includes('='));
    // `{{birth-date|May 5, 1988}}` carries text.
    if (positional.length === 1 && !/^\d{4}$/.test(positional[0]))
      return parseBirthDate(positional[0]);
    const [y, m, d] = positional.map((s) => Number(s));
    if (!Number.isInteger(y) || y < 1000) return null;
    if (Number.isInteger(m) && Number.isInteger(d)) return isoDay(y, m, d);
    if (Number.isInteger(m) && m >= 1 && m <= 12) return `${y}-${pad(m)}`;
    return String(y);
  }
  const words = plain(text).toLowerCase();
  // "May 5, 1988" / "5 May 1988"
  const mdy = words.match(/\b([a-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (mdy && MONTHS.includes(mdy[1]))
    return isoDay(Number(mdy[3]), MONTHS.indexOf(mdy[1]) + 1, Number(mdy[2]));
  const dmy = words.match(/\b(\d{1,2})\s+([a-z]+),?\s+(\d{4})\b/);
  if (dmy && MONTHS.includes(dmy[2]))
    return isoDay(Number(dmy[3]), MONTHS.indexOf(dmy[2]) + 1, Number(dmy[1]));
  const my = words.match(/\b([a-z]+)\s+(\d{4})\b/);
  if (my && MONTHS.includes(my[1]))
    return `${my[2]}-${pad(MONTHS.indexOf(my[1]) + 1)}`;
  const iso = words.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return isoDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const year = words.match(/^(\d{4})$/);
  return year ? year[1] : null;
}

export interface YearsActive {
  /** Null when the field starts with a decade ("1950s–1980"): no year to give. */
  from: number | null;
  /** The last year, when the field ends in one; null when it says "present". */
  to: number | null;
}

/**
 * `years_active`: "1960–1970", "1963–present", "1963–1970, 2003–present",
 * "{{hlist|1960–1970|1993–1995}}". The first year starts it; it ends at the
 * last year unless any range runs to the present.
 */
export function parseYearsActive(value: string): YearsActive | null {
  // "1965–{{as of|2015|alt=present}}", "1990–{{present}}": still active.
  const marked = stripNoise(value).replace(
    /\{\{\s*(as of|present|now|current)\b[^{}]*\}\}/gi,
    ' present',
  );
  const joined = plain(
    listItems(marked)
      .map((i) => i.text)
      .join(', ') || marked,
  );
  // A range left open ("1965–") runs to the present.
  const text = /[–—-]\s*(,|$)/.test(joined) ? `${joined} present` : joined;
  if (
    /\b(c\.|circa|ca\.|fl\.)|\bc\s?\d/i.test(text) ||
    /\{\{\s*(circa|c\.)\b/i.test(value)
  )
    return null;
  const tokens = [...text.matchAll(/\b(1[0-9]\d\d|20\d\d)(s?)\b/g)].map(
    (m) => ({
      year: Number(m[1]),
      decade: m[2] === 's',
    }),
  );
  if (!tokens.length) return null;
  const ongoing = /present|current|today/i.test(text);
  const earliest = tokens.reduce((a, b) => (b.year < a.year ? b : a));
  const exact = tokens.filter((t) => !t.decade).map((t) => t.year);
  const last = exact.length ? Math.max(...exact) : null;
  const from = earliest.decade ? null : earliest.year;
  if (from === null && (ongoing || last === null)) return null;
  // A lone year ("1965") says when it started, not that it ended then.
  if (tokens.length === 1 && !ongoing) return { from, to: null };
  return { from, to: ongoing ? null : last };
}

export interface PlaceText {
  /** Each linked article in order: '[[Tottenham]], [[London]]' → both. */
  links: Link[];
  /** The comma-separated parts a reader sees: ['Tottenham', 'London', 'England']. */
  parts: string[];
}

/** `birth_place` / `origin` as links and parts. */
export function parsePlace(value: string): PlaceText | null {
  // Only the first place where the field lists several.
  let text = stripNoise(value).trim();
  if (LIST_TEMPLATE.test(text) && text.endsWith('}}')) {
    const args = splitTopLevel(text.slice(2, -2), '|')
      .slice(1)
      .filter((a) => a.trim() && !/^\s*\w+\s*=/.test(a));
    text = args[0] ?? '';
  }
  const first =
    text
      .split(/<br\s*\/?>|\n/i)
      .map((s) => s.replace(/^\s*[*#]\s*/, '').trim())
      .filter(Boolean)[0] ?? '';
  const words = plain(first);
  if (!words) return null;
  const parts = words
    .split(',')
    .map((s) => s.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean);
  return { links: linksIn(first), parts };
}

/** Whether the infobox's `background` (or its template) says a group. */
export function saysGroup(box: Infobox): boolean | null {
  // A birth date is a person's, whatever else the box says.
  if (box.params.birth_date || box.params.birth_name) return false;
  const background = (box.params.background ?? '').toLowerCase().trim();
  if (/^(group_or_band|classical_ensemble|cover_band)$/.test(background))
    return true;
  if (background) return false;
  if (box.template === 'band') return true;
  if (
    box.params.current_members ||
    box.params.past_members ||
    box.params.members
  )
    return true;
  return null;
}
