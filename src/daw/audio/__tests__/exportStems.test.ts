import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crc32, type ZipEntry } from '@/lib/studio-assets/zip-store';
import {
  exportProjectAudio,
  exportStems,
  stemTracks,
  type StemProgress,
} from '../exportAudio';
import type { RenderOptions } from '../renderProject';

// ── Stems and one-track exports (milestone 2.15) ───────────────────────────
// A stems export renders each track that plays in the mix alone, in track
// order, and zips the files under numbered, slugged names; Stop ends it
// between tracks. A one-track export is named after the song and the track.

const render = vi.hoisted(() => ({
  calls: [] as RenderOptions[],
  // Runs as each render starts: a collaborator's edit meanwhile.
  meanwhile: null as ((opts: RenderOptions) => void) | null,
}));
vi.mock('../renderProject', () => ({
  renderProject: async (opts: RenderOptions) => {
    render.calls.push(opts);
    render.meanwhile?.(opts);
    return { renderedTrack: opts.onlyTrackId ?? 'mix' };
  },
}));

// Each "file" is the id of the track it was rendered from.
const encodeAs = (buffer: unknown) =>
  new TextEncoder().encode((buffer as { renderedTrack: string }).renderedTrack)
    .buffer;
vi.mock('@/lib/studio-assets/encode-wav', () => ({
  audioBufferToWav: (buffer: unknown) => encodeAs(buffer),
}));
vi.mock('@/lib/studio-assets/encode-opus', () => ({
  audioBufferToOpusWebm: async (buffer: unknown) => encodeAs(buffer),
}));

// The entries the zip took as they came, and whether it was finished.
const zip = vi.hoisted(() => ({ entries: [] as ZipEntry[], finished: 0 }));
vi.mock('@/lib/studio-assets/zip-store', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/studio-assets/zip-store')>();
  class RecordingWriter extends actual.ZipWriter {
    add(entry: ZipEntry) {
      super.add(entry);
      zip.entries.push(entry);
    }
    finish() {
      zip.finished++;
      return super.finish();
    }
  }
  return { ...actual, ZipWriter: RecordingWriter };
});

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('@/daw/store', () => ({
  useStore: { getState: () => store.state },
}));

const note = {
  note: 60,
  velocity: 100,
  startTick: 0,
  durationTicks: 480,
  channel: 0,
};

function track(
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    name,
    mute: false,
    solo: false,
    midiClips: [{ id: `${id}-clip`, startTick: 0, events: [note] }],
    audioClips: [],
    ...extra,
  };
}

const bytes = (text: string) => new TextEncoder().encode(text);

beforeEach(() => {
  render.calls.length = 0;
  render.meanwhile = null;
  zip.entries = [];
  zip.finished = 0;
  store.state = {
    projectName: 'Late Night Song',
    tracks: [
      track('t1', 'Bass'),
      track('t2', 'Lead Vox'),
      track('t3', 'Bass'),
      track('t4', 'Bass 2'),
    ],
  };
});

describe('stemTracks', () => {
  it('keeps the tracks that play and hold something, in order', () => {
    store.state.tracks = [
      track('muted', 'Muted', { mute: true }),
      track('empty', 'Empty', { midiClips: [] }),
      track('no-notes', 'No notes', {
        midiClips: [{ id: 'c', startTick: 0, events: [] }],
      }),
      track('muted-clip', 'Muted clip', {
        midiClips: [{ id: 'c', startTick: 0, events: [note], muted: true }],
      }),
      track('audio', 'Audio', {
        midiClips: [],
        audioClips: [{ id: 'take', startTick: 0 }],
      }),
      track('muted-take', 'Muted take', {
        midiClips: [],
        audioClips: [{ id: 'take', startTick: 0, muted: true }],
      }),
      track('keys', 'Keys'),
    ];
    expect(stemTracks().map((t) => t.id)).toEqual(['audio', 'keys']);
  });

  it('follows the solo, as Play does', () => {
    store.state.tracks = [
      track('a', 'A'),
      track('b', 'B', { solo: true }),
      track('c', 'C'),
    ];
    expect(stemTracks().map((t) => t.id)).toEqual(['b']);
  });
});

describe('exportStems', () => {
  it('renders each stem alone, in order, and zips them', async () => {
    const result = await exportStems({
      format: 'wav',
      range: 'project',
      mastering: false,
    });
    expect(render.calls).toEqual([
      { range: 'project', onlyTrackId: 't1', mastering: false },
      { range: 'project', onlyTrackId: 't2', mastering: false },
      { range: 'project', onlyTrackId: 't3', mastering: false },
      { range: 'project', onlyTrackId: 't4', mastering: false },
    ]);
    expect(result.count).toBe(4);
    expect(result.filename).toBe('late-night-song-stems.zip');
    expect(result.blob.type).toBe('application/zip');
    // A repeated name gets '-2', and the next free number after that.
    expect(zip.entries.map((e) => e.name)).toEqual([
      '01-bass.wav',
      '02-lead-vox.wav',
      '03-bass-2.wav',
      '04-bass-2-2.wav',
    ]);
    expect(result.skipped).toEqual([]);
    // Each stem is kept as a Blob, with the CRC of its bytes.
    const stems = zip.entries.map((e) => e.data as Blob);
    expect(stems.every((data) => data instanceof Blob)).toBe(true);
    expect(await Promise.all(stems.map((data) => data.text()))).toEqual([
      't1',
      't2',
      't3',
      't4',
    ]);
    expect(zip.entries.map((e) => e.crc)).toEqual(
      ['t1', 't2', 't3', 't4'].map((id) => crc32(bytes(id))),
    );
    expect(zip.finished).toBe(1);
  });

  it('skips a track deleted before its turn and names it', async () => {
    const progress: StemProgress[] = [];
    // While Lead Vox renders, a collaborator deletes the third track.
    render.meanwhile = (opts) => {
      if (opts.onlyTrackId !== 't2') return;
      const tracks = store.state.tracks as Array<{ id: string }>;
      store.state = {
        ...store.state,
        tracks: tracks.filter((t) => t.id !== 't3'),
      };
    };
    const result = await exportStems({ format: 'wav', range: 'project' }, (p) =>
      progress.push(p),
    );
    expect(render.calls.map((c) => c.onlyTrackId)).toEqual(['t1', 't2', 't4']);
    expect(result.count).toBe(3);
    expect(result.skipped).toEqual(['Bass']);
    // The zip is numbered as written.
    expect(zip.entries.map((e) => e.name)).toEqual([
      '01-bass.wav',
      '02-lead-vox.wav',
      '03-bass-2.wav',
    ]);
    expect(
      progress.filter((p) => p.stage === 'render').map((p) => p.index),
    ).toEqual([0, 1, 3]);
  });

  it('names the zip and its entries after the range and format', async () => {
    const result = await exportStems({
      format: 'opus',
      range: { startTick: 0, endTick: 1920 },
      rangeLabel: 'bars-1-2',
    });
    expect(result.filename).toBe('late-night-song-bars-1-2-stems.zip');
    expect(zip.entries[0].name).toBe('01-bass.webm');
    expect(render.calls[0].mastering).toBeUndefined();
  });

  it('reports each stem rendering, then encoding', async () => {
    const progress: StemProgress[] = [];
    store.state.tracks = [track('t1', 'Bass'), track('t2', 'Keys')];
    await exportStems({ format: 'wav', range: 'loop' }, (p) =>
      progress.push(p),
    );
    expect(progress).toEqual([
      { index: 0, total: 2, trackName: 'Bass', stage: 'render' },
      { index: 0, total: 2, trackName: 'Bass', stage: 'encode' },
      { index: 1, total: 2, trackName: 'Keys', stage: 'render' },
      { index: 1, total: 2, trackName: 'Keys', stage: 'encode' },
    ]);
  });

  it('stops between tracks and renders no more', async () => {
    const stop = new AbortController();
    const run = exportStems(
      { format: 'wav', range: 'project' },
      (p) => {
        if (p.index === 1 && p.stage === 'encode') stop.abort();
      },
      stop.signal,
    );
    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    expect(render.calls.map((c) => c.onlyTrackId)).toEqual(['t1', 't2']);
    expect(zip.finished).toBe(0);
  });

  it('stops before zipping when stopped during the last stem', async () => {
    const stop = new AbortController();
    const run = exportStems(
      { format: 'wav', range: 'project' },
      (p) => {
        if (p.index === 3 && p.stage === 'encode') stop.abort();
      },
      stop.signal,
    );
    await expect(run).rejects.toThrow(DOMException);
    expect(render.calls).toHaveLength(4);
    expect(zip.finished).toBe(0);
  });

  it('renders nothing when already stopped', async () => {
    const stop = new AbortController();
    stop.abort();
    await expect(
      exportStems({ format: 'wav', range: 'project' }, undefined, stop.signal),
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Stopped' });
    expect(render.calls).toEqual([]);
  });

  it('refuses a song where no track plays anything', async () => {
    store.state.tracks = [track('t1', 'Bass', { mute: true })];
    await expect(
      exportStems({ format: 'wav', range: 'project' }),
    ).rejects.toThrow('No track plays anything to export');
    expect(render.calls).toEqual([]);
  });

  it("falls back to 'mixdown' and 'track' for empty names", async () => {
    store.state.projectName = '';
    store.state.tracks = [track('t1', '  ')];
    const result = await exportStems({ format: 'wav', range: 'project' });
    expect(result.filename).toBe('mixdown-stems.zip');
    expect(zip.entries[0].name).toBe('01-track.wav');
  });
});

describe('exportProjectAudio', () => {
  it('names the mix after the song, as before', async () => {
    const result = await exportProjectAudio({
      format: 'wav',
      range: 'loop',
      bitDepth: 16,
    });
    expect(result.filename).toBe('late-night-song-loop.wav');
    expect(render.calls).toEqual([
      {
        range: 'loop',
        mastering: undefined,
        onlyTrackId: undefined,
        dry: undefined,
      },
    ]);
  });

  it('renders one track, named after it, dry when asked', async () => {
    const wet = await exportProjectAudio({
      format: 'wav',
      range: 'project',
      trackId: 't2',
    });
    expect(wet.filename).toBe('late-night-song-lead-vox.wav');
    const dry = await exportProjectAudio({
      format: 'opus',
      range: { startTick: 0, endTick: 960 },
      rangeLabel: 'bars-1-1',
      trackId: 't2',
      dry: true,
    });
    expect(dry.filename).toBe('late-night-song-lead-vox-dry-bars-1-1.webm');
    expect(render.calls[1]).toMatchObject({ onlyTrackId: 't2', dry: true });
  });

  it('passes mastering off through to the render', async () => {
    await exportProjectAudio({
      format: 'wav',
      range: 'project',
      mastering: false,
    });
    expect(render.calls[0].mastering).toBe(false);
  });

  it('refuses a track that is no longer in the song', async () => {
    await expect(
      exportProjectAudio({ format: 'wav', range: 'project', trackId: 'gone' }),
    ).rejects.toThrow(/no longer in the song/);
    expect(render.calls).toEqual([]);
  });
});
