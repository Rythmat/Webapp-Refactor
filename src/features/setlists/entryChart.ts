import { getSong } from '@/curriculum/data/songs';
import { transposeSong } from '@/curriculum/songLibrary/transpose';
import type { Song } from '@/curriculum/types/songLibrary';
import type { SetListEntry, StoredChart } from './types';

/**
 * The chart an entry puts in front of the player, in this set's key.
 *
 * A set holds two kinds of chart and the stand should not care which: a
 * library song, referenced by id so corrections reach it, and a page printed
 * from a Studio project, which the entry carries itself. Both arrive here as a
 * `Song`, so the viewer and the print sheet render one thing.
 */

export interface EntryChart {
  /** Ready for ChordChart: transposed into the key this set plays it in. */
  song: Song | null;
  title: string;
  artist?: string;
  /** The chart's own key, when this set plays it in another one. The
   *  recording is in this key, not the one on the stand. */
  recordedKey?: string;
  /** Set when there is no chart to draw, and why. */
  missing?: string;
}

/** The fields a chart needs to be a Song, for one that was never in the
 *  library. None of them are shown on the chart itself. */
const songFromChart = (id: string, chart: StoredChart): Song => ({
  id,
  title: chart.title,
  artist: chart.artist ?? '',
  key: chart.key,
  keyRoot: chart.keyRoot,
  mode: chart.mode,
  tempo: chart.tempo,
  timeSignature: chart.timeSignature,
  difficulty: 1,
  genreTags: [],
  techniques: [],
  sections: chart.sections,
  audioSources: [],
  artistImageSource: 'none',
});

/** Null for a text page, which is not a chart at all. */
export function entryChart(entry: SetListEntry): EntryChart | null {
  if (entry.kind === 'text') return null;

  if (entry.kind === 'project') {
    const song = songFromChart(`setlist_${entry.id}`, entry.chart);
    return {
      song: transposeSong(song, entry.semitones),
      title: entry.title,
      ...(entry.chart.artist ? { artist: entry.chart.artist } : {}),
      ...(entry.semitones ? { recordedKey: song.key } : {}),
    };
  }

  const song = getSong(entry.songId);
  if (!song)
    return {
      song: null,
      title: entry.title ?? entry.songId,
      missing: `This song is not in the library any more (${entry.songId}).`,
    };
  return {
    song: transposeSong(song, entry.semitones),
    title: entry.title ?? song.title,
    artist: song.artist,
    ...(entry.semitones ? { recordedKey: song.key } : {}),
  };
}
