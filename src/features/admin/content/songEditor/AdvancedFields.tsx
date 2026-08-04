import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AudioSource, Song } from '@/curriculum/types/songLibrary';

/**
 * A collapsed disclosure for schema fields that aren't on the published page
 * (so the editor still reads as the song page). Structured fields `origin` and
 * `contentRefs` are intentionally not edited here — they keep their existing
 * values rather than reintroducing a JSON pane.
 */
const csvToArray = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const AdvancedFields = ({
  song,
  onPatch,
}: {
  song: Song;
  onPatch: (patch: Partial<Song>) => void;
}) => {
  const [open, setOpen] = useState(false);

  const ytIndex = song.audioSources.findIndex((s) => s.provider === 'youtube');
  const startOffset =
    ytIndex >= 0 ? song.audioSources[ytIndex].startOffsetSec : undefined;
  const setStartOffset = (secs: number | undefined) => {
    if (ytIndex < 0) return;
    const next: AudioSource[] = song.audioSources.map((s, i) =>
      i === ytIndex ? { ...s, startOffsetSec: secs } : s,
    );
    onPatch({ audioSources: next });
  };

  return (
    <div className="border-t border-white/[0.06] pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white"
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        Advanced fields (optional)
      </button>

      {open && (
        <div className="mt-3 grid max-w-3xl gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              ID / slug
            </Label>
            <Input
              value={song.id}
              placeholder="auto-generated from title if blank"
              onChange={(e) => onPatch({ id: e.target.value.trim() })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Popularity (0–100)
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={song.popularity ?? ''}
              onChange={(e) =>
                onPatch({
                  popularity:
                    e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="md:col-span-2">
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Techniques (comma-separated)
            </Label>
            <Input
              value={song.techniques.join(', ')}
              onChange={(e) =>
                onPatch({ techniques: csvToArray(e.target.value) })
              }
            />
          </div>
          {ytIndex >= 0 && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Video start offset (sec)
              </Label>
              <Input
                type="number"
                min={0}
                value={startOffset ?? ''}
                onChange={(e) =>
                  setStartOffset(
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
              />
            </div>
          )}
          <div className="md:col-span-2">
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Historical description (used for the Globe event card)
            </Label>
            <Textarea
              rows={3}
              value={song.historicalDescription ?? ''}
              onChange={(e) =>
                onPatch({ historicalDescription: e.target.value || undefined })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
