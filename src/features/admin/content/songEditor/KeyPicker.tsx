import { getKeyColor } from '@/components/common/CircleOfFifthsSvg';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import {
  buildKeyString,
  keyRootForPitchClass,
  NOTE_NAMES,
  pitchClass,
  SONG_MODES,
} from './songDefaults';

/**
 * Inline "Key of {note} {mode}" editor — mirrors the published stat row's key
 * segment (colored dot + label), but the note and mode are dropdowns. Picking
 * either updates `keyRoot`, `mode`, and the derived `key` string together, so
 * the key-color dot (driven by `getKeyColor`) stays in sync.
 */
export const KeyPicker = ({
  song,
  onPatch,
}: {
  song: Song;
  onPatch: (patch: Partial<Song>) => void;
}) => {
  const [kr, kg, kb] = getKeyColor(song);

  const setNote = (pc: number) => {
    const keyRoot = keyRootForPitchClass(pc);
    onPatch({ keyRoot, key: buildKeyString(keyRoot, song.mode) });
  };
  const setMode = (mode: SongMode) => {
    onPatch({ mode, key: buildKeyString(song.keyRoot, mode) });
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{
          background: `rgb(${kr},${kg},${kb})`,
          boxShadow: `0 0 6px rgba(${kr},${kg},${kb},0.6)`,
        }}
      />
      <span className="text-white/90">Key of</span>
      <Select
        value={String(pitchClass(song.keyRoot))}
        onValueChange={(v) => setNote(Number(v))}
      >
        <SelectTrigger className="h-7 w-[70px] px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NOTE_NAMES.map((name, pc) => (
            <SelectItem key={pc} value={String(pc)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={song.mode} onValueChange={(v) => setMode(v as SongMode)}>
        <SelectTrigger className="h-7 w-[120px] px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SONG_MODES.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {mode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
};
