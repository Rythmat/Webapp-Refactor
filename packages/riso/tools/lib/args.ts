/** Minimal --flag value / --flag=value parser. Transcribed from upstream tools/lib/browser.mjs. */

export interface Args {
  /** Positional arguments, in order. */
  _: string[];
  [flag: string]: string | boolean | string[] | undefined;
}

export function args(argv: string[]): Args {
  const out: Args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq > -1) out[a.slice(2, eq)] = a.slice(eq + 1);
    else if (argv[i + 1] && !argv[i + 1].startsWith('--'))
      out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return out;
}

/** A flag's value as a string, or undefined when absent or valueless. */
export const str = (a: Args, k: string): string | undefined =>
  typeof a[k] === 'string' ? (a[k] as string) : undefined;

/** Parse --range a:b:step or --times a,b,c into a time list. */
export function parseTimes(
  o: { range?: string; times?: string },
  duration: number,
): number[] {
  if (o.times)
    return o.times
      .split(',')
      .map(Number)
      .filter((n) => !Number.isNaN(n));
  if (o.range) {
    const [a, b, step = 0.25] = o.range.split(':').map(Number);
    const out: number[] = [];
    for (let t = a; t <= b + 1e-9; t += step) out.push(Number(t.toFixed(4)));
    return out;
  }
  const out: number[] = [];
  for (let t = 0; t < duration; t += 1) out.push(t);
  return out;
}
