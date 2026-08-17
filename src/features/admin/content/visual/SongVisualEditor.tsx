/* eslint-disable react/jsx-sort-props */
import { Clock, Gauge, Signal } from 'lucide-react';
import { useMemo, type FC } from 'react';
import { GenreBadge } from '@/components/atlas/components/UI/GenreBadge';
import {
  getKeyColor,
  prettyGenre,
} from '@/components/common/CircleOfFifthsSvg';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import type {
  ArtistImageSource,
  AudioSource,
  Song,
  SongMode,
} from '@/curriculum/types/songLibrary';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import {
  DetailCell,
  InlineNumber,
  InlineSelect,
  InlineTagList,
  InlineText,
  InlineTextarea,
} from './Editable';
import { EditableChordChart } from './EditableChordChart';
import {
  YouTubeLinkField,
  youTubeWatchUrl,
  extractYouTubeId,
} from './YouTubeLinkField';

/**
 * The song page an admin edits by clicking the thing they want to change.
 *
 * Deliberately a re-creation of SongDetailPage's hero rather than a form: the
 * layout, the key-colour tint, the stat row and the chart all sit where the
 * student sees them, so what an author is looking at while they type is what
 * they are shipping. The one intentional difference is the video slot, which
 * holds a link input with the player previewing beneath it.
 */

const MODES: SongMode[] = [
  'major',
  'minor',
  'dorian',
  'mixolydian',
  'phrygian',
  'lydian',
  'locrian',
  'aeolian',
  'ionian',
];

const IMAGE_SOURCES: ArtistImageSource[] = [
  'spotify',
  'youtube',
  'commissioned',
  'wikipedia',
  'manual',
  'none',
];

const DIFFICULTIES = [
  { value: '1', label: '1 — Beginner' },
  { value: '2', label: '2 — Intermediate' },
  { value: '3', label: '3 — Advanced' },
];

export const SongVisualEditor: FC<{
  song: Song;
  onChange: (song: Song) => void;
}> = ({ song, onChange }) => {
  const patch = (next: Partial<Song>) => onChange({ ...song, ...next });

  const sections = song.sections ?? [];
  const audioSources = song.audioSources ?? [];
  const ytIndex = audioSources.findIndex((s) => s.provider === 'youtube');
  const ytSource = ytIndex >= 0 ? audioSources[ytIndex] : undefined;
  const otherSources = audioSources.filter((s) => s.provider !== 'youtube');

  const [kr, kg, kb] = getKeyColor({
    keyRoot: song.keyRoot ?? 60,
    mode: song.mode ?? 'major',
  });
  const [ts0, ts1] = song.timeSignature ?? [4, 4];

  const setYouTube = (raw: string) => {
    const videoId = extractYouTubeId(raw);
    // Clearing the field removes the source entirely — an empty uri would fail
    // the schema's min(1) on save, which is not what "no video" should mean.
    if (!videoId) {
      patch({ audioSources: otherSources });
      return;
    }
    const next: AudioSource = {
      provider: 'youtube',
      uri: youTubeWatchUrl(videoId),
      ...(ytSource?.startOffsetSec != null
        ? { startOffsetSec: ytSource.startOffsetSec }
        : {}),
    };
    patch({
      audioSources:
        ytIndex >= 0
          ? audioSources.map((source, i) => (i === ytIndex ? next : source))
          : [...audioSources, next],
    });
  };

  const setStartOffset = (value: number | undefined) => {
    if (ytIndex < 0) return;
    patch({
      audioSources: audioSources.map((source, i) =>
        i === ytIndex
          ? { ...source, startOffsetSec: value === 0 ? undefined : value }
          : source,
      ),
    });
  };

  return (
    <div className="flex flex-col" style={{ background: '#101012' }}>
      {/* ── Header: artwork-anchored hero ── */}
      <header className="relative overflow-hidden px-6 py-4 md:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(${kr},${kg},${kb},0.12) 0%, rgba(${kr},${kg},${kb},0) 70%)`,
          }}
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start">
          <SongArtwork song={song} />

          {/* Identity + metadata */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <h2
              className="text-white"
              style={{
                fontFamily:
                  "'Glacial Indifference', 'Fraunces', system-ui, sans-serif",
                fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
                fontWeight: 600,
                lineHeight: 1.1,
              }}
            >
              &ldquo;
              <InlineText
                value={song.title}
                onChange={(value) => patch({ title: value })}
                placeholder="Song title"
                ariaLabel="Song title"
              />
              &rdquo;
            </h2>

            <p className="text-sm text-white/55">
              <InlineText
                value={song.artist}
                onChange={(value) => patch({ artist: value })}
                placeholder="Artist"
                ariaLabel="Artist name"
              />
              <span className="text-white/35"> · </span>
              <InlineNumber
                value={song.year}
                onChange={(value) => patch({ year: value })}
                placeholder="year"
                ariaLabel="Release year"
                className="text-white/35"
              />
            </p>

            {/* Metadata stat row — mirrors the student's */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    background: `rgb(${kr},${kg},${kb})`,
                    boxShadow: `0 0 6px rgba(${kr},${kg},${kb},0.6)`,
                  }}
                />
                <span className="text-white/50">Key of</span>
                <InlineText
                  value={song.key}
                  onChange={(value) => patch({ key: value })}
                  placeholder="D minor"
                  ariaLabel="Key"
                  className="text-white/90"
                />
              </span>
              <StatDivider />
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <Gauge size={15} />
                <InlineNumber
                  value={song.tempo}
                  onChange={(value) => patch({ tempo: value ?? 100 })}
                  min={20}
                  max={300}
                  ariaLabel="Tempo in BPM"
                  className="text-white/90"
                />
                <span className="text-white/50">BPM</span>
              </span>
              <StatDivider />
              <span className="inline-flex items-center gap-1 text-white/50">
                <Clock size={15} />
                <InlineNumber
                  value={ts0}
                  onChange={(value) =>
                    patch({ timeSignature: [value ?? 4, ts1] })
                  }
                  min={1}
                  max={16}
                  ariaLabel="Time signature beats per bar"
                  className="text-white/90"
                />
                <span className="text-white/40">/</span>
                <InlineNumber
                  value={ts1}
                  onChange={(value) =>
                    patch({ timeSignature: [ts0, value ?? 4] })
                  }
                  min={1}
                  max={16}
                  ariaLabel="Time signature beat unit"
                  className="text-white/90"
                />
              </span>
              <StatDivider />
              <span className="inline-flex items-center gap-1.5 text-white/50">
                <Signal size={15} />
                <span className="text-white/50">Lvl.</span>
                <InlineSelect
                  value={String(song.difficulty ?? 1)}
                  onChange={(value) =>
                    patch({ difficulty: Number(value) as Song['difficulty'] })
                  }
                  options={DIFFICULTIES}
                  ariaLabel="Difficulty"
                  className="text-sm text-white/90"
                />
              </span>
            </div>

            {/* Genre badges — the student's chips, with add/remove */}
            <InlineTagList
              values={song.genreTags ?? []}
              onChange={(values) => patch({ genreTags: values })}
              renderTag={(genre) => <GenreBadge genre={prettyGenre(genre)} />}
              addLabel="Genre"
              ariaLabel="Genre tags"
              className="pt-1"
            />
          </div>

          {/* Video slot — link input with the player previewing underneath */}
          <div className="w-full shrink-0 lg:w-80">
            <YouTubeLinkField
              value={ytSource?.uri ?? ''}
              onChange={setYouTube}
              previewTitle={song.title || 'Song video'}
              trailing={
                ytSource ? (
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-white/30">
                    starts at
                    <InlineNumber
                      value={ytSource.startOffsetSec ?? 0}
                      onChange={setStartOffset}
                      min={0}
                      step={0.1}
                      ariaLabel="Seconds into the recording where bar 1 begins"
                      className="text-white/70"
                    />
                    s
                  </span>
                ) : null
              }
            />
          </div>
        </div>
      </header>

      {/* ── Secondary details — everything the hero doesn't show ── */}
      <div className="mx-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 md:mx-10 md:grid-cols-4">
        <DetailCell label="Id / slug">
          <InlineText
            value={song.id}
            onChange={(value) => patch({ id: value.trim() })}
            placeholder="song_slug"
            ariaLabel="Song id"
            className="font-mono text-xs"
          />
        </DetailCell>
        <DetailCell label="Mode">
          <InlineSelect
            value={song.mode ?? 'major'}
            onChange={(value) => patch({ mode: value as SongMode })}
            options={MODES}
            ariaLabel="Mode"
            className="text-sm"
          />
        </DetailCell>
        <DetailCell label="Key root (MIDI, 60 = C4)">
          <InlineNumber
            value={song.keyRoot}
            onChange={(value) => patch({ keyRoot: value ?? 60 })}
            min={0}
            max={127}
            ariaLabel="Key root MIDI note"
          />
        </DetailCell>
        <DetailCell label="Popularity (0–100)">
          <InlineNumber
            value={song.popularity}
            onChange={(value) => patch({ popularity: value })}
            min={0}
            max={100}
            ariaLabel="Popularity"
          />
        </DetailCell>
        <DetailCell label="Artist image source">
          <InlineSelect
            value={song.artistImageSource ?? 'none'}
            onChange={(value) =>
              patch({ artistImageSource: value as ArtistImageSource })
            }
            options={IMAGE_SOURCES}
            ariaLabel="Artist image source"
            className="text-sm"
          />
        </DetailCell>
        <DetailCell label="Artist image URL" className="md:col-span-3">
          <InlineText
            value={song.artistImageRef}
            onChange={(value) =>
              patch({ artistImageRef: value.trim() || undefined })
            }
            placeholder="https://…"
            ariaLabel="Artist image URL"
            className="text-xs"
          />
        </DetailCell>
        <DetailCell label="Techniques" className="col-span-2">
          <InlineTagList
            values={song.techniques ?? []}
            onChange={(values) => patch({ techniques: values })}
            addLabel="Technique"
            ariaLabel="Techniques"
          />
        </DetailCell>
        <DetailCell label="Other audio sources" className="col-span-2">
          {otherSources.length === 0 ? (
            <span className="text-xs text-white/25">
              None. Non-YouTube sources are edited in the JSON tab.
            </span>
          ) : (
            <span className="text-xs text-white/50">
              {otherSources.map((s) => s.provider).join(', ')}
            </span>
          )}
        </DetailCell>
        <DetailCell
          label="Historical description (used by the globe)"
          className="col-span-2 md:col-span-4"
        >
          <InlineTextarea
            value={song.historicalDescription}
            onChange={(value) =>
              patch({ historicalDescription: value.trim() || undefined })
            }
            placeholder="Two or three sentences on why this song mattered…"
            ariaLabel="Historical description"
            rows={3}
            className="text-sm leading-relaxed"
          />
        </DetailCell>
      </div>

      {/* ── Chord chart ── */}
      <div className="px-6 pb-6 pt-5 md:px-10">
        <EditableChordChart
          sections={sections}
          keyRoot={song.keyRoot ?? 60}
          mode={song.mode ?? 'major'}
          beatsPerBar={ts0 || 4}
          onChange={(next) => patch({ sections: next })}
        />
      </div>
    </div>
  );
};

const StatDivider: FC = () => (
  <span aria-hidden className="text-white/20">
    ·
  </span>
);

/** The hero's square artwork anchor, with the same hex-avatar fallback. */
const SongArtwork: FC<{ song: Song }> = ({ song }) => {
  const avatarConfig = useMemo(
    () => defaultAvatarConfig(song.genreTags?.[0] ?? song.artist ?? 'atlas'),
    [song.genreTags, song.artist],
  );

  const initials = useMemo(
    () =>
      (song.artist ?? '')
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [song.artist],
  );

  return (
    <div className="relative size-36 shrink-0 overflow-hidden rounded-2xl md:size-40">
      {song.artistImageRef ? (
        <img
          src={song.artistImageRef}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <>
          <HexAvatarSVG
            config={avatarConfig}
            circular={false}
            className="absolute left-0 top-0 size-[120%] opacity-60"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-white/20">
              {initials || '—'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
