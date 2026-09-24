// Compact view of the songs that still carry machine labels.
import { readdirSync } from 'node:fs';
import type { Song } from '@/curriculum/types/songLibrary';
import { isSectionLabel } from '@/curriculum/songLibrary/sectionNames';
const [from, count] = [Number(process.argv[2] ?? 0), Number(process.argv[3] ?? 10)];
async function main() {
  const dir = 'src/curriculum/data/songs';
  const todo: Song[] = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.ts') && !['index.ts','bundled.ts'].includes(f))) {
    const mod = await import(`@/curriculum/data/songs/${f.replace('.ts','')}`);
    const song = Object.values(mod).find((v: any) => v && v.sections && 'keyRoot' in v) as Song;
    if (song && !song.sections.every(s => isSectionLabel(s.label))) todo.push(song);
  }
  todo.sort((a, b) => a.id.localeCompare(b.id));
  console.log(`# ${todo.length} songs still unnamed; showing ${from}..${from + count - 1}`);
  for (const song of todo.slice(from, from + count)) {
    console.log(`\n## ${song.id} — "${song.title}" · ${song.artist} · ${song.year ?? '?'} · ${song.key}`);
    const prints = new Map<string, string>();
    song.sections.forEach((s, i) => {
      const chords = s.bars.map(b => b.restBars ? `[${b.restBars}br]` : b.chords.map(c => c.chordName).join(' ') || '%').join(' | ');
      if (!prints.has(chords)) prints.set(chords, String.fromCharCode(97 + prints.size));
      console.log(`${String(i).padStart(2)} ${prints.get(chords)} ${String(s.bars.length).padStart(2)}b  ${chords.slice(0, 150)}`);
    });
  }
}
main();
