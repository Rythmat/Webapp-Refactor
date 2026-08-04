/**
 * SlideMediaEditor — the media column on the editable canvas. Shows the static
 * `SlideMediaPanel` preview (never the live iframe) with Change / Remove
 * controls, or a dashed "Add media" placeholder that opens a small source
 * picker: a YouTube id field or the reused song picker (→ artistImage).
 */
import { ImagePlus, Music, X, Youtube } from 'lucide-react';
import { useState } from 'react';
import { SlideMediaPanel } from '../../slides/parts/SlideMediaPanel';
import type { SlideMedia } from '../../slides/types';
import { SongPickerDialog } from '../../slides/wizard/SongPickerDialog';
import type { StudentLanguage } from '../../types';

interface SlideMediaEditorProps {
  media: SlideMedia | undefined;
  language: StudentLanguage;
  onChange: (media: SlideMedia | undefined) => void;
}

export const SlideMediaEditor = ({
  media,
  language,
  onChange,
}: SlideMediaEditorProps) => {
  const [picking, setPicking] = useState(false);
  const [songOpen, setSongOpen] = useState(false);
  const [ytValue, setYtValue] = useState('');

  if (media && !picking) {
    return (
      <div className="w-full">
        <div className="group relative">
          <SlideMediaPanel
            media={media}
            language={language}
            interactive={false}
          />
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur hover:bg-black/80"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              aria-label="Remove media"
              className="rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <Youtube className="h-4 w-4 shrink-0 text-white/40" />
          <input
            value={ytValue}
            onChange={(e) => setYtValue(e.target.value)}
            placeholder="YouTube video id"
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
          />
          <button
            type="button"
            disabled={!ytValue.trim()}
            onClick={() => {
              onChange({ type: 'youtube', videoId: ytValue.trim() });
              setYtValue('');
              setPicking(false);
            }}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/85 disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSongOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/25 hover:text-white"
          >
            <Music className="h-3.5 w-3.5" />
            Pick a song
          </button>
          {!media && (
            <span className="inline-flex items-center gap-1 text-xs text-white/30">
              <ImagePlus className="h-3.5 w-3.5" />
              or a video above
            </span>
          )}
          {picking && media && (
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="ml-auto text-xs text-white/50 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <SongPickerDialog
        open={songOpen}
        onOpenChange={setSongOpen}
        onSelect={(song) => {
          onChange({ type: 'artistImage', songId: song.id });
          setSongOpen(false);
          setPicking(false);
        }}
      />
    </div>
  );
};
