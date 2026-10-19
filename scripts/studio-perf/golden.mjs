/* eslint-env node */
/**
 * Golden offline renders and live schedule traces for the Studio editor:
 * the milestone 1.0 baseline of what the editor's audio does TODAY, before
 * any fix. Known bugs are measured and recorded here, never worked around.
 *
 *   node scripts/studio-perf/golden.mjs --reuse=http://localhost:5263
 *       Render mode, compare (the default): renders every session fixture
 *       offline at 44.1 and 48 kHz, compares the audio features with the
 *       committed goldens and exits 1 on any difference.
 *   node scripts/studio-perf/golden.mjs --reuse=… --update
 *       Render mode, update: rewrites docs/studio-perf/goldens/ from this run
 *       (renders each session twice, to record whether renders repeat). A
 *       case whose live instruments never finished loading is not written,
 *       and the run exits 1: a golden must not record a network outage.
 *   node scripts/studio-perf/golden.mjs --reuse=… --trace [--update]
 *       Trace mode: plays a 12 s live loop in the editor and logs when every
 *       clip, click and note is scheduled (see "Trace mode" below). The run
 *       exits 1 when the trace itself is broken (its sanity checks fail) or
 *       playback is off the grid (its timing checks fail, ±2 ms). With --update it also keeps each
 *       measured trace, without its raw event log, as
 *       docs/studio-perf/goldens/trace-*.json: never compared, because live
 *       timings move a little run to run.
 *   node scripts/studio-perf/golden.mjs --reuse=… --make-fixtures [--force]
 *       Rebuilds the session fixtures from FIXTURES below, through the
 *       editor's own store actions and serializeSession.
 *
 * Options: --fixture=a,b (default: every fixture; trace: metronome-countin)
 *          --rates=44100,48000 (render: sample rates in Hz; trace: default,
 *          48000, where "default" is the rate the browser picks)
 *          --profile=… (render runs on exactly one profile, small by default,
 *          as an offline render does not depend on it; trace: chromebook by
 *          default, a list or all runs each) --wav (render: also write each
 *          render, stem and export as a WAV in the run folder, to listen to)
 *          --legacy (trace: run on the legacy scheduler, sanity checks only)
 *          --goldens=dir (where goldens are read, and written by --update)
 *          --fixtures-dir=dir (where fixtures are read, and written by
 *          --make-fixtures) --block=host,… (render: fail every request to
 *          these hosts, e.g. gleitz.github.io, to see how a case reports a
 *          CDN that is down), plus the harness flags (--reuse, --port, --out,
 *          --gpu, --headed, --fake-audio: a render checks that Play still
 *          moves the playhead after an export, which needs a running audio
 *          clock; it reads the live clock first, before the fixture loads,
 *          and on a machine where it does not run (headless Chrome's real
 *          output never renders on some) that check is NOT MEASURED, not
 *          compared, and --update writes no golden; trace mode needs the
 *          clock throughout and fails at once without it). Run reports go to docs/studio-perf/runs/golden/ (each
 *          case's result in the golden's shape under actual/, to diff by
 *          hand).
 *
 * Fixtures: scripts/studio-perf/fixtures/sessions/*.json, each a SessionData
 * object as serializeSession wrote it (v2 for the committed five;
 * --make-fixtures writes v3 since milestone 1.3), plus a `golden` key with
 * what a session cannot carry: the audio of its audio clips (a generated
 * sine beep train, beep k at k × 0.5 s and 400 + 100k Hz; audio bytes never
 * live in a session), the render range, the facts to measure (`probes`)
 * and, for the trace fixture, the play plan. deserializeSession reads only
 * the envelope (`version`, `schema`, `compat`) and `data`, so the extra key
 * is ignored there. The metronome is the student's pref since 1.3, which a
 * v3 draft doesn't hold: a fixture keeps it at transport.metronomeEnabled,
 * where v2 did, and loadFixture sets it. The six: demo-sunset-keys
 * (the first demo as it opens: CDN Rhodes samples, GM bass, drums),
 * loop-range (a loop-region export), trimmed-audio (clip offsetSeconds,
 * gain and fades), oracle-two-notes, metronome-countin (the trace
 * session) and dynamics (a gate and a sidechain ducker, measured on the
 * render and on the exported file: a probe with `on: 'export'` reads the
 * file). The demo's Rhodes samples come from gleitz.github.io, so that
 * case needs the network.
 *
 * Render mode. Each fixture and rate gets a fresh page whose AudioContext
 * is forced to that rate, like a device whose output runs at it, because
 * that is what the export bug depends on: the live engine starts (Return A
 * ships with reverb on, so the real hall IR is decoded at the live rate),
 * the fixture is deserialized into the store and its clip audio registered
 * in the AudioBufferStore, and once the live instruments are in, the page
 * imports renderProject.ts and exportAudio.ts (on the Vite dev server these
 * are the module instances the app uses) and runs:
 *
 *   - render: renderProject({ range, sampleRate: rate });
 *   - stems (fixtures with `stems`): the same with one track soloed, so a
 *     silent instrument shows by name;
 *   - export: exportProjectAudio({ format: 'wav', range }), exactly what
 *     File > Export Audio calls (it passes no sample rate). The WAV file it
 *     returns is decoded here and measured like a render, and checked
 *     against the render at the same rate;
 *   - cancel (loop-range only, CANCEL_FIXTURE): the same export aborted
 *     through its signal once its progress passes half-way. It must stop
 *     with an AbortError, make no file, give Tone its live context back and
 *     leave Play moving the playhead; any other outcome is a difference,
 *     whatever the golden holds.
 *
 * It also measures how late one EffectChain with every effect off passes an
 * impulse, which explains the offset every onset in the goldens carries.
 * Each golden, docs/studio-perf/goldens/<fixture>@<rate>.json, stores per
 * render and per exported file: status (ok / error / timeout), sample rate,
 * length, 20 ms RMS per channel (dBFS), onset times (a peak envelope on the
 * full band and on a treble-weighted copy, so snares over a ringing kick
 * count), peak, spectral centroid (overall and per 250 ms), whether Tone's
 * global context was given back afterwards; then the probe results, each
 * live instrument's state, the engine's own error logs, the page's uncaught
 * errors, and a plain-language list of the facts found. Today's failures are
 * recorded as facts: on a 48 kHz device the export throws (audio-core-01)
 * and leaves Tone on the dead offline context; GM SoundFont tracks are
 * silent; audio clips that start after the render start never reach the
 * bounce; Oracle tracks keep at most one note per voice (synth-engine-01).
 *
 * Compare tolerances (strict): peak 0.5 dB; RMS windows louder than -60 dB
 * within 1 dB (at most 1% of them, rounded down, may miss); same onsets
 * within 5 ms; centroid 3%; chain latency 0.5 ms; probes 1 dB or equal (two
 * levels below -60 dB count as equal). Exact: status and error name, sample
 * rate and length, the exported file's size, length, name and format, the
 * set of engine error logs and page errors, and each live instrument's
 * state. Not every render repeats today: the Oracle synth's offline notes
 * depend on wall-clock timers (synth-engine-01; see TIMING_DEPENDENT), so
 * the same session can bounce with a note present, cut short or missing. A
 * mix that holds such a track beside others is compared with loose
 * tolerances (peak 6 dB, RMS 6 dB for 90% of windows, onsets 50 ms with 2
 * extra or missing, centroid 25%, probes 6 dB), and a render of such tracks
 * alone (its stem, or oracle-two-notes) on its status, rate and length only;
 * a render that did not repeat in the update run is compared loosely too.
 * The golden records each render's level (`compare`).
 *
 * Trace mode (fixture metronome-countin, profile chromebook by default, at
 * the browser's own rate and again with the AudioContext forced to 48 kHz).
 * An init script patches start() and stop() of every source node type, so
 * each source the page starts is logged, with an id and the context clock
 * at the call, where a buffer source would end on its own (its start plus
 * its duration or the rest of its buffer) and when its 'ended' arrives,
 * and the pitch params of every oscillator. Wrappers log Tone's
 * transport (start/pause/loop events and calls), the metronome and count-in
 * clicks (MembraneSynth), the instrument adapters' noteOn/noteOff/
 * allNotesOff/panic (found through usePlaybackEngine's trackEngineRegistry),
 * the Oracle synth's envelope gates, and AudioClipScheduler.cancelAll; each
 * native call made inside an adapter call is tied to that call's note. Each
 * track's own meter is polled to show whether it is heard at all. The plan:
 * the playhead on beat 3 inside a trimmed take, a 1-bar count-in, play,
 * pause mid-beat, resume without count-in, loop laps until 12 s, stop; a
 * fixture's golden.trace.steps replaces it with its own list (play,
 * untilTick, pause, wait, resume, seek, editNote, untilSeconds, stop; see
 * runTracePlan). Each transport boundary is labelled by the step that
 * caused it (play, resume, loop, seek, pause, stop). The report gives, in ms against the beat grid (the
 * transport's own start/loop times): clip start and buffer-offset error per
 * start (play, resume, loop lap, on the transport); where each clip's audio
 * really ends (its own end or a stop()) against the seam, pause or stop that
 * should end it, and when the clip scheduler cancels; metronome error per
 * click and missed beats per lap; the count-in grid and the downbeat after
 * it; adapter note times against the grid; per instrument, when the note is
 * heard (the Oracle envelope gate against the note time), which sources it
 * starts at the note's time or at once, the sources it cuts and the pitch it
 * sets at once (a lookahead before the note); notes released at each
 * boundary; and every start(when) earlier than ctx.currentTime. Oracle
 * oscillators are started at once on purpose and gated by the envelope, so
 * "at once" there is not when the note sounds. "Started at once" counts
 * include Tone's own helper sources (constant sources it starts on first
 * use). The audit expects audio clips ~100 ms early (audio-core-02), the
 * metronome off the grid after pause/resume (audio-core-05), trimmed clips
 * restarting from the untrimmed start on loop laps (audio-core-03), notes
 * released early at the seam (instruments-18) and Oracle voices cut at
 * 'now' (synth-engine-02). Sanity checks (the plan ran, every clip and MIDI
 * track played, count-in complete, every instrument and envelope wrapped,
 * no page errors) fail the run, and so do the timing checks, at ±2 ms
 * against the grid: each clip's start time and buffer offset on play,
 * resume, every loop lap and a seek (and one start per run); metronome
 * clicks, with no missed beat; the count-in grid and the downbeat after it;
 * every adapter note-on; after a `seek` step, no buffer source started
 * before it still sounding 12 ms after the seek time and every note of the
 * run it left released by then; after an `editNote` step, the moved note
 * sounding on the next pass at its new tick and not at its old one. With
 * --legacy the page boots on the old scheduler (localStorage
 * 'ma:daw:legacyScheduler' = '1', set by an init script) and only the sanity
 * checks gate: the legacy timings are the known-bad ones.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { cpus, loadavg } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { installDevModules } from './fixtures/fingerprint.mjs';
import {
  AUDIO_CLOCK_STOPPED,
  ROOT,
  audioClock,
  newPage,
  openEditor,
  profilesFrom,
  requireAudioClock,
  startAudio,
  withStudio,
  writeJson,
} from './harness.mjs';

const DEFAULT_FIXTURE_DIR = join(ROOT, 'scripts/studio-perf/fixtures/sessions');
const DEFAULT_GOLDEN_DIR = join(ROOT, 'docs/studio-perf/goldens');
const RENDER_RATES = [44100, 48000];
const TRACE_RATES = ['default', 48000];
const TRACE_FIXTURE = 'metronome-countin';
/** How far (ms) a gated trace timing may sit off the grid. */
const TRACE_TOLERANCE_MS = 2;
const RENDER_TIMEOUT_MS = 120_000;
const INSTRUMENT_TIMEOUT_MS = 90_000;

/** Where fixtures are read and written (--fixtures-dir), resolved from the cwd. */
const fixtureDirOf = (args) =>
  resolve(args['fixtures-dir'] ?? DEFAULT_FIXTURE_DIR);

// ── Fixtures ─────────────────────────────────────────────────────────────
// What --make-fixtures builds. The JSON files are the source of truth once
// written (they are committed); these specs document how they were made.

const BEAT = 480;
const BAR = 4 * BEAT;

/** Kick on 1 and 3, snare on 2 and 4, closed hat on every eighth. */
function drumBars(bars) {
  const notes = [];
  for (let bar = 0; bar < bars; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const tick = bar * BAR + beat * BEAT;
      notes.push([beat % 2 === 0 ? 36 : 38, tick, 120, 110]);
      notes.push([42, tick, 60, 80], [42, tick + BEAT / 2, 60, 70]);
    }
  }
  return notes;
}

/** A clip's audio: beep k starts at k × every s and plays baseHz + k × stepHz. */
const beeps = (seconds) => ({
  kind: 'beeps',
  seconds,
  every: 0.5,
  beepSeconds: 0.1,
  baseHz: 400,
  stepHz: 100,
  amplitude: 0.5,
});

/** The fixture whose render case also cancels an export half-way. */
const CANCEL_FIXTURE = 'loop-range';
/** What a cancelled export must do, whatever the golden says. */
const CANCEL_EXPECTED = {
  status: 'aborted',
  errorName: 'AbortError',
  filesMade: 0,
  toneContextRestored: true,
  playheadMovesAfter: true,
};

const FIXTURES = [
  {
    name: 'demo-sunset-keys',
    boot: '?demo=demo-sunset-keys',
    waitForTrack: 'Drums',
    golden: {
      about:
        'The first Studio demo as it opens: Rhodes (electric-piano sampler, CDN samples), GM SoundFont bass and natural-kit drums, 85 BPM, bounced whole with a stem per track.',
      range: 'project',
      stems: true,
      probes: [
        {
          label: 'GM SoundFont bass stem is silent in the bounce',
          kind: 'silent',
          stem: 'Bass',
        },
      ],
    },
  },
  {
    name: 'loop-range',
    project: { bpm: 120, loop: [BAR, 3 * BAR] },
    tracks: [
      {
        id: 'trk-drums',
        name: 'Drums',
        type: 'midi',
        instrument: 'drum-machine',
        fields: { drumKit: '808' },
        midi: [{ id: 'clip-drums', startTick: 0, notes: drumBars(3) }],
      },
      {
        id: 'trk-bass',
        name: 'Bass',
        type: 'midi',
        instrument: 'bass-electric',
        fields: { sends: { A: 0.35 } },
        midi: [
          {
            id: 'clip-bass',
            startTick: 0,
            notes: [
              [36, BAR / 2, 2400, 100],
              [43, 2 * BAR, BAR / 2, 100],
              [41, 2 * BAR + BAR / 2, BAR / 2, 100],
            ],
          },
        ],
      },
    ],
    golden: {
      about:
        'Export of the loop region (bars 2-3 of three, 120 BPM): 808 drums and the sampled electric bass with a send to the Return A reverb. The bass note that starts in bar 1 sustains into the loop.',
      range: 'loop',
      stems: true,
      probes: [
        {
          label:
            'bass note started before the loop start is heard in the first loop bar',
          kind: 'levelAt',
          stem: 'Bass',
          from: 0.1,
          to: 0.9,
        },
        {
          label:
            'drums: the first loop downbeat (bar 2) opens the render, at 0 s plus the chains latency',
          kind: 'onsetNear',
          stem: 'Drums',
          sec: 0,
          tolMs: 30,
        },
      ],
    },
  },
  {
    name: 'trimmed-audio',
    project: { bpm: 120 },
    tracks: [
      {
        id: 'trk-beeps',
        name: 'Beeps',
        type: 'audio',
        instrument: 'none',
        audio: [
          {
            id: 'clip-trimmed',
            startTick: 2 * BEAT,
            duration: BAR,
            fadeInTicks: 0,
            fadeOutTicks: 0,
            offsetSeconds: 0.75,
            gain: 0.5,
          },
          {
            id: 'clip-faded',
            startTick: 2 * BAR,
            duration: 3 * BEAT,
            fadeInTicks: BEAT / 2,
            fadeOutTicks: BEAT,
            offsetSeconds: 0,
            gain: 1,
          },
        ],
      },
    ],
    golden: {
      about:
        'Two audio clips cut from a generated beep train (beep k at k x 0.5 s, 400 + 100k Hz), 120 BPM: clip-trimmed starts at 1.0 s with offsetSeconds 0.75 and gain 0.5; clip-faded starts at 4.0 s with a 0.25 s fade-in and a 0.5 s fade-out.',
      range: 'project',
      audio: { 'clip-trimmed': beeps(4), 'clip-faded': beeps(4) },
      probes: [
        {
          label:
            'clip-trimmed plays, offsetSeconds honoured: first beep at 1.25 s (1.00 s if ignored), plus the chains latency',
          kind: 'onsetNear',
          sec: 1.25,
          tolMs: 30,
        },
        {
          label:
            'clip-trimmed gain 0.5: its beep level minus clip-faded full-level beep (-6 dB when applied)',
          kind: 'levelDiff',
          a: [1.27, 1.33],
          b: [4.52, 4.58],
        },
        {
          label:
            'clip-faded fade-in: its first beep minus its second (negative when the fade is applied)',
          kind: 'levelDiff',
          a: [4.02, 4.08],
          b: [4.52, 4.58],
        },
      ],
    },
  },
  {
    // Two halves that never overlap, so each is measured on the full mix
    // (the export has no stems, and a stem leaves the ducker's key out).
    name: 'dynamics',
    project: { bpm: 120 },
    tracks: [
      {
        id: 'trk-gated',
        name: 'Gated',
        type: 'audio',
        instrument: 'none',
        effects: {
          gate: {
            enabled: true,
            threshold: -30,
            // Closed, the floor sits below a 16-bit file's last bit, so the
            // export holds the same silence as the render.
            range: 80,
            hold: 0.01,
            attack: 0.001,
            release: 0.05,
          },
        },
        audio: [
          {
            id: 'clip-gated',
            startTick: 0,
            duration: 2 * BAR,
            fadeInTicks: 0,
            fadeOutTicks: 0,
            offsetSeconds: 0,
            gain: 1,
          },
        ],
      },
      {
        // The ducker's key: kicks every half bar, turned far down so the
        // kick itself barely reaches the mix while its key still does.
        id: 'trk-kick',
        name: 'Kick',
        type: 'midi',
        instrument: 'drum-machine',
        fields: { drumKit: '808', volume: 0.02 },
        midi: [
          {
            id: 'clip-kick',
            startTick: 2 * BAR,
            notes: [0, 1, 2, 3].map((k) => [36, k * 2 * BEAT, 120, 120]),
          },
        ],
      },
      {
        id: 'trk-pad',
        name: 'Pad',
        type: 'audio',
        instrument: 'none',
        effects: {
          ducker: {
            enabled: true,
            keyTrackId: 'trk-kick',
            // The kick's tail at this volume stays above -55 dB for most
            // of a second: -40 dB lets the duck release before the next.
            threshold: -40,
            amount: 0.6,
            attack: 0.005,
            release: 0.1,
          },
        },
        audio: [
          {
            id: 'clip-pad',
            startTick: 2 * BAR,
            duration: 2 * BAR,
            fadeInTicks: 0,
            fadeOutTicks: 0,
            offsetSeconds: 0,
            gain: 1,
          },
        ],
      },
    ],
    golden: {
      about:
        'Gate and ducker in the bounce, 120 BPM. Bars 1-2 (0-4 s): a beep train (beep k at k x 0.5 s, 0.1 s long) over a quiet 150 Hz floor (-43 dB) with the gate on (threshold -30 dB, range 80 dB), so it closes between beeps. Bars 3-4 (4-8 s): a steady 440 Hz pad ducked (threshold -40 dB, amount 0.6, about -8 dB) by a kick on every other beat (4, 5, 6, 7 s) whose own track is at volume 0.02. Measured on the full mix, in the render and the export.',
      range: 'project',
      stems: true,
      audio: {
        'clip-gated': {
          ...beeps(4),
          stepHz: 0,
          floorAmplitude: 0.01,
          floorHz: 150,
        },
        'clip-pad': {
          kind: 'beeps',
          seconds: 4,
          every: 4,
          beepSeconds: 4,
          baseHz: 440,
          stepHz: 0,
          amplitude: 0.5,
        },
      },
      probes: ['render', 'export'].flatMap((x) => {
        const on = x === 'export' ? { on: 'export' } : {};
        const where = x === 'export' ? ' (export)' : '';
        return [
          {
            label: `gate: a beep minus the floor after it, beep 3 at 1.0 s (about 34 dB with the gate open, far more when it closes)${where}`,
            kind: 'levelDiff',
            a: [1.02, 1.08],
            b: [1.3, 1.45],
            ...on,
          },
          {
            label: `gate: level of the floor between beeps 3 and 4 (about -43 dB when the gate is open)${where}`,
            kind: 'levelAt',
            from: 1.3,
            to: 1.45,
            ...on,
          },
          {
            label: `ducker: the pad just after the kick at 5 s minus the pad recovered before the next (about -8 dB at amount 0.6, 0 without the duck)${where}`,
            kind: 'levelDiff',
            a: [5.03, 5.1],
            b: [5.7, 5.95],
            ...on,
          },
          {
            label: `ducker: the same after the kick at 6 s${where}`,
            kind: 'levelDiff',
            a: [6.03, 6.1],
            b: [6.7, 6.95],
            ...on,
          },
        ];
      }),
    },
  },
  {
    name: 'oracle-two-notes',
    project: { bpm: 120 },
    tracks: [
      {
        id: 'trk-lead',
        name: 'Lead',
        type: 'midi',
        instrument: 'oracle-synth',
        synth: 'default',
        midi: [
          {
            id: 'clip-lead',
            startTick: 0,
            notes: [
              [60, 0, BEAT, 100],
              [67, 2 * BEAT, BEAT, 100],
            ],
          },
        ],
      },
    ],
    golden: {
      about:
        'One Oracle synth track with the default patch playing C4 at 0.0-0.5 s and G4 at 1.0-1.5 s, 120 BPM (synth-engine-01: offline the engine schedules against ctx.currentTime and wall-clock timers).',
      range: 'project',
      probes: [
        {
          label: 'note 1 (C4) sounds from 0.0 s (plus the chains latency)',
          kind: 'onsetNear',
          sec: 0,
          tolMs: 30,
        },
        {
          label: 'note 2 (G4) sounds from 1.0 s (plus the chains latency)',
          kind: 'onsetNear',
          sec: 1,
          tolMs: 30,
        },
        {
          label: 'level while note 1 holds',
          kind: 'levelAt',
          from: 0.1,
          to: 0.4,
        },
        {
          label: 'level while note 2 holds',
          kind: 'levelAt',
          from: 1.1,
          to: 1.4,
        },
        {
          label: 'level after both notes released (release 0.3 s)',
          kind: 'levelAt',
          from: 2,
          to: 3,
        },
      ],
    },
  },
  {
    name: 'metronome-countin',
    project: { bpm: 120, loop: [0, 2 * BAR], metronome: true },
    tracks: [
      {
        // A recorded take: Vocals is the audio track the New Track dialog
        // makes first; its clips play through the adapter's pedal input.
        id: 'trk-take',
        name: 'Take',
        type: 'audio',
        instrument: 'vocal-fx',
        audio: [
          {
            id: 'clip-take',
            startTick: 0,
            duration: 2 * BAR,
            fadeInTicks: 0,
            fadeOutTicks: 0,
            offsetSeconds: 0.5,
            gain: 1,
          },
        ],
      },
      {
        // A library sample dropped on the timeline: an 'audio'/'none' track
        // (Timeline.tsx), whose clip starts on the transport each lap.
        id: 'trk-sample',
        name: 'Sample',
        type: 'audio',
        instrument: 'none',
        audio: [
          {
            id: 'clip-sample',
            startTick: BAR,
            duration: BEAT,
            fadeInTicks: 0,
            fadeOutTicks: 0,
            offsetSeconds: 0,
            gain: 1,
          },
        ],
      },
      {
        id: 'trk-drums',
        name: 'Drums',
        type: 'midi',
        instrument: 'drum-machine',
        fields: { drumKit: '808' },
        midi: [{ id: 'clip-drums', startTick: 0, notes: drumBars(2) }],
      },
      {
        id: 'trk-lead',
        name: 'Lead',
        type: 'midi',
        instrument: 'oracle-synth',
        synth: 'default',
        midi: [
          {
            id: 'clip-lead',
            startTick: 0,
            notes: [
              [60, 0, BEAT, 90],
              [64, 2 * BEAT, BEAT, 90],
              [67, BAR, BEAT, 90],
              [72, BAR + 2 * BEAT, BEAT, 90],
            ],
          },
        ],
      },
    ],
    golden: {
      about:
        'The live-trace session: metronome on, 2-bar loop at 120 BPM; a recorded take (Vocals track, beep train trimmed by 0.5 s) across the loop, a dropped library sample (instrument-less audio track) on bar 2, 808 drums and an Oracle synth line on beats 1 and 3. Offline it shows the bounce has no metronome, with a stem per track.',
      range: 'project',
      stems: true,
      audio: { 'clip-take': beeps(5), 'clip-sample': beeps(1) },
      trace: {
        playFromTick: 2 * BEAT,
        countInBars: 1,
        pauseAtTick: 2600,
        pauseMs: 600,
        seconds: 12,
      },
    },
  },
];

// ── In-page code ─────────────────────────────────────────────────────────
// These functions are sent to the page as source (page.evaluate /
// addInitScript), so they must not use anything from this module's scope.

/**
 * Init script: every AudioContext the page makes runs at `rate`, as on a
 * device whose output runs at that rate. Tone, and with it the editor's
 * live engine, builds its context from window.AudioContext (through
 * standardized-audio-context, which reads the constructor when it loads),
 * so this must run before any app code.
 */
function forceSampleRate(rate) {
  const Native = window.AudioContext;
  if (!rate || !Native || Native.goldenRate) return;
  class GoldenRateAudioContext extends Native {
    constructor(options = {}) {
      super({ ...options, sampleRate: options.sampleRate ?? rate });
    }
  }
  GoldenRateAudioContext.goldenRate = rate;
  window.AudioContext = GoldenRateAudioContext;
}

/**
 * Init script for --trace: logs each start() and stop() of a source node
 * (buffer source, oscillator, constant source) on a live context while
 * window.__goldenTrace.recording is on, with the context clock at the call.
 * Everything Tone and the app play ends in one of these calls, so this sees
 * the times the audio thread is really given. Each source gets an id (so a
 * stop can be matched to its start) and is tagged with the clip it plays
 * (by AudioBuffer identity), the wrapper it was started from (trace.scope)
 * and the instrument-adapter call it was made in (trace.call), both set by
 * the page helpers' wrappers. Inside an adapter call it also logs every
 * change to an oscillator's frequency or detune, which says whether a
 * note's pitch is set at its time or at once.
 */
function installTraceProbes() {
  if (window.__goldenTrace) return;
  const trace = {
    recording: false,
    events: [],
    clipBuffers: new Map(),
    scope: [],
    call: null,
    // The Tone buffer source whose start() is running, and the id of the
    // native source each Tone source started (see installTraceWrappers).
    toneOwner: null,
    toneIds: new WeakMap(),
    // The live context's clock; the page helpers point it at Tone's context.
    now: () => null,
  };
  window.__goldenTrace = trace;
  const ids = new WeakMap();
  let nextId = 1;
  const idOf = (node) => {
    if (!ids.has(node)) ids.set(node, nextId++);
    return ids.get(node);
  };
  // AudioBufferSourceNode declares its own start(when, offset, duration);
  // the others inherit AudioScheduledSourceNode's. Patch each own method.
  const owners = [
    window.AudioScheduledSourceNode,
    window.AudioBufferSourceNode,
    window.OscillatorNode,
    window.ConstantSourceNode,
  ].filter(Boolean);
  const patches = [];
  for (const owner of owners) {
    for (const name of ['start', 'stop']) {
      if (Object.prototype.hasOwnProperty.call(owner.prototype, name)) {
        patches.push([owner.prototype, name]);
      }
    }
  }
  for (const [proto, name] of patches) {
    const original = proto[name];
    proto[name] = function (...args) {
      const ctx = this.context;
      if (trace.recording && !(ctx instanceof OfflineAudioContext)) {
        const isBuffer = this instanceof AudioBufferSourceNode;
        const start = name === 'start';
        const id = idOf(this);
        if (start && trace.toneOwner) trace.toneIds.set(trace.toneOwner, id);
        const when = args[0] ?? 0;
        const offset = start && isBuffer ? (args[1] ?? 0) : null;
        const duration = start && isBuffer ? (args[2] ?? null) : null;
        const bufferSec =
          start && isBuffer ? (this.buffer?.duration ?? null) : null;
        // Where a buffer source ends on its own, in context time: its start
        // plus the duration it was given (or the rest of its buffer) at its
        // playback rate. A looping source or an oscillator never ends on
        // its own (null); only a stop() ends it.
        let naturalEnd = null;
        if (start && isBuffer && !this.loop) {
          const rate = this.playbackRate?.value || 1;
          const rest = Math.max(0, (bufferSec ?? 0) - (offset ?? 0));
          const length = duration === null ? rest : Math.min(duration, rest);
          naturalEnd = Math.max(when, ctx.currentTime) + length / rate;
        }
        trace.events.push({
          type: start ? 'src-start' : 'src-stop',
          id,
          node: this.constructor.name,
          clipId: isBuffer
            ? (trace.clipBuffers.get(this.buffer) ?? null)
            : null,
          scope: trace.scope.length
            ? trace.scope[trace.scope.length - 1]
            : null,
          call: trace.call?.seq ?? null,
          when,
          offset,
          duration,
          bufferSec,
          loop: start && isBuffer ? Boolean(this.loop) : null,
          naturalEnd,
          now: ctx.currentTime,
          wall: performance.now(),
        });
        // When the source really stopped sounding (its own end or a stop()),
        // as the context clock read when 'ended' arrived.
        if (start) {
          this.addEventListener(
            'ended',
            () => {
              if (!trace.recording) return;
              trace.events.push({
                type: 'src-ended',
                id,
                now: ctx.currentTime,
                wall: performance.now(),
              });
            },
            { once: true },
          );
        }
      }
      return original.apply(this, args);
    };
  }

  // Oscillator pitch params are tagged when a node hands them out:
  // standardized-audio-context reads them once, when it wraps a native node,
  // and later calls their methods, so a tag set here survives the wrapping.
  const paramNames = new WeakMap();
  for (const name of ['frequency', 'detune']) {
    const getter = Object.getOwnPropertyDescriptor(
      OscillatorNode.prototype,
      name,
    );
    if (!getter?.get) continue;
    Object.defineProperty(OscillatorNode.prototype, name, {
      ...getter,
      get() {
        const param = getter.get.call(this);
        paramNames.set(param, `osc.${name}`);
        return param;
      },
    });
  }
  const logParam = (param, fn, when) => {
    if (!trace.recording || !trace.call) return;
    const name = paramNames.get(param);
    if (!name) return;
    trace.events.push({
      type: 'param',
      param: name,
      fn,
      call: trace.call.seq,
      when,
      now: trace.now(),
      wall: performance.now(),
    });
  };
  // The ways a value changes from a given time on (ramps continue from the
  // previous event, so they say nothing about when a change starts).
  for (const fn of [
    'setValueAtTime',
    'setTargetAtTime',
    'setValueCurveAtTime',
  ]) {
    const original = AudioParam.prototype[fn];
    AudioParam.prototype[fn] = function (...args) {
      logParam(this, fn, args[1] ?? null);
      return original.apply(this, args);
    };
  }
  const value = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
  if (value?.set) {
    Object.defineProperty(AudioParam.prototype, 'value', {
      ...value,
      set(next) {
        // Setting .value takes effect at once.
        logParam(this, 'value', null);
        value.set.call(this, next);
      },
    });
  }
}

/** Installs window.__golden: the page-side steps of every mode. */
function installPageHelpers() {
  if (window.__golden) return;
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
  const until = async (test, timeoutMs, stepMs = 50) => {
    const end = performance.now() + timeoutMs;
    while (!test()) {
      if (performance.now() > end) return false;
      await sleep(stepMs);
    }
    return true;
  };
  const store = () => window.__MA_STORE__;
  const engine = () => window.__MA_AUDIO_ENGINE__;
  // An app module as the editor loaded it (installDevModules): after a hot
  // update the editor imports path?t=…, and a bare import loads a copy.
  const app = (path) => window.__RT_DEV_MODULE__(path);
  const errorInfo = (err) => ({
    name: err?.name ?? 'Error',
    message: String(err?.message ?? err)
      .split('\n')[0]
      .slice(0, 300),
  });
  /** Rejects after `ms` unless cleared, so a hung render becomes a result. */
  const deadline = (ms) => {
    let timer = null;
    const promise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`no result after ${ms} ms`);
        err.name = 'Timeout';
        reject(err);
      }, ms);
    });
    return { promise, clear: () => clearTimeout(timer) };
  };

  // The app imports Tone from Vite's dep cache under a versioned URL; read
  // that URL from a module the app has loaded, so this is the same instance.
  let tonePromise = null;
  const tone = () => {
    tonePromise ??= (async () => {
      const response = await fetch('/src/daw/audio/MetronomeEngine.ts');
      const source = await response.text();
      const url = /from\s+"([^"]*\/deps\/tone\.js[^"]*)"/.exec(source)?.[1];
      if (!url) throw new Error('tone import not found in MetronomeEngine.ts');
      return import(url);
    })();
    return tonePromise;
  };

  /** A mono beep train with raised-cosine edges, so each onset is clean. */
  const makeBeeps = (spec, sampleRate) => {
    const length = Math.round(spec.seconds * sampleRate);
    const buffer = new AudioBuffer({ length, numberOfChannels: 1, sampleRate });
    const data = buffer.getChannelData(0);
    const beepLength = Math.round(spec.beepSeconds * sampleRate);
    const edge = Math.max(1, Math.round(0.004 * sampleRate));
    for (let k = 0; k * spec.every < spec.seconds; k++) {
      const start = Math.round(k * spec.every * sampleRate);
      const hz = spec.baseHz + k * spec.stepHz;
      for (let i = 0; i < beepLength && start + i < length; i++) {
        const fromEnd = beepLength - i;
        let env = 1;
        if (i < edge) env = 0.5 - 0.5 * Math.cos((Math.PI * i) / edge);
        else if (fromEnd < edge)
          env = 0.5 - 0.5 * Math.cos((Math.PI * fromEnd) / edge);
        data[start + i] =
          spec.amplitude * env * Math.sin((2 * Math.PI * hz * i) / sampleRate);
      }
    }
    // An optional quiet tone under the whole train (a noise floor between
    // the beeps, for a gate to close on).
    if (spec.floorAmplitude) {
      for (let i = 0; i < length; i++) {
        data[i] +=
          spec.floorAmplitude *
          Math.sin((2 * Math.PI * spec.floorHz * i) / sampleRate);
      }
    }
    return buffer;
  };

  /** A Blob's bytes (or a typed array's) as base64, to hand to node. */
  const toBase64 = (data) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        resolve(url.slice(url.indexOf(',') + 1));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(
        data instanceof Blob ? data : new Blob([data.slice()]),
      );
    });

  // Things that went wrong on the page but are not results (a wait that ran
  // out); the node side prints them with the case.
  const warnings = [];

  /** Builds a fixture through the store's own actions and serializes it. */
  async function buildFixture(spec) {
    const { serializeSession } = await app(
      '/src/daw/persistence/SessionSerializer.ts',
    );
    const synth = await app('/src/daw/oracle-synth/synthTrackState.ts');
    const s = () => store().getState();
    if (spec.waitForTrack) {
      const found = await until(
        () => s().tracks.some((t) => t.name === spec.waitForTrack),
        60_000,
      );
      if (!found) throw new Error(`track ${spec.waitForTrack} never appeared`);
    }
    if (spec.project) {
      s().setProjectName(`golden: ${spec.name}`);
      s().setBpm(spec.project.bpm);
      if (spec.project.loop) {
        s().setLoopRange(spec.project.loop[0], spec.project.loop[1]);
        s().setLoopEnabled(true);
      }
      if (spec.project.metronome && !s().metronomeEnabled)
        s().toggleMetronome();
      for (const track of spec.tracks ?? []) {
        const tempId = s().addTrack(track.type, track.instrument, track.name);
        // Stable ids keep the fixture readable and its clips addressable.
        s().updateTrack(tempId, { id: track.id, ...(track.fields ?? {}) });
        // Effect slots switched on, each over the track's own defaults, and
        // in the rack as the Effects panel adds them.
        for (const slot of Object.keys(track.effects ?? {})) {
          s().addActiveEffect(track.id, slot);
        }
        if (track.effects) {
          const current = s().tracks.find((t) => t.id === track.id).effects;
          s().updateTrackEffects(
            track.id,
            Object.fromEntries(
              Object.entries(track.effects).map(([slot, params]) => [
                slot,
                { ...current[slot], ...params },
              ]),
            ),
          );
        }
        for (const clip of track.midi ?? []) {
          s().addMidiClip(track.id, {
            id: clip.id,
            name: clip.name ?? track.name,
            startTick: clip.startTick,
            events: clip.notes.map(([note, startTick, durationTicks, vel]) => ({
              note,
              velocity: vel ?? 100,
              startTick,
              durationTicks,
              channel: track.instrument === 'drum-machine' ? 9 : 0,
            })),
          });
        }
        for (const clip of track.audio ?? []) s().addAudioClip(track.id, clip);
        if (track.synth === 'default') {
          synth.setTrackSynthState(track.id, synth.captureSynthState());
        }
      }
    }
    // Since codec v3 the metronome is the student's pref, not the project's,
    // so a draft no longer holds it. The fixture keeps it where a v2 draft
    // did, and loadFixture applies it.
    const session = serializeSession();
    session.data.transport.metronomeEnabled = s().metronomeEnabled;
    return session;
  }

  /** Registers the clip audio, then deserializes the session. */
  async function loadFixture(session, audio) {
    const { deserializeSession } = await app(
      '/src/daw/persistence/SessionSerializer.ts',
    );
    const { setAudioBuffer } = await app('/src/daw/audio/AudioBufferStore.ts');
    // Decoded audio sits at the live context's rate (decodeAudioData and the
    // recorder resample to it), so the clip audio is made at that rate too.
    const sampleRate = engine().getSampleRate();
    for (const [clipId, spec] of Object.entries(audio ?? {})) {
      const buffer = makeBeeps(spec, sampleRate);
      setAudioBuffer(clipId, buffer);
      window.__goldenTrace?.clipBuffers.set(buffer, clipId);
    }
    deserializeSession(session);
    // The fixture's metronome (transport.metronomeEnabled, where a v2 draft
    // keeps it): a load hands a v2 draft's to the student's prefs only on a
    // first visit, and a v3 draft has none, so it is set here either way.
    const metronome = session.data?.transport?.metronomeEnabled;
    const state = store().getState();
    if (
      typeof metronome === 'boolean' &&
      state.metronomeEnabled !== metronome
    ) {
      state.toggleMetronome();
    }
    return { liveRate: sampleRate };
  }

  /**
   * Waits for the return buses' real reverb IRs and for every live
   * instrument to attach. A render must not start before: Tone's global
   * context is the offline one while a render runs, and a live instrument
   * still loading then builds its nodes on it and fails (audio-core-20).
   */
  async function waitReady(timeoutMs) {
    const { trackEngineRegistry, getEngineReadyVersion } = await app(
      '/src/daw/hooks/usePlaybackEngine.ts',
    );
    const { ensureProcessedIr } = await app('/src/daw/audio/reverbIR.ts');
    const live = engine().getContext();
    const irs = [];
    for (const ret of store().getState().returns) {
      const reverb = ret.effects?.reverb;
      if (!reverb?.enabled) continue;
      const ir = await ensureProcessedIr(live, reverb.type, reverb.decay);
      irs.push({
        bus: ret.id,
        type: reverb.type,
        rate: ir?.sampleRate ?? null,
      });
    }
    const status = () =>
      store()
        .getState()
        .tracks.map((t) => {
          const entry = trackEngineRegistry.get(t.id);
          let state = 'pending';
          if (entry && !entry.instrument) state = 'none';
          else if (entry?.trackEngine.getInstrument()) state = 'ready';
          else if (entry) state = 'loading';
          return { name: t.name, instrument: t.instrument, state };
        });
    const started = performance.now();
    const complete = await until(
      () => status().every((s) => s.state === 'ready' || s.state === 'none'),
      timeoutMs,
      100,
    );
    if (complete) {
      // Settled once nothing attaches, re-inits or changes state for three
      // polls in a row: each instrument applies its patch, pads or kit in
      // the same step that attaches it, and bumps the ready version.
      const snapshot = () =>
        JSON.stringify([getEngineReadyVersion(), trackEngineRegistry.size]) +
        JSON.stringify(status());
      let last = snapshot();
      let still = 0;
      const settled = await until(
        () => {
          const now = snapshot();
          still = now === last ? still + 1 : 0;
          last = now;
          return still >= 3;
        },
        10_000,
        100,
      );
      if (!settled) warnings.push('live instruments kept changing for 10 s');
    }
    return {
      complete,
      irs,
      instruments: status(),
      waitedMs: Math.round(performance.now() - started),
    };
  }

  /**
   * Puts `tracks` in the store and waits until the live engine's track sync
   * has applied them (each live TrackEngine whose mute/solo gate changes got
   * its new gate). The sync must not run while a render has Tone's global
   * context swapped to its offline one, or it builds live nodes there.
   */
  async function setTracksAndSync(tracks) {
    const { TrackEngine } = await app('/src/daw/audio/TrackEngine.ts');
    const { isTrackAudible } = await app('/src/daw/audio/trackAudibility.ts');
    const { trackEngineRegistry } = await app(
      '/src/daw/hooks/usePlaybackEngine.ts',
    );
    // The reconciler sets a gate only when the track's audibility changes
    // (since aaf8bf51), so only those gates are waited for: a track that
    // stays audible, or silent, gets no call.
    const before = store().getState().tracks;
    const changing = tracks.filter((t) => {
      const prev = before.find((p) => p.id === t.id);
      return (
        !prev || isTrackAudible(prev, before) !== isTrackAudible(t, tracks)
      );
    });
    const gates = new Map();
    const setAudible = TrackEngine.prototype.setAudible;
    TrackEngine.prototype.setAudible = function (audible) {
      gates.set(this, audible);
      return setAudible.call(this, audible);
    };
    try {
      store().setState({ tracks });
      // The sync sets every changed gate in one pass, so once the last one
      // is set the whole pass (volume, pan, effects, sends) has run. It
      // runs inside the store write, so this is usually true at once.
      const synced = await until(
        () =>
          changing.every((t) => {
            const live = trackEngineRegistry.get(t.id)?.trackEngine;
            return !live || gates.get(live) === isTrackAudible(t, tracks);
          }),
        10_000,
        10,
      );
      if (!synced) warnings.push('live track sync not seen within 10 s');
      return synced;
    } finally {
      TrackEngine.prototype.setAudible = setAudible;
    }
  }

  /** renderProject, optionally with one track soloed (a stem). */
  async function render({ range, sampleRate, soloTrackId, timeoutMs }) {
    const { renderProject } = await app('/src/daw/audio/renderProject.ts');
    const Tone = await tone();
    const live = engine().getContext();
    let original = null;
    if (soloTrackId) {
      original = store().getState().tracks;
      await setTracksAndSync(
        original.map((t) => ({ ...t, solo: t.id === soloTrackId })),
      );
    }
    const started = performance.now();
    const after = () => ({
      wallMs: Math.round(performance.now() - started),
      toneContextRestored: Tone.getContext().rawContext === live,
    });
    const limit = deadline(timeoutMs);
    try {
      const options = { range };
      if (sampleRate) options.sampleRate = sampleRate;
      const buffer = await Promise.race([
        renderProject(options),
        limit.promise,
      ]);
      const result = after();
      const channels = [];
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        channels.push(await toBase64(buffer.getChannelData(c)));
      }
      return {
        status: 'ok',
        sampleRate: buffer.sampleRate,
        length: buffer.length,
        channels,
        ...result,
      };
    } catch (err) {
      return {
        status: err?.name === 'Timeout' ? 'timeout' : 'error',
        error: errorInfo(err),
        ...after(),
      };
    } finally {
      limit.clear();
      if (original) await setTracksAndSync(original);
    }
  }

  /**
   * How late one EffectChain with every effect off passes a click (ms): an
   * impulse through a fresh chain on an offline context. Every track, return
   * and the master run through one, so this offsets every onset.
   */
  async function chainLatency(sampleRate) {
    const { EffectChain, DEFAULT_EFFECTS } = await app(
      '/src/daw/audio/EffectChain.ts',
    );
    const ctx = new OfflineAudioContext(
      2,
      Math.round(sampleRate / 4),
      sampleRate,
    );
    const impulse = ctx.createBuffer(1, 1, sampleRate);
    impulse.getChannelData(0)[0] = 0.5;
    const source = ctx.createBufferSource();
    source.buffer = impulse;
    const chain = new EffectChain(ctx);
    chain.update(structuredClone(DEFAULT_EFFECTS));
    source.connect(chain.getInputNode());
    chain.getOutputNode().connect(ctx.destination);
    source.start(0);
    const out = await ctx.startRendering();
    chain.dispose();
    const data = out.getChannelData(0);
    let peak = 0;
    for (let i = 1; i < data.length; i++) {
      if (Math.abs(data[i]) > Math.abs(data[peak])) peak = i;
    }
    return Math.round((peak / sampleRate) * 1e5) / 100;
  }

  /**
   * Presses Play from bar 1 (no count-in) and says whether the playhead
   * moves within 2 s: after a failed export Tone's transport is the dead
   * offline one, and it never does.
   */
  async function playheadMoves() {
    const Tone = await tone();
    const s = () => store().getState();
    s().setCountInBars(0);
    s().setPosition(0);
    s().setLastSeekPosition(0);
    s().play();
    // The live playhead (__MA_PLAYHEAD__, 1.7): the store's position is
    // parked while playing. An older build (--prev-base) moves the store.
    const tick = () => window.__MA_PLAYHEAD__?.tick?.() ?? s().position;
    const moved = await until(() => tick() > 0, 2000, 20);
    s().stop();
    await until(
      () => !s().isPlaying && Tone.getTransport().state !== 'started',
      2000,
      20,
    );
    return moved;
  }

  /**
   * File > Export Audio as the dialog calls it (WAV, no sample rate). The
   * file itself comes back as base64, to be decoded and measured in node.
   */
  async function exportWav({ range, timeoutMs }) {
    const { exportProjectAudio } = await app('/src/daw/audio/exportAudio.ts');
    const Tone = await tone();
    const live = engine().getContext();
    const started = performance.now();
    const after = () => ({
      wallMs: Math.round(performance.now() - started),
      toneContextRestored: Tone.getContext().rawContext === live,
    });
    const limit = deadline(timeoutMs);
    try {
      const { blob, filename } = await Promise.race([
        exportProjectAudio({ format: 'wav', range, bitDepth: 16 }),
        limit.promise,
      ]);
      return {
        status: 'ok',
        filename,
        bytes: blob.size,
        wav: await toBase64(blob),
        ...after(),
      };
    } catch (err) {
      return {
        status: err?.name === 'Timeout' ? 'timeout' : 'error',
        error: errorInfo(err),
        ...after(),
      };
    } finally {
      limit.clear();
    }
  }

  /**
   * File > Export Audio cancelled half-way: the export is aborted (its
   * signal) once its progress passes `abortAt`. Says how it ended, how many
   * object URLs (files to download) were made meanwhile, and whether Tone's
   * global context is the live one again.
   */
  async function cancelledExport({ range, timeoutMs, abortAt = 0.5 }) {
    const { exportProjectAudio } = await app('/src/daw/audio/exportAudio.ts');
    const Tone = await tone();
    const live = engine().getContext();
    const controller = new AbortController();
    let abortedAt = null;
    let filesMade = 0;
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (...args) {
      filesMade++;
      return createObjectURL.apply(this, args);
    };
    const started = performance.now();
    const limit = deadline(timeoutMs);
    let outcome;
    try {
      const result = await Promise.race([
        exportProjectAudio(
          { format: 'wav', range, bitDepth: 16 },
          (p) => {
            // The first report (null: the render can't say yet) is not
            // half-way; a numeric one past `abortAt` is.
            if (abortedAt !== null || p.fraction === null) return;
            if (p.fraction >= abortAt) {
              abortedAt = { stage: p.stage, fraction: p.fraction };
              controller.abort();
            }
          },
          controller.signal,
        ),
        limit.promise,
      ]);
      if (result?.blob) filesMade++;
      outcome = { status: 'finished' };
    } catch (err) {
      let status = 'error';
      if (err?.name === 'Timeout') status = 'timeout';
      if (err?.name === 'AbortError') status = 'aborted';
      outcome = { status, error: errorInfo(err) };
    } finally {
      limit.clear();
    }
    // Anything the cancelled export still had queued lands now.
    await sleep(300);
    URL.createObjectURL = createObjectURL;
    if (abortedAt) {
      abortedAt.fraction = Math.round(abortedAt.fraction * 100) / 100;
    }
    return {
      ...outcome,
      abortedAt,
      filesMade,
      toneContextRestored: Tone.getContext().rawContext === live,
      wallMs: Math.round(performance.now() - started),
    };
  }

  /**
   * Wraps the transport, clicks, adapters, Oracle envelopes and clip cancels
   * for --trace, and says what it wrapped (the sanity checks need it).
   */
  async function installTraceWrappers() {
    const Tone = await tone();
    const transport = Tone.getTransport();
    const raw = Tone.getContext().rawContext;
    const trace = window.__goldenTrace;
    trace.now = () => raw.currentTime;
    const log = (event) => {
      if (!trace.recording) return;
      trace.events.push({
        ...event,
        now: raw.currentTime,
        wall: performance.now(),
      });
    };
    // Tone emits these with the audio time they take effect at; 'loop'
    // fires while ticks are processed, a lookAhead before the seam.
    for (const name of ['start', 'stop', 'pause', 'loop']) {
      transport.on(name, (time) =>
        log({
          type: 'transport',
          name,
          time,
          ticks: transport.getTicksAtTime(time),
        }),
      );
    }
    for (const name of ['start', 'pause', 'stop']) {
      const original = transport[name];
      transport[name] = function (...args) {
        log({ type: 'transport-call', name, ticks: this.ticks });
        return original.apply(this, args);
      };
    }
    store().subscribe((state, prev) => {
      if (
        state.isPlaying === prev.isPlaying &&
        state.isCountingIn === prev.isCountingIn
      ) {
        return;
      }
      log({
        type: 'store',
        isPlaying: state.isPlaying,
        isCountingIn: state.isCountingIn,
        position: state.position,
      });
    });
    // The metronome and the count-in are the only MembraneSynths.
    const membrane = Tone.MembraneSynth.prototype;
    const trigger = membrane.triggerAttackRelease;
    membrane.triggerAttackRelease = function (note, duration, time, velocity) {
      const when = time === undefined ? this.now() : this.toSeconds(time);
      const countingIn = store().getState().isCountingIn;
      log({
        type: 'click',
        note,
        time: when,
        countingIn,
        tick: transport.getTicksAtTime(when),
      });
      trace.scope.push(countingIn ? 'countin' : 'metronome');
      try {
        return trigger.call(this, note, duration, time, velocity);
      } finally {
        trace.scope.pop();
      }
    };
    const { trackEngineRegistry } = await app(
      '/src/daw/hooks/usePlaybackEngine.ts',
    );
    const tracks = store().getState().tracks;
    // Each adapter call gets a number; the native calls made inside it
    // (source starts and stops, pitch changes, envelope gates) carry it, so
    // each can be measured against the time of the note it was made for.
    let seq = 0;
    const adapters = [];
    for (const [trackId, entry] of trackEngineRegistry) {
      const instrument = entry.instrument;
      if (!instrument) continue;
      const track = tracks.find((t) => t.id === trackId)?.name ?? trackId;
      const fns = [];
      for (const fn of ['noteOn', 'noteOff', 'allNotesOff', 'panic']) {
        const original = instrument[fn];
        if (typeof original !== 'function') continue;
        fns.push(fn);
        instrument[fn] = function (...args) {
          let time = null;
          if (fn === 'noteOn') time = args[2] ?? null;
          if (fn === 'noteOff') time = args[1] ?? null;
          // allNotesOff(time?) and panic(time?): undefined means now.
          if (fn === 'allNotesOff' || fn === 'panic') time = args[0] ?? null;
          const call = { seq: ++seq, fn, time };
          log({
            type: 'adapter',
            seq: call.seq,
            fn,
            track,
            instrument: entry.instrumentType,
            note: args[0] ?? null,
            time,
            tick: time === null ? null : transport.getTicksAtTime(time),
          });
          const outer = trace.call;
          trace.call = call;
          trace.scope.push(`adapter:${entry.instrumentType}`);
          try {
            return original.apply(this, args);
          } finally {
            trace.scope.pop();
            trace.call = outer;
          }
        };
      }
      adapters.push({ track, instrument: entry.instrumentType, fns });
    }
    // Oracle voices start their oscillators at once, free-running, and gate
    // them with these envelopes, so the envelope's time is when a note is
    // heard: trigger(target, velocity, ctx, time), release(target, ctx,
    // time), forceStop(target, ctx).
    const { Envelope } = await app('/src/daw/oracle-synth/audio/Envelope.ts');
    const gates = [];
    for (const fn of ['trigger', 'release', 'forceStop']) {
      const original = Envelope?.prototype?.[fn];
      if (typeof original !== 'function') continue;
      gates.push(fn);
      Envelope.prototype[fn] = function (...args) {
        if (trace.recording) {
          const ctx = fn === 'trigger' ? args[2] : args[1];
          let time = null;
          if (fn === 'trigger') time = args[3] ?? null;
          if (fn === 'release') time = args[2] ?? null;
          trace.events.push({
            type: 'gate',
            fn,
            call: trace.call?.seq ?? null,
            time,
            now: ctx?.currentTime ?? raw.currentTime,
            wall: performance.now(),
          });
        }
        return original.apply(this, args);
      };
    }
    const { AudioClipScheduler } = await app(
      '/src/daw/audio/AudioClipScheduler.ts',
    );
    // Tone's one-shot sources (Tone.Player, the drum and sampler voices) stop
    // by setting their own gain to 0 at the stop time (after a fade-out) and
    // call the native stop() only later, from a context timeout, so the
    // native stop is logged late. Their own stop time is logged here,
    // against the native source they started.
    const ToneSource = Tone.ToneBufferSource?.prototype;
    if (ToneSource?.start && ToneSource._stopGain) {
      const toneStart = ToneSource.start;
      ToneSource.start = function (...args) {
        const outer = trace.toneOwner;
        trace.toneOwner = this;
        try {
          return toneStart.apply(this, args);
        } finally {
          trace.toneOwner = outer;
        }
      };
      const stopGain = ToneSource._stopGain;
      ToneSource._stopGain = function (time) {
        const result = stopGain.call(this, time);
        const id = trace.toneIds.get(this);
        if (trace.recording && id !== undefined) {
          const at = this.toSeconds(time);
          trace.events.push({
            type: 'tone-stop',
            id,
            when: at + this.toSeconds(this._fadeOut ?? 0),
            now: raw.currentTime,
            wall: performance.now(),
          });
        }
        return result;
      };
    }
    const cancelAll = AudioClipScheduler.prototype.cancelAll;
    AudioClipScheduler.prototype.cancelAll = function (...args) {
      log({ type: 'clip-cancel' });
      return cancelAll.apply(this, args);
    };
    return { adapters, envelopeFns: gates };
  }

  /**
   * The loudest level (dBFS) each track's own meter tap showed while the
   * trace ran, polled every 25 ms: whether each track is heard at all.
   */
  async function sampleTrackPeaks(isDone) {
    const { trackEngineRegistry } = await app(
      '/src/daw/hooks/usePlaybackEngine.ts',
    );
    const peaks = {};
    const scratch = new Float32Array(256);
    while (!isDone()) {
      for (const t of store().getState().tracks) {
        const analyser = trackEngineRegistry
          .get(t.id)
          ?.trackEngine.getAnalyserNode();
        if (!analyser) continue;
        analyser.getFloatTimeDomainData(scratch);
        let peak = peaks[t.name] ?? 0;
        for (const v of scratch) peak = Math.max(peak, Math.abs(v));
        peaks[t.name] = peak;
      }
      await sleep(25);
    }
    return Object.fromEntries(
      Object.entries(peaks).map(([name, peak]) => [
        name,
        peak > 1e-6 ? Math.round(2000 * Math.log10(peak)) / 100 : -120,
      ]),
    );
  }

  /**
   * Count-in, play, pause, resume and loop laps, all logged. The plan's
   * `steps` say what to do, in order; without them the fixed plan runs
   * (see traceSteps). Steps:
   *   { do: 'play' }            Play (with the plan's count-in, if any)
   *   { do: 'untilTick', tick, laps? }  wait until the transport plays at
   *                             or past `tick`, after `laps` loop events
   *   { do: 'pause' }           Pause
   *   { do: 'wait', ms }        wait
   *   { do: 'resume' }          Play again, without count-in
   *   { do: 'seek', tick }      seek while playing, as the ruler does
   *   { do: 'editNote', track, index, toTick, clip? }  move note `index`
   *                             of the track's MIDI clip (the first, or the
   *                             one with id `clip`) to song tick `toTick`
   *                             through the store, as the piano roll does
   *   { do: 'untilSeconds', seconds }  wait until `seconds` after Play
   *   { do: 'stop' }            Stop
   */
  async function runTracePlan(plan) {
    const Tone = await tone();
    const transport = Tone.getTransport();
    const raw = Tone.getContext().rawContext;
    const trace = window.__goldenTrace;
    const s = () => store().getState();
    const mark = (label) =>
      trace.events.push({
        type: 'mark',
        label,
        now: raw.currentTime,
        wall: performance.now(),
      });
    const steps = plan.steps ?? [
      { do: 'play' },
      { do: 'untilTick', tick: plan.pauseAtTick },
      { do: 'pause' },
      { do: 'wait', ms: plan.pauseMs },
      { do: 'resume' },
      { do: 'untilSeconds', seconds: plan.seconds },
      { do: 'stop' },
    ];
    const playFromTick = plan.playFromTick ?? 0;
    s().setPosition(playFromTick);
    s().setLastSeekPosition(playFromTick);
    s().setCountInBars(plan.countInBars ?? 0);
    // Plain store writes; the transport takes the position when Play starts.
    await until(
      () =>
        s().position === playFromTick &&
        s().countInBars === (plan.countInBars ?? 0) &&
        !s().isPlaying,
      2000,
      10,
    );
    trace.events.length = 0;
    trace.recording = true;
    const liveTrackPeakDb = sampleTrackPeaks(() => !trace.recording);
    let started = performance.now();
    // What each step did, for the analysis (where it was reached, which
    // note moved).
    const done = [];
    const loops = () =>
      trace.events.filter((e) => e.type === 'transport' && e.name === 'loop')
        .length;
    const runStep = async (step) => {
      switch (step.do) {
        case 'play':
          started = performance.now();
          mark('play');
          s().play();
          return {};
        case 'untilTick': {
          const from = loops();
          const reached = await until(
            () =>
              transport.state === 'started' &&
              loops() - from >= (step.laps ?? 0) &&
              transport.ticks >= step.tick,
            30_000,
            5,
          );
          return { reached, ticks: transport.ticks };
        }
        case 'pause':
          mark('pause');
          s().pause();
          return {};
        case 'wait':
          await sleep(step.ms);
          return {};
        case 'resume':
          s().setCountInBars(0);
          mark('resume');
          s().play();
          return {};
        case 'seek': {
          const { seekTo } = await app('/src/daw/hooks/useTransport.ts');
          const fromTicks = transport.ticks;
          mark('seek');
          seekTo(step.tick);
          return { fromTicks };
        }
        case 'editNote': {
          const track = s().tracks.find((t) => t.name === step.track);
          const clip = step.clip
            ? track?.midiClips.find((c) => c.id === step.clip)
            : track?.midiClips[0];
          const note = clip?.events[step.index];
          if (!note) return { error: `no note ${step.index} on ${step.track}` };
          const events = clip.events.map((e, i) =>
            i === step.index
              ? { ...e, startTick: step.toTick - clip.startTick }
              : e,
          );
          const at = { now: raw.currentTime, wall: performance.now() };
          trace.events.push({ type: 'edit', ...at, track: step.track });
          s().updateMidiClipEvents(track.id, clip.id, events);
          return {
            ...at,
            ticks: transport.ticks,
            pitch: note.note,
            fromTick: clip.startTick + note.startTick,
          };
        }
        case 'untilSeconds':
          await sleep(
            Math.max(0, started + step.seconds * 1000 - performance.now()),
          );
          return {};
        case 'stop': {
          mark('stop');
          const stopAt = trace.events.length;
          s().stop();
          // Tone emits the pause a clock tick after the call; then keep
          // recording 300 ms more, for the stops the voices' own timers make
          // after a panic.
          await until(
            () =>
              trace.events
                .slice(stopAt)
                .some((e) => e.type === 'transport' && e.name === 'pause'),
            3000,
            10,
          );
          await sleep(300);
          return {};
        }
        default:
          return { error: `unknown step ${step.do}` };
      }
    };
    for (const step of steps) {
      done.push({ ...step, ...(await runStep(step)) });
    }
    trace.recording = false;
    const ctx = Tone.getContext();
    const native = raw._nativeContext ?? raw;
    return {
      reachedPause: done
        .filter((d) => d.do === 'untilTick')
        .every((d) => d.reached),
      steps: done,
      liveTrackPeakDb: await liveTrackPeakDb,
      info: {
        sampleRate: native.sampleRate,
        lookAhead: ctx.lookAhead,
        updateInterval: ctx.updateInterval,
        baseLatency: native.baseLatency ?? null,
        outputLatency: native.outputLatency ?? null,
        bpm: s().bpm,
        ppq: transport.PPQ,
        tsNum: s().timeSignatureNumerator,
        tsDen: s().timeSignatureDenominator,
        loop: {
          enabled: s().loopEnabled,
          start: s().loopStart,
          end: s().loopEnd,
        },
        countInBars: plan.countInBars ?? 0,
      },
      events: trace.events.splice(0),
    };
  }

  window.__golden = {
    buildFixture,
    loadFixture,
    waitReady,
    render,
    chainLatency,
    exportWav,
    cancelledExport,
    playheadMoves,
    installTraceWrappers,
    runTracePlan,
    takeWarnings: () => warnings.splice(0),
  };
}

// ── Audio features (node side) ───────────────────────────────────────────

const FLOOR_DB = -120;
const SILENT_DB = -90;
const SILENT_PEAK = 10 ** (SILENT_DB / 20);
const ACTIVE_DB = -60;

const round = (value, digits) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};
const toDb = (amplitude) =>
  amplitude > 1e-6 ? 20 * Math.log10(amplitude) : FLOOR_DB;

function decodeChannels(base64Channels) {
  return base64Channels.map((text) => {
    const bytes = Buffer.from(text, 'base64');
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return new Float32Array(copy.buffer);
  });
}

/**
 * A PCM WAV file (16- or 24-bit, as audioBufferToWav writes it): its format
 * and one Float32Array per channel, scaled back to [-1, 1).
 */
function decodeWav(bytes) {
  const text = (at, n) => bytes.toString('ascii', at, at + n);
  if (text(0, 4) !== 'RIFF' || text(8, 4) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let format = null;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = text(at, 4);
    const size = bytes.readUInt32LE(at + 4);
    const body = at + 8;
    if (id === 'fmt ') {
      format = {
        pcm: bytes.readUInt16LE(body) === 1,
        channels: bytes.readUInt16LE(body + 2),
        sampleRate: bytes.readUInt32LE(body + 4),
        bits: bytes.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      if (!format?.pcm || ![16, 24].includes(format.bits)) {
        throw new Error(`unsupported WAV format ${JSON.stringify(format)}`);
      }
      const width = format.bits / 8;
      const frameBytes = width * format.channels;
      const frames = Math.floor(
        Math.min(size, bytes.length - body) / frameBytes,
      );
      const scale = format.bits === 16 ? 32768 : 8388608;
      const channels = Array.from(
        { length: format.channels },
        () => new Float32Array(frames),
      );
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < format.channels; c++) {
          const offset = body + i * frameBytes + c * width;
          channels[c][i] = bytes.readIntLE(offset, width) / scale;
        }
      }
      return { ...format, frames, channels };
    }
    at = body + size + (size % 2);
  }
  throw new Error('WAV file has no data chunk');
}

/** RMS in dBFS over consecutive windows of `seconds`, one array per channel. */
function windowRms(channels, sampleRate, seconds) {
  const size = Math.max(1, Math.round(seconds * sampleRate));
  return channels.map((data) => {
    const out = [];
    for (let start = 0; start < data.length; start += size) {
      const end = Math.min(data.length, start + size);
      let sum = 0;
      for (let i = start; i < end; i++) sum += data[i] * data[i];
      out.push(round(toDb(Math.sqrt(sum / (end - start))), 1));
    }
    return out;
  });
}

/**
 * Onset times (s) of one signal: a peak envelope (instant attack, 30 ms
 * release, so a low note's waveform ripple cannot re-trigger it) read every
 * 1 ms; an onset is where it rises 9 dB or more above its lowest value of
 * the previous 20 ms (silence before the start counts), reaches `floorDb`,
 * and comes 50 ms or more after the last onset.
 */
function envelopeOnsets(signal, sampleRate, floorDb) {
  const release = Math.exp(-1 / (0.03 * sampleRate));
  const hop = Math.max(1, Math.round(0.001 * sampleRate));
  const levels = [];
  let envelope = 0;
  for (let i = 0; i < signal.length; i++) {
    const a = Math.abs(signal[i]);
    envelope = a > envelope ? a : envelope * release;
    if (i % hop === 0) levels.push(toDb(envelope));
  }
  const onsets = [];
  let last = -Infinity;
  for (let m = 0; m < levels.length; m++) {
    if (levels[m] < floorDb || m - last < 50) continue;
    let quietest = m < 20 ? FLOOR_DB : Infinity;
    for (let k = Math.max(0, m - 20); k < m; k++) {
      quietest = Math.min(quietest, levels[k]);
    }
    if (levels[m] - quietest >= 9) {
      onsets.push(round((m * hop) / sampleRate, 3));
      last = m;
    }
  }
  return onsets;
}

/**
 * Onsets of the mono mix: the full band finds notes that start from
 * silence, a first-difference (treble-weighted) copy finds snares and hats
 * over a ringing kick or pad. The two lists merge; within 25 ms the earlier
 * onset stands.
 */
function detectOnsets(mono, sampleRate) {
  const treble = new Float32Array(mono.length);
  for (let i = 1; i < mono.length; i++) treble[i] = mono[i] - mono[i - 1];
  const all = [
    ...envelopeOnsets(mono, sampleRate, -50),
    ...envelopeOnsets(treble, sampleRate, -60),
  ].sort((a, b) => a - b);
  const merged = [];
  for (const t of all) {
    if (!merged.length || t - merged[merged.length - 1] > 0.025) merged.push(t);
  }
  return merged;
}

const FFT_SIZE = 2048;
const FFT_HOP = 1024;

/** Magnitude spectrum of one frame (radix-2, Hann window). */
function magnitudes(frame) {
  const n = frame.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    re[i] = frame[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(angle * k);
        const wi = Math.sin(angle * k);
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  const mags = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) mags[k] = Math.hypot(re[k], im[k]);
  return mags;
}

/** Spectral centroid, overall (energy-weighted) and per `trackSeconds`. */
function spectralCentroid(mono, sampleRate, trackSeconds = 0.25) {
  const binHz = sampleRate / FFT_SIZE;
  const frames = [];
  for (let start = 0; start + FFT_SIZE <= mono.length; start += FFT_HOP) {
    const frame = mono.subarray(start, start + FFT_SIZE);
    let energy = 0;
    for (let i = 0; i < FFT_SIZE; i++) energy += frame[i] * frame[i];
    if (toDb(Math.sqrt(energy / FFT_SIZE)) < ACTIVE_DB) continue;
    const mags = magnitudes(frame);
    let weighted = 0;
    let total = 0;
    for (let k = 1; k < mags.length; k++) {
      weighted += k * binHz * mags[k];
      total += mags[k];
    }
    if (total > 0) {
      frames.push({
        centre: (start + FFT_SIZE / 2) / sampleRate,
        energy,
        hz: weighted / total,
      });
    }
  }
  const average = (list) => {
    const energy = list.reduce((sum, f) => sum + f.energy, 0);
    return energy > 0
      ? Math.round(list.reduce((sum, f) => sum + f.hz * f.energy, 0) / energy)
      : null;
  };
  const windows = Math.ceil(mono.length / sampleRate / trackSeconds);
  const track = [];
  for (let w = 0; w < windows; w++) {
    track.push(
      average(
        frames.filter(
          (f) =>
            f.centre >= w * trackSeconds && f.centre < (w + 1) * trackSeconds,
        ),
      ),
    );
  }
  return { hz: average(frames), track };
}

/** The features a golden stores for a render. */
function audioFeatures(channels, sampleRate, { full = true } = {}) {
  const length = channels[0]?.length ?? 0;
  let peak = 0;
  const mono = new Float32Array(length);
  for (const data of channels) {
    for (let i = 0; i < length; i++) {
      const value = data[i];
      if (Math.abs(value) > peak) peak = Math.abs(value);
      mono[i] += value / channels.length;
    }
  }
  const threshold = 10 ** (ACTIVE_DB / 20);
  let first = -1;
  let last = -1;
  for (let i = 0; i < length; i++) {
    if (Math.abs(mono[i]) >= threshold) {
      if (first < 0) first = i;
      last = i;
    }
  }
  const centroid = spectralCentroid(mono, sampleRate);
  const features = {
    peak: round(peak, 5),
    peakDb: round(toDb(peak), 2),
    silent: peak < SILENT_PEAK,
    activeSec:
      first < 0
        ? null
        : [round(first / sampleRate, 3), round(last / sampleRate, 3)],
    onsetsSec: detectOnsets(mono, sampleRate),
    centroidHz: centroid.hz,
  };
  if (full) {
    features.centroidTrack = { windowSec: 0.25, hz: centroid.track };
    features.rms20msDb = {
      windowSec: 0.02,
      floorDb: FLOOR_DB,
      channels: windowRms(channels, sampleRate, 0.02),
    };
  } else {
    // Stems keep a coarser level track: one 100 ms RMS, loudest channel.
    const perChannel = windowRms(channels, sampleRate, 0.1);
    features.rms100msDb = {
      windowSec: 0.1,
      floorDb: FLOOR_DB,
      max: perChannel[0].map((_, i) =>
        Math.max(...perChannel.map((c) => c[i])),
      ),
    };
  }
  return features;
}

/** Power-average level (dBFS, loudest channel) of a feature set over [from, to). */
function levelBetween(features, from, to) {
  const rms = features.rms20msDb ?? features.rms100msDb;
  if (!rms) return null;
  const lists = rms.channels ?? [rms.max];
  let best = FLOOR_DB;
  for (const list of lists) {
    const picked = [];
    for (let i = 0; i < list.length; i++) {
      const centre = (i + 0.5) * rms.windowSec;
      if (centre >= from && centre < to) picked.push(10 ** (list[i] / 10));
    }
    if (picked.length) {
      const mean = picked.reduce((a, b) => a + b, 0) / picked.length;
      best = Math.max(best, 10 * Math.log10(Math.max(mean, 1e-12)));
    }
  }
  return round(best, 1);
}

const nearestValue = (list, value) =>
  list.reduce(
    (best, x) =>
      best === null || Math.abs(x - value) < Math.abs(best - value) ? x : best,
    null,
  );

/**
 * The fixture's `probes`, measured on the render, a stem (`stem`) or the
 * exported file (`on: 'export'`).
 */
function measureProbes(probes, render, stems, exported) {
  return (probes ?? []).map((probe) => {
    let source = render;
    if (probe.stem) source = stems?.[probe.stem];
    else if (probe.on === 'export') source = exported;
    const features = source?.features;
    const out = { label: probe.label, kind: probe.kind };
    if (probe.stem) out.stem = probe.stem;
    if (probe.on) out.on = probe.on;
    if (!features) return { ...out, observed: null, note: 'no audio' };
    if (probe.kind === 'onsetNear') {
      // No onset at all says nothing about where this one is: null, so a fix
      // that brings the sound in (even at the wrong time) changes the value.
      if (!features.onsetsSec.length) {
        return { ...out, observed: null, note: 'no onsets' };
      }
      const nearest = nearestValue(features.onsetsSec, probe.sec);
      const offsetMs =
        nearest === null ? null : round((nearest - probe.sec) * 1000, 1);
      return {
        ...out,
        observed: offsetMs !== null && Math.abs(offsetMs) <= probe.tolMs,
        nearestOnsetSec: nearest,
        offsetMs,
      };
    }
    if (probe.kind === 'levelAt') {
      return { ...out, observed: levelBetween(features, probe.from, probe.to) };
    }
    if (probe.kind === 'levelDiff') {
      const a = levelBetween(features, ...probe.a);
      const b = levelBetween(features, ...probe.b);
      // Two silent windows say nothing about the difference being measured.
      if (Math.max(a, b) <= SILENT_DB) {
        return { ...out, observed: null, aDb: a, bDb: b, note: 'both silent' };
      }
      return { ...out, observed: round(a - b, 1), aDb: a, bDb: b };
    }
    if (probe.kind === 'silent') return { ...out, observed: features.silent };
    return { ...out, observed: null, note: `unknown probe kind ${probe.kind}` };
  });
}

/** Plain-language facts for the golden's readers (not compared). */
function describeFacts(result) {
  const facts = [];
  const { render, stems, exported, probes } = result;
  facts.push(
    `an EffectChain with every effect off delays the signal ${result.engine.effectChainLatencyMs} ms; a track passes its own chain and the mastering chain (a send also its return's), so every onset lands about twice that late`,
  );
  if (render.status !== 'ok') {
    facts.push(
      `renderProject at ${result.rate} Hz fails: ${render.error.name}: ${render.error.message}`,
    );
  } else {
    if (render.features.silent) facts.push('the whole bounce is silent');
    if (render.repeatable === false) {
      facts.push(
        `three renders of the same session differ (up to ${render.repeatMaxDeltaDb} dB in a 20 ms window)`,
      );
    }
  }
  if (render.timingDependent?.length) {
    const names = render.timingDependent;
    const instruments = result.timingDependentInstruments;
    const why = instruments.map((i) => TIMING_DEPENDENT[i]).join('; ');
    const how =
      render.compare === 'structure'
        ? 'on its status, rate and length only'
        : 'with loose tolerances';
    const stemsToo = stems
      ? `, and ${names.length > 1 ? 'their stems' : 'its stem'} on status, rate and length only`
      : '';
    facts.push(
      `${names.join(', ')} (${instruments.join(', ')}) ${names.length > 1 ? 'render' : 'renders'} differently from run to run (${why}); this mix is compared ${how}${stemsToo}`,
    );
  }
  if (exported.status === 'ok') {
    const sound = exported.features.silent
      ? 'silent'
      : `peak ${exported.features.peakDb} dB, ${exported.features.onsetsSec.length} onsets`;
    facts.push(
      `File > Export Audio (WAV) works on a ${result.liveRate} Hz device: ${exported.wavBits}-bit ${exported.wavSampleRate} Hz, ${exported.seconds} s, ${sound}`,
    );
    if (exported.matchesRender !== null) {
      const same = exported.matchesRender ? 'holds' : 'does NOT hold';
      facts.push(
        `the exported file ${same} the same audio as renderProject at ${exported.wavSampleRate} Hz${render.compare === 'strict' ? '' : ' in this run (the mix varies from run to run)'}`,
      );
    }
  } else {
    facts.push(
      `File > Export Audio (WAV) fails on a ${result.liveRate} Hz device: ${exported.error.name}: ${exported.error.message}`,
    );
  }
  if (!exported.toneContextRestored || !render.toneContextRestored) {
    facts.push(
      "Tone's global context is left on the dead offline context afterwards",
    );
  }
  if (exported.playheadMovesAfter === false) {
    facts.push(
      'after the export, Play no longer moves the playhead (2 s from bar 1): live playback is broken until a reload',
    );
  } else if (exported.playheadMovesAfter === null) {
    facts.push(
      `Play after the export was not measured: ${AUDIO_CLOCK_STOPPED}`,
    );
  }
  const cancelled = result.cancelledExport;
  if (cancelled) {
    facts.push(
      `an export cancelled at ${cancelled.abortedAt ? `${cancelled.abortedAt.stage} ${cancelled.abortedAt.fraction}` : 'no point (no progress came)'} ${cancelled.status === 'aborted' ? 'stops with an AbortError' : `ends ${cancelled.status}${cancelled.error ? ` (${cancelled.error.name})` : ''}`}, makes ${cancelled.filesMade} file(s), ${cancelled.toneContextRestored ? 'gives' : 'does NOT give'} Tone its live context back, and Play ${cancelled.playheadMovesAfter === null ? 'was not measured' : cancelled.playheadMovesAfter ? 'still moves the playhead' : 'no longer moves the playhead'} after it`,
    );
  }
  for (const [name, stem] of Object.entries(stems ?? {})) {
    if (stem.status === 'ok' && stem.features.silent) {
      facts.push(`stem "${name}" (${stem.instrument}) renders silent`);
    }
  }
  for (const probe of probes ?? []) {
    facts.push(
      `${probe.label}: ${JSON.stringify(probe.observed)}${probe.note ? ` (${probe.note})` : ''}`,
    );
  }
  for (const track of result.env.ready.instruments) {
    if (track.state === 'loading' || track.state === 'pending') {
      facts.push(
        `live instrument of "${track.name}" (${track.instrument}) was still not in after ${INSTRUMENT_TIMEOUT_MS / 1000} s`,
      );
    }
  }
  // The engine's own error logs during the case (live and offline).
  for (const line of result.env.consoleErrors) {
    facts.push(`the page logged: ${line}`);
  }
  for (const line of result.env.pageErrors) {
    facts.push(`uncaught on the page: ${line}`);
  }
  return facts;
}

// ── Compare ──────────────────────────────────────────────────────────────

const STRICT = {
  peakDb: 0.5,
  rmsDb: 1,
  rmsShare: 0.01,
  onsetMs: 5,
  onsetSlack: 0,
  centroidRel: 0.03,
  probeDb: 1,
};
const LOOSE = {
  peakDb: 6,
  rmsDb: 6,
  rmsShare: 0.1,
  onsetMs: 50,
  onsetSlack: 2,
  centroidRel: 0.25,
  probeDb: 6,
};

/**
 * Instruments whose offline render does not repeat today, and why. A render
 * that holds one beside other tracks is compared with LOOSE tolerances; a
 * render of such tracks alone (a stem, or a session of only them) on its
 * status, sample rate and length only. One update run cannot prove such a
 * render repeats (the first goldens recorded a lucky one), so this is
 * declared, not measured. Remove the entry once the bug is fixed, then
 * rewrite the goldens with --update.
 */
// Empty since milestone 1.11: the Oracle synth's voices are freed when their
// sound ends (onended), not by wall-clock timers, so its renders repeat
// (synth-engine-01).
const TIMING_DEPENDENT = {};

/** How strictly a render can be compared: 'strict', 'loose' or 'structure'. */
const LEVELS = ['strict', 'loose', 'structure'];
const looser = (a = 'strict', b = 'strict') =>
  LEVELS[Math.max(LEVELS.indexOf(a), LEVELS.indexOf(b))];

/** The tracks a render holds (heard, with notes or clips) and its compare level. */
function renderLevel(tracks) {
  const soloed = tracks.some((t) => t.solo);
  const heard = tracks.filter(
    (t) =>
      !t.mute &&
      (!soloed || t.solo) &&
      ((t.audioClips ?? []).length > 0 ||
        (t.midiClips ?? []).some((c) => c.events?.startTickDeltas?.length)),
  );
  const unstable = heard.filter((t) => TIMING_DEPENDENT[t.instrument]);
  if (!unstable.length) return { compare: 'strict', timingDependent: [] };
  return {
    compare: unstable.length === heard.length ? 'structure' : 'loose',
    timingDependent: unstable.map((t) => t.name),
  };
}

/** The level a golden and this run's result are compared at. */
function levelOf(golden, actual) {
  const level = looser(golden?.compare, actual?.compare);
  // A render that did not repeat when the golden was written: loose at most.
  return golden?.repeatable === false ? looser(level, 'loose') : level;
}

/** RMS windows louder than -60 dB in either run that differ by more than the tolerance. */
function rmsDifference(golden, actual, tolDb) {
  let active = 0;
  let off = 0;
  let maxDelta = 0;
  const pairs = golden.map((list, c) => [list, actual[c] ?? []]);
  for (const [a, b] of pairs) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const x = a[i] ?? FLOOR_DB;
      const y = b[i] ?? FLOOR_DB;
      if (Math.max(x, y) < ACTIVE_DB) continue;
      active++;
      const delta = Math.abs(x - y);
      maxDelta = Math.max(maxDelta, delta);
      if (delta > tolDb) off++;
    }
  }
  return { active, off, maxDelta: round(maxDelta, 1) };
}

function compareFeatures(at, golden, actual, tol, diffs) {
  const add = (what, g, a, note) =>
    diffs.push({ at: `${at}.${what}`, golden: g, actual: a, note });
  if (golden.silent !== actual.silent)
    add('silent', golden.silent, actual.silent);
  if (!golden.silent || !actual.silent) {
    if (Math.abs(golden.peakDb - actual.peakDb) > tol.peakDb) {
      add('peakDb', golden.peakDb, actual.peakDb, `tolerance ${tol.peakDb} dB`);
    }
  }
  const g = golden.onsetsSec;
  const a = actual.onsetsSec;
  const moved = g.filter((t) => {
    const near = nearestValue(a, t);
    return near === null || Math.abs(near - t) * 1000 > tol.onsetMs;
  });
  if (
    Math.abs(g.length - a.length) > tol.onsetSlack ||
    moved.length > tol.onsetSlack
  ) {
    add(
      'onsetsSec',
      g,
      a,
      `${g.length} vs ${a.length} onsets; ${moved.length} golden onsets have none within ${tol.onsetMs} ms`,
    );
  }
  if (golden.centroidHz !== null || actual.centroidHz !== null) {
    const base = Math.max(1, Math.abs(golden.centroidHz ?? 0));
    if (
      golden.centroidHz === null ||
      actual.centroidHz === null ||
      Math.abs(golden.centroidHz - actual.centroidHz) / base > tol.centroidRel
    ) {
      add(
        'centroidHz',
        golden.centroidHz,
        actual.centroidHz,
        `tolerance ${tol.centroidRel * 100}%`,
      );
    }
  }
  const gRms =
    golden.rms20msDb?.channels ??
    (golden.rms100msDb ? [golden.rms100msDb.max] : null);
  const aRms =
    actual.rms20msDb?.channels ??
    (actual.rms100msDb ? [actual.rms100msDb.max] : null);
  if (gRms && aRms) {
    const rms = rmsDifference(gRms, aRms, tol.rmsDb);
    // At most rmsShare of the active windows, rounded down: a short render
    // with under 100 active windows must match in every one.
    if (rms.off > Math.floor(rms.active * tol.rmsShare)) {
      add(
        'rms',
        null,
        null,
        `${rms.off} of ${rms.active} active windows differ by more than ${tol.rmsDb} dB (max ${rms.maxDelta} dB)`,
      );
    }
  }
}

/** One render (mix or stem) against its golden, at `level` (see LEVELS). */
function compareRender(at, golden, actual, level, diffs) {
  if (!golden || !actual) {
    diffs.push({
      at,
      golden: Boolean(golden),
      actual: Boolean(actual),
      note: 'missing',
    });
    return;
  }
  if (golden.status !== actual.status) {
    diffs.push({
      at: `${at}.status`,
      golden: golden.status,
      actual: actual.status,
      note: actual.error?.message,
    });
    return;
  }
  if (golden.status !== 'ok') {
    if (golden.error?.name !== actual.error?.name) {
      diffs.push({
        at: `${at}.error`,
        golden: golden.error,
        actual: actual.error,
      });
    }
  } else {
    for (const key of ['sampleRate', 'length', 'channels']) {
      if (golden[key] !== actual[key]) {
        diffs.push({
          at: `${at}.${key}`,
          golden: golden[key],
          actual: actual[key],
        });
      }
    }
    if (level !== 'structure') {
      compareFeatures(
        `${at}.features`,
        golden.features,
        actual.features,
        level === 'strict' ? STRICT : LOOSE,
        diffs,
      );
    }
  }
  if (golden.toneContextRestored !== actual.toneContextRestored) {
    diffs.push({
      at: `${at}.toneContextRestored`,
      golden: golden.toneContextRestored,
      actual: actual.toneContextRestored,
    });
  }
}

function compareCase(golden, actual) {
  const diffs = [];
  const gLatency = golden.engine?.effectChainLatencyMs;
  const aLatency = actual.engine?.effectChainLatencyMs;
  if (!(Math.abs(gLatency - aLatency) <= 0.5)) {
    diffs.push({
      at: 'engine.effectChainLatencyMs',
      golden: gLatency,
      actual: aLatency,
    });
  }
  const mixLevel = levelOf(golden.render, actual.render);
  compareRender('render', golden.render, actual.render, mixLevel, diffs);
  const stemNames = new Set([
    ...Object.keys(golden.stems ?? {}),
    ...Object.keys(actual.stems ?? {}),
  ]);
  const stemLevel = (name) =>
    levelOf(golden.stems?.[name], actual.stems?.[name]);
  for (const name of stemNames) {
    compareRender(
      `stems.${name}`,
      golden.stems?.[name],
      actual.stems?.[name],
      stemLevel(name),
      diffs,
    );
  }
  // File > Export Audio: the outcome, the file, and the audio in it, at the
  // mix's level (the export renders the same mix). Whether it equals the
  // render is only stable where the render repeats.
  const g = golden.export ?? {};
  const a = actual.export ?? {};
  for (const key of [
    'status',
    'filename',
    'bytes',
    'wavSampleRate',
    'wavChannels',
    'wavBits',
    'length',
    'seconds',
    'matchesRender',
    'toneContextRestored',
    'playheadMovesAfter',
  ]) {
    if (key === 'matchesRender' && mixLevel !== 'strict') continue;
    // Not measured: the live clock did not run (renderCase's control).
    if (key === 'playheadMovesAfter' && a[key] === null) continue;
    if (g[key] !== a[key])
      diffs.push({ at: `export.${key}`, golden: g[key], actual: a[key] });
  }
  if (g.error?.name !== a.error?.name) {
    diffs.push({
      at: 'export.error',
      golden: g.error ?? null,
      actual: a.error ?? null,
    });
  }
  if (g.features && a.features) {
    if (mixLevel !== 'structure') {
      compareFeatures(
        'export.features',
        g.features,
        a.features,
        mixLevel === 'strict' ? STRICT : LOOSE,
        diffs,
      );
    }
  } else if (Boolean(g.features) !== Boolean(a.features)) {
    diffs.push({
      at: 'export.features',
      golden: Boolean(g.features),
      actual: Boolean(a.features),
      note: 'missing',
    });
  }
  // A cancelled export is held to what it must do, not to the golden.
  if (actual.cancelledExport) {
    const c = actual.cancelledExport;
    const seen = { ...c, errorName: c.error?.name ?? null };
    for (const [key, want] of Object.entries(CANCEL_EXPECTED)) {
      if (key === 'playheadMovesAfter' && seen[key] === null) continue;
      if (seen[key] !== want) {
        diffs.push({
          at: `cancelledExport.${key}`,
          golden: want,
          actual: seen[key],
        });
      }
    }
  }
  // The live instruments the case ran with: a CDN outage or a new init
  // failure shows here by name, not only as audio differences.
  if (golden.instrumentsReady !== actual.instrumentsReady) {
    diffs.push({
      at: 'instrumentsReady',
      golden: golden.instrumentsReady,
      actual: actual.instrumentsReady,
    });
  }
  const states = (list) =>
    Object.fromEntries((list ?? []).map((t) => [t.name, t.state]));
  const gStates = states(golden.instruments);
  const aStates = states(actual.instruments);
  for (const name of new Set([
    ...Object.keys(gStates),
    ...Object.keys(aStates),
  ])) {
    if (gStates[name] !== aStates[name]) {
      diffs.push({
        at: `instruments.${name}`,
        golden: gStates[name] ?? null,
        actual: aStates[name] ?? null,
      });
    }
  }
  // Error logs and uncaught errors, as sets of lines.
  for (const key of ['consoleErrors', 'pageErrors']) {
    const was = golden[key] ?? [];
    const now = actual[key] ?? [];
    const gone = was.filter((line) => !now.includes(line));
    const added = now.filter((line) => !was.includes(line));
    if (gone.length || added.length) {
      diffs.push({
        at: key,
        golden: gone,
        actual: added,
        note: 'lines only in the golden → lines only in this run',
      });
    }
  }
  // Probes at the level of the render they measure; none on a render that
  // is compared on its structure only.
  (golden.probes ?? []).forEach((probe, i) => {
    const level = probe.stem ? stemLevel(probe.stem) : mixLevel;
    if (level === 'structure') return;
    const tol = level === 'strict' ? STRICT : LOOSE;
    const observed = actual.probes?.[i]?.observed;
    let same = probe.observed === observed;
    if (typeof probe.observed === 'number' && typeof observed === 'number') {
      // Two levels both below -60 dB are equally inaudible.
      same =
        Math.abs(probe.observed - observed) <= tol.probeDb ||
        (probe.kind === 'levelAt' &&
          Math.max(probe.observed, observed) < ACTIVE_DB);
    }
    if (!same)
      diffs.push({
        at: `probes[${i}]`,
        golden: probe.observed,
        actual: observed,
        note: probe.label,
      });
  });
  return diffs;
}

// ── Files ────────────────────────────────────────────────────────────────

/** JSON with arrays of numbers (and nulls) kept on one line. */
function formatJson(value, indent = '') {
  const next = `${indent}  `;
  if (Array.isArray(value)) {
    const flat = value.every((v) => v === null || typeof v !== 'object');
    if (flat && !value.some((v) => typeof v === 'string')) {
      return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
    }
    if (!value.length) return '[]';
    return `[\n${value.map((v) => next + formatJson(v, next)).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (!entries.length) return '{}';
    return `{\n${entries
      .map(([k, v]) => `${next}${JSON.stringify(k)}: ${formatJson(v, next)}`)
      .join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function writeWav(file, channels, sampleRate) {
  const frames = channels[0].length;
  const bytes = Buffer.alloc(44 + frames * channels.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + frames * channels.length * 2, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(channels.length, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * channels.length * 2, 28);
  bytes.writeUInt16LE(channels.length * 2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(frames * channels.length * 2, 40);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (const data of channels) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      bytes.writeInt16LE(Math.round(sample * 32767), offset);
      offset += 2;
    }
  }
  writeFileSync(file, bytes);
}

function loadFixtures(dir, names) {
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort()
    : [];
  const fixtures = files.map((file) => ({
    name: basename(file, '.json'),
    session: JSON.parse(readFileSync(join(dir, file), 'utf8')),
  }));
  if (!names) return fixtures;
  const wanted = names.split(',');
  const missing = wanted.filter((n) => !fixtures.some((f) => f.name === n));
  if (missing.length)
    throw new Error(`unknown fixture(s): ${missing.join(', ')}`);
  return fixtures.filter((f) => wanted.includes(f.name));
}

// ── Pages ────────────────────────────────────────────────────────────────

/**
 * One error line as goldens store it: the first line, without URLs (the
 * dev server's module URLs carry version hashes), at most 240 characters.
 */
const errorLine = (text) =>
  String(text)
    .split('\n')[0]
    .replace(/https?:\/\/\S+/g, '')
    .slice(0, 240);

/** Distinct error lines, in order of first appearance. */
const errorLines = (list) => [...new Set(list.map(errorLine))];

/**
 * A page on the editor with the live engine running at `rate` (null: the
 * browser's own). `block` lists hosts whose requests fail, as when a CDN is
 * down (--block, to see how a case reports instruments that never load).
 */
async function editorPage(
  browser,
  base,
  profile,
  { rate, trace = false, legacy = false, block = [] },
) {
  const opened = await newPage(browser, profile, { probes: false });
  const { page } = opened;
  if (block.length) {
    await opened.context.route(
      (url) => block.includes(url.hostname),
      (route) => route.abort('internetdisconnected'),
    );
  }
  const consoleErrors = [];
  page.on('console', (message) => {
    const text = message.text();
    // The audio failures this suite records log through console.error.
    if (
      message.type() === 'error' &&
      /^\[(Audio|renderProject|SoundFont|reverb-ir|AudioClipScheduler)/.test(
        text,
      )
    ) {
      consoleErrors.push(errorLine(text));
    }
  });
  if (rate) await page.addInitScript(forceSampleRate, rate);
  if (trace) await page.addInitScript(installTraceProbes);
  if (legacy) {
    // The old scheduler, chosen before the app boots (usePlaybackEngine
    // reads the flag once).
    await page.addInitScript(() => {
      try {
        localStorage.setItem('ma:daw:legacyScheduler', '1');
      } catch {
        /* storage blocked: the run's checks show the default scheduler */
      }
    });
  }
  await page.addInitScript(installDevModules);
  await openEditor(page, base, '?new=1');
  await startAudio(page);
  await page.evaluate(installPageHelpers);
  return { ...opened, consoleErrors };
}

async function renderCase(browser, base, fixture, rate, options) {
  const { profile, update, wavDir, block } = options;
  const golden = fixture.session.golden ?? {};
  const range = golden.range ?? 'project';
  const { context, page, errors, consoleErrors } = await editorPage(
    browser,
    base,
    profile,
    { rate, block },
  );
  try {
    // The control for the Play check after the export: whether the live
    // clock runs at all here, before any fixture, render or export.
    const liveClock = await audioClock(page);
    const loaded = await page.evaluate(
      ([session, audio]) => window.__golden.loadFixture(session, audio),
      [fixture.session, golden.audio ?? {}],
    );
    const ready = await page.evaluate(
      (ms) => window.__golden.waitReady(ms),
      INSTRUMENT_TIMEOUT_MS,
    );
    const renderOnce = (soloTrackId) =>
      page.evaluate((args) => window.__golden.render(args), {
        range,
        sampleRate: rate,
        soloTrackId,
        timeoutMs: RENDER_TIMEOUT_MS,
      });
    const digest = (raw, { full = true, name = '' } = {}) => {
      if (raw.status !== 'ok') return raw;
      const channels = decodeChannels(raw.channels);
      if (wavDir) {
        writeWav(
          join(wavDir, `${fixture.name}@${rate}${name}.wav`),
          channels,
          raw.sampleRate,
        );
      }
      return {
        status: 'ok',
        sampleRate: raw.sampleRate,
        length: raw.length,
        channels: channels.length,
        durationSec: round(raw.length / raw.sampleRate, 4),
        toneContextRestored: raw.toneContextRestored,
        wallMs: raw.wallMs,
        features: audioFeatures(channels, raw.sampleRate, { full }),
      };
    };

    const tracks = fixture.session.data.tracks;
    const render = { ...digest(await renderOnce()), ...renderLevel(tracks) };
    if (update && render.status === 'ok') {
      // Two more renders of the same session say whether it repeats. Only
      // a render that does is compared strictly; a timing-dependent one is
      // not trusted to, whatever these show (see TIMING_DEPENDENT).
      let repeatable = true;
      let maxDelta = 0;
      for (const k of [1, 2]) {
        const again = digest(await renderOnce(), { name: `-repeat${k}` });
        if (again.status !== 'ok') {
          repeatable = false;
          continue;
        }
        const diffs = [];
        compareFeatures(
          'repeat',
          render.features,
          again.features,
          STRICT,
          diffs,
        );
        if (diffs.length) repeatable = false;
        const rms = rmsDifference(
          render.features.rms20msDb.channels,
          again.features.rms20msDb.channels,
          0,
        );
        maxDelta = Math.max(maxDelta, rms.maxDelta);
      }
      render.repeatable = repeatable;
      render.repeatMaxDeltaDb = maxDelta;
      if (!repeatable) render.compare = looser(render.compare, 'loose');
    }

    let stems = null;
    if (golden.stems) {
      stems = {};
      for (const track of tracks) {
        const raw = await renderOnce(track.id);
        const stem = digest(raw, { full: false, name: `-${track.name}` });
        stems[track.name] = {
          instrument: track.instrument,
          ...stem,
          ...renderLevel([{ ...track, solo: false }]),
        };
      }
    }
    const effectChainLatencyMs = await page.evaluate(
      (r) => window.__golden.chainLatency(r),
      rate,
    );
    // Last: a failed export leaves Tone on the dead offline context, which
    // the Play check after it shows.
    const exported = digestExport(
      await page.evaluate((args) => window.__golden.exportWav(args), {
        range,
        timeoutMs: RENDER_TIMEOUT_MS,
      }),
      render,
      wavDir ? join(wavDir, `${fixture.name}@${rate}-export.wav`) : null,
    );
    // Null (not measured) when the control failed: a stopped clock never
    // moves the playhead, export or not.
    exported.playheadMovesAfter = liveClock.runs
      ? await page.evaluate(() => window.__golden.playheadMoves())
      : null;
    // One fixture also cancels an export half-way: it must stop with an
    // AbortError, make no file, give Tone its live context back and leave
    // Play working.
    let cancelledExport;
    if (fixture.name === CANCEL_FIXTURE) {
      cancelledExport = await page.evaluate(
        (args) => window.__golden.cancelledExport(args),
        { range, timeoutMs: RENDER_TIMEOUT_MS },
      );
      cancelledExport.playheadMovesAfter = liveClock.runs
        ? await page.evaluate(() => window.__golden.playheadMoves())
        : null;
    }
    const probes = measureProbes(golden.probes, render, stems, exported);
    const result = {
      fixture: fixture.name,
      rate,
      liveRate: loaded.liveRate,
      about: golden.about,
      range,
      engine: { effectChainLatencyMs },
      render,
      stems,
      exported,
      ...(cancelledExport ? { cancelledExport } : {}),
      probes,
      timingDependentInstruments: [
        ...new Set(
          tracks
            .filter((t) => render.timingDependent?.includes(t.name))
            .map((t) => t.instrument),
        ),
      ],
      env: {
        ready,
        liveClock,
        consoleErrors: errorLines(consoleErrors),
        pageErrors: errorLines(errors),
        warnings: await page.evaluate(() => window.__golden.takeWarnings()),
      },
    };
    result.facts = describeFacts(result);
    return result;
  } finally {
    await context.close();
  }
}

/**
 * The exported WAV file, decoded and measured like a render: its format,
 * length and audio features, and whether it holds the same audio as the
 * render (same rate and length, features equal within the strict
 * tolerances, which 16-bit rounding stays well inside).
 */
function digestExport(raw, render, wavFile) {
  if (raw.status !== 'ok') return raw;
  const bytes = Buffer.from(raw.wav, 'base64');
  if (wavFile) writeFileSync(wavFile, bytes);
  const wav = decodeWav(bytes);
  const features = audioFeatures(wav.channels, wav.sampleRate);
  let matchesRender = null;
  if (
    render.status === 'ok' &&
    render.sampleRate === wav.sampleRate &&
    render.length === wav.frames
  ) {
    const diffs = [];
    compareFeatures('render', render.features, features, STRICT, diffs);
    matchesRender = diffs.length === 0;
  }
  return {
    status: 'ok',
    filename: raw.filename,
    bytes: raw.bytes,
    wavSampleRate: wav.sampleRate,
    wavChannels: wav.channels.length,
    wavBits: wav.bits,
    length: wav.frames,
    seconds: round(wav.frames / wav.sampleRate, 4),
    matchesRender,
    toneContextRestored: raw.toneContextRestored,
    wallMs: raw.wallMs,
    features,
  };
}

/** The golden as stored: no wall times or environment noise. */
function goldenOf(result) {
  const strip = (r) => {
    if (!r) return r;
    const rest = { ...r };
    delete rest.wallMs;
    return rest;
  };
  return {
    fixture: result.fixture,
    rate: result.rate,
    about: result.about,
    model: `live AudioContext at ${result.liveRate} Hz (forced), Return A reverb IR decoded at that rate; render = renderProject({ range: '${result.range}', sampleRate: ${result.rate} }); export = exportProjectAudio({ format: 'wav', range: '${result.range}' })`,
    facts: result.facts,
    engine: result.engine,
    render: strip(result.render),
    stems: result.stems
      ? Object.fromEntries(
          Object.entries(result.stems).map(([k, v]) => [k, strip(v)]),
        )
      : undefined,
    export: strip(result.exported),
    ...(result.cancelledExport
      ? { cancelledExport: strip(result.cancelledExport) }
      : {}),
    probes: result.probes,
    instrumentsReady: result.env.ready.complete,
    instruments: result.env.ready.instruments,
    consoleErrors: result.env.consoleErrors,
    pageErrors: result.env.pageErrors,
  };
}

/** --rates for a mode: sample rates in Hz, or (trace) "default". */
function parseRates(text, { allowDefault }) {
  return text.split(',').map((item) => {
    if (allowDefault && item === 'default') return item;
    const rate = Number(item);
    if (!Number.isInteger(rate) || rate < 8000 || rate > 192000) {
      throw new Error(
        `--rates: "${item}" is not a sample rate in Hz (8000-192000)${allowDefault ? ' or "default"' : ''}`,
      );
    }
    return rate;
  });
}

async function runRender({ base, browser, args, outDir }) {
  const fixtures = loadFixtures(fixtureDirOf(args), args.fixture);
  const rates = args.rates
    ? parseRates(args.rates, { allowDefault: false })
    : RENDER_RATES;
  // An offline render does not depend on the device, so render mode runs on
  // one profile; asking for several would silently drop all but the first.
  const profiles = profilesFrom(args, 'small');
  if (profiles.length !== 1) {
    throw new Error(
      `render mode runs on one profile; got --profile=${args.profile} (use --trace for several)`,
    );
  }
  const [profile] = profiles;
  const goldenDir = resolve(args.goldens ?? DEFAULT_GOLDEN_DIR);
  const update = args.update === 'true';
  const wavDir = args.wav === 'true' ? join(outDir, 'wav') : null;
  const block = args.block ? args.block.split(',') : [];
  if (wavDir) mkdirSync(wavDir, { recursive: true });
  if (update) mkdirSync(goldenDir, { recursive: true });
  const report = {
    mode: update ? 'update' : 'compare',
    profile,
    blockedHosts: block,
    cases: [],
  };
  // This run's results in the golden's own shape, to diff by hand.
  const actualDir = join(outDir, 'actual');
  mkdirSync(actualDir, { recursive: true });
  let failed = 0;
  let unready = 0;
  let unmeasured = 0;
  for (const fixture of fixtures) {
    for (const rate of rates) {
      const label = `${fixture.name}@${rate}`;
      process.stdout.write(`${label} … `);
      const result = await renderCase(browser, base, fixture, rate, {
        profile,
        update,
        wavDir,
        block,
      });
      const golden = goldenOf(result);
      const file = join(goldenDir, `${label}.json`);
      const summary = summariseCase(result);
      writeFileSync(
        join(actualDir, `${label}.json`),
        `${formatJson(golden)}\n`,
      );
      const { pageErrors, warnings, ready } = result.env;
      // Instruments still loading when the wait ran out: the case rendered
      // against a broken environment (often the Rhodes CDN), so say so by
      // name rather than leave it to the audio differences.
      const notReady = ready.complete
        ? null
        : `live instruments still loading after ${INSTRUMENT_TIMEOUT_MS / 1000} s: ${ready.instruments
            .filter((t) => t.state === 'loading' || t.state === 'pending')
            .map((t) => `${t.name} (${t.instrument})`)
            .join(', ')}`;
      if (notReady) unready++;
      const { liveClock } = result.env;
      const notMeasured = liveClock.runs
        ? null
        : `export.playheadMovesAfter: ${AUDIO_CLOCK_STOPPED} (the live AudioContext advanced ${liveClock.advancedSec ?? '?'} s in ${liveClock.wallSec ?? '?'} s before the fixture loaded)`;
      if (notMeasured) unmeasured++;
      if (update) {
        if (notReady || notMeasured) {
          failed++;
          console.log(`NOT WRITTEN: ${notReady ?? notMeasured}`);
        } else {
          writeFileSync(file, `${formatJson(golden)}\n`);
          console.log(`written (${summary})`);
        }
        for (const warning of warnings) console.log(`    warning: ${warning}`);
        report.cases.push({
          case: label,
          written: !notReady && !notMeasured,
          summary,
          notReady,
          notMeasured,
          warnings,
          facts: result.facts,
          pageErrors,
        });
        continue;
      }
      if (!existsSync(file)) {
        failed++;
        console.log(`NO GOLDEN (${summary}); run with --update`);
        report.cases.push({
          case: label,
          pass: false,
          note: 'no golden',
          notReady,
          notMeasured,
          warnings,
          facts: result.facts,
          pageErrors,
        });
        continue;
      }
      const diffs = compareCase(JSON.parse(readFileSync(file, 'utf8')), golden);
      if (diffs.length) failed++;
      console.log(
        diffs.length ? `DIFFERS (${diffs.length})` : `same (${summary})`,
      );
      if (notReady) console.log(`    NOT READY: ${notReady}`);
      if (notMeasured) console.log(`    NOT MEASURED: ${notMeasured}`);
      for (const warning of warnings) console.log(`    warning: ${warning}`);
      for (const diff of diffs) {
        console.log(
          `    ${diff.at}: golden ${JSON.stringify(diff.golden)} → now ${JSON.stringify(diff.actual)}${diff.note ? ` (${diff.note})` : ''}`.slice(
            0,
            400,
          ),
        );
      }
      report.cases.push({
        case: label,
        pass: !diffs.length,
        diffs,
        notReady,
        notMeasured,
        warnings,
        facts: result.facts,
        pageErrors,
      });
    }
  }
  const file = writeJson(
    outDir,
    update ? 'render-update' : 'render-compare',
    report,
  );
  console.log(`\nreport: ${file}`);
  if (unready) {
    console.log(
      `${unready} case(s) ran before their live instruments were in (see NOT READY / NOT WRITTEN above); check the network and run again.`,
    );
  }
  if (unmeasured) {
    console.log(
      `${unmeasured} case(s) could not check Play after the export (${update ? 'NOT WRITTEN' : 'NOT MEASURED'} above): ${AUDIO_CLOCK_STOPPED}.`,
    );
  }
  if (failed) {
    console.log(
      update
        ? `${failed} golden(s) not written.`
        : `${failed} case(s) differ from the goldens. If a change is intended, accept it with --update and say so in the PR.`,
    );
    process.exitCode = 1;
  }
}

function summariseCase(result) {
  const parts = [];
  const r = result.render;
  // A render that is not compared strictly says so: "[loose]", "[structure]".
  const level = (x) =>
    x.compare && x.compare !== 'strict' ? ` [${x.compare}]` : '';
  parts.push(
    r.status === 'ok'
      ? `render ok ${r.features.silent ? 'SILENT' : `peak ${r.features.peakDb} dB, ${r.features.onsetsSec.length} onsets`}${r.repeatable === false ? ', NOT REPEATABLE' : ''}${level(r)}`
      : `render ${r.status}: ${r.error.name}`,
  );
  for (const [name, stem] of Object.entries(result.stems ?? {})) {
    parts.push(
      `${name} ${stem.status === 'ok' ? (stem.features.silent ? 'silent' : 'sounds') : stem.status}${level(stem)}`,
    );
  }
  const e = result.exported;
  let exportText = `export ${e.status}: ${e.error?.name}`;
  if (e.status === 'ok') {
    const sound = e.features.silent ? 'SILENT' : `peak ${e.features.peakDb} dB`;
    const same =
      e.matchesRender === null
        ? ''
        : e.matchesRender
          ? ', = render'
          : ', ≠ render';
    exportText = `export ok ${e.wavSampleRate} Hz ${e.seconds} s ${sound}${same}`;
  }
  parts.push(exportText);
  if (!e.toneContextRestored) parts.push('Tone context left offline');
  const c = result.cancelledExport;
  if (c) {
    parts.push(
      `cancel at ${c.abortedAt?.fraction ?? '?'}: ${c.status === 'aborted' ? 'AbortError' : c.status}, ${c.filesMade} files, context ${c.toneContextRestored ? 'restored' : 'NOT restored'}, Play ${c.playheadMovesAfter ? 'moves' : c.playheadMovesAfter === null ? 'not measured' : 'BROKEN'}`,
    );
  }
  return parts.join('; ');
}

// ── Trace analysis (node side) ───────────────────────────────────────────

const median = (values) => {
  const sorted = values
    .filter((v) => v !== null && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return round(
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    1,
  );
};
/** The value furthest from zero (sign kept), or null for an empty list. */
const maxAbs = (values) =>
  values.reduce(
    (best, v) =>
      v === null || (best !== null && Math.abs(v) <= Math.abs(best)) ? best : v,
    null,
  );
const mod = (value, base) => ((value % base) + base) % base;

/** The nearest candidate by wall clock, within `maxMs`. */
function nearestByWall(wall, candidates, maxMs = 250) {
  let best = null;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.wall - wall);
    if (distance <= maxMs && (!best || distance < best.distance)) {
      best = { ...candidate, distance };
    }
  }
  return best;
}

function analyseTrace(raw, session) {
  const { info, events } = raw;
  const spt = 60 / info.bpm / info.ppq;
  const beatTicks = (info.ppq * 4) / info.tsDen;
  const barTicks = beatTicks * info.tsNum;
  const ms = (seconds) => (seconds === null ? null : round(seconds * 1000, 1));
  // A start, stop or value change "at once": at or before the context clock.
  const atOnce = (e) => !(e.when > e.now + 1e-4);

  // What the plan was doing at a moment: the last mark (play, pause,
  // resume, stop) before it.
  const marks = events.filter((e) => e.type === 'mark');
  const markBefore = (wall) => {
    let label = null;
    for (const m of marks) if (m.wall <= wall) label = m.label;
    return label;
  };

  // The transport's own timeline, in audio time: each start and loop begins
  // a run of the beat grid, each pause ends one. Tone emits start and pause
  // from its clock a little after the call that caused them, so each event
  // is paired with that call, whose mark says whether it was Play or the
  // resume, Pause or Stop (the app's Stop pauses the transport too).
  const pendingCalls = { start: [], pause: [] };
  const boundaries = [];
  for (const e of events) {
    if (e.type === 'transport-call') {
      pendingCalls[e.name]?.push(e);
    } else if (e.type === 'transport' && e.name === 'loop') {
      boundaries.push({
        kind: 'loop',
        cause: 'loop',
        t: e.time,
        tick: info.loop.start,
        causeWall: e.wall,
      });
    } else if (e.type === 'transport' && pendingCalls[e.name]) {
      const calls = pendingCalls[e.name];
      while (calls.length && e.wall - calls[0].wall > 250) calls.shift();
      const call = calls.shift() ?? null;
      // A seek while playing restarts the transport from inside Tone (its
      // ticks setter emits stop and start with no call), so an unmatched
      // start right after a seek mark is that seek's.
      const mark = markBefore(call?.wall ?? e.wall);
      const valid =
        e.name === 'start'
          ? ['play', 'resume', 'seek']
          : ['pause', 'stop', 'seek'];
      if (!call && mark !== 'seek') {
        boundaries.push({
          kind: e.name,
          cause: e.name,
          t: e.time,
          tick: Math.round(e.ticks),
          causeWall: e.wall,
        });
        continue;
      }
      boundaries.push({
        kind: e.name,
        cause: valid.includes(mark) ? mark : e.name,
        t: e.time,
        tick: Math.round(e.ticks),
        causeWall: call?.wall ?? e.wall,
      });
    }
  }
  boundaries.sort((a, b) => a.t - b.t);
  // Where the transport really was at each pause: the run it ends, carried
  // forward. The tick Tone reports with its pause event is read a clock tick
  // later, and depending on timing it already shows where the app moved the
  // transport (Stop rewinds it to the last seek point; Pause sets it to the
  // store's playhead, which lags behind); it is kept as eventTick.
  let open = null;
  for (const b of boundaries) {
    if (b.kind !== 'pause') {
      open = b;
      continue;
    }
    if (open) {
      const reported = b.tick;
      b.tick = round(open.tick + (b.t - open.t) / spt, 1);
      if (Math.abs(reported - b.tick) > 1) b.eventTick = reported;
    }
    open = null;
  }
  const gridTime = (run, tick) => run.t + (tick - run.tick) * spt;
  const runAt = (at) => {
    let run = null;
    for (const b of boundaries) {
      if (b.t > at + 1e-6) break;
      run = b.kind === 'pause' ? null : b;
    }
    return run;
  };
  const nextBoundary = (run) =>
    boundaries.find((b) => b.t > run.t + 1e-6) ?? null;
  // The step behind an in-page event (a clip start, a cancel, a note
  // release): the transport call or loop event nearest it by wall clock.
  const causes = boundaries.map((b) => ({
    wall: b.causeWall,
    run: b,
    cause: b.cause,
  }));
  const causeOf = (wall, kinds) =>
    nearestByWall(
      wall,
      causes.filter((c) => kinds.includes(c.cause)),
    );
  const ENDS = ['loop', 'pause', 'stop', 'seek'];
  const endLabel = (cause) => (cause === 'loop' ? 'loopSeam' : cause);
  const runs = boundaries.filter((b) => b.kind !== 'pause');
  // How long a seek may take to silence what played before it (a fade).
  const SEEK_FADE = 0.012;
  // Where a run ends, in ticks: the loop end, where the transport was when
  // paused, or where it was when a seek restarted it.
  const runEndTick = (run) => {
    const next = nextBoundary(run);
    if (!next) return Infinity;
    if (next.kind === 'loop') return info.loop.end;
    if (next.kind === 'pause') return next.tick;
    return run.tick + (next.t - run.t) / spt;
  };
  const placeOnRun = (clip, startAt) => {
    let best = null;
    for (const run of runs) {
      const next = nextBoundary(run);
      if (run.t > startAt + 0.25 || (next && next.t < startAt - 0.25)) {
        continue;
      }
      const tick = Math.max(clip.startTick, run.tick);
      const to = Math.min(clip.startTick + clip.duration, runEndTick(run));
      if (tick >= to) continue;
      const error = startAt - gridTime(run, tick);
      if (!best || Math.abs(error) < Math.abs(best.error)) {
        best = { run, tick, error };
      }
    }
    return best;
  };

  // Audio clips: every source started on a clip's buffer, and its stop.
  const clips = new Map();
  for (const track of session.data.tracks) {
    for (const clip of track.audioClips ?? []) clips.set(clip.id, clip);
  }
  const endedAt = new Map(
    events.filter((e) => e.type === 'src-ended').map((e) => [e.id, e.now]),
  );
  // When a source is silent, from its stops: the last native stop() (a
  // later call replaces an earlier one), the last stop of the Tone source
  // around it (its gain is 0 from then on, though the native stop comes
  // later), and its 'ended', whichever is earliest. Infinity: never stopped.
  const nativeStop = new Map();
  const toneStop = new Map();
  for (const e of events) {
    if (e.type === 'src-stop') nativeStop.set(e.id, Math.max(e.when, e.now));
    if (e.type === 'tone-stop') toneStop.set(e.id, Math.max(e.when, e.now));
  }
  const stopOf = (id) =>
    Math.min(
      nativeStop.get(id) ?? Infinity,
      toneStop.get(id) ?? Infinity,
      endedAt.get(id) ?? Infinity,
    );
  const clipSources = new Map();
  for (const e of events) {
    if (!e.clipId || !clips.has(e.clipId)) continue;
    const source = clipSources.get(e.id);
    if (e.type === 'src-start') clipSources.set(e.id, { start: e, stop: null });
    else if (e.type === 'src-stop' && source && !source.stop) source.stop = e;
  }
  const clipStarts = [...clipSources.values()].map(({ start: e }) => {
    const clip = clips.get(e.clipId);
    let cause = 'scheduled';
    let run = runAt(e.when);
    let tick = clip.startTick;
    const startAt = Math.max(e.when, e.now);
    if (atOnce(e)) {
      // The app starts a clip under the playhead "now": from its play
      // effect (beside the transport start call) or its loop handler.
      const near = causeOf(e.wall, ['play', 'resume', 'loop', 'seek']);
      cause = near?.cause ?? 'unmatched';
      run = near?.run ?? null;
      tick = run ? run.tick : clip.startTick;
    } else {
      // A start scheduled ahead belongs to the run (play, resume, loop lap,
      // seek) whose grid it is nearest: the clip's start on it, or the run's
      // first tick when the clip is already under way there. Runs that begin
      // up to 250 ms after it count, so an early start is still placed.
      const placed = placeOnRun(clip, startAt);
      if (placed) {
        run = placed.run;
        tick = placed.tick;
        cause = tick === run.tick ? run.cause : 'scheduled';
      }
    }
    const expectedOffset =
      (clip.offsetSeconds ?? 0) + (tick - clip.startTick) * spt;
    // Where its audio really ends: its own end (start plus the duration it
    // was given), or an earlier stop() (cancelAll stops at once).
    const ownEnd =
      startAt +
      (e.duration ?? Math.max(0, (e.bufferSec ?? 0) - (e.offset ?? 0)));
    const stopAt = stopOf(e.id);
    // Where it should end: the clip's end on this run's grid, or the loop
    // seam, pause or stop that ends the run first.
    let endCause = null;
    let endErrorMs = null;
    if (run) {
      const clipEnd = gridTime(run, clip.startTick + clip.duration);
      const next = nextBoundary(run);
      const cut = next && next.t <= clipEnd + 1e-6;
      endCause = cut ? endLabel(next.cause) : 'clipEnd';
      endErrorMs = ms(Math.min(ownEnd, stopAt) - (cut ? next.t : clipEnd));
    }
    return {
      clip: e.clipId,
      cause,
      atTick: tick,
      when: round(e.when, 4),
      now: round(e.now, 4),
      offset: round(e.offset ?? 0, 4),
      expectedOffset: round(expectedOffset, 4),
      runT: run ? round(run.t, 4) : null,
      timeErrorMs: run ? ms(startAt - gridTime(run, tick)) : null,
      offsetErrorMs: ms((e.offset ?? 0) - expectedOffset),
      late: e.when > 0 && e.when < e.now,
      naturalEnd: e.naturalEnd === undefined ? null : round(e.naturalEnd, 4),
      endedAt: endedAt.has(e.id) ? round(endedAt.get(e.id), 4) : null,
      endedBy: stopAt < ownEnd ? 'stop()' : 'its own end',
      endCause,
      endErrorMs,
    };
  });
  // Every run (play, resume, loop lap, seek) a clip is heard in should start
  // it once: its own start, or its first tick on the run.
  const clipCoverage = [];
  for (const run of runs) {
    const endTick = runEndTick(run);
    if (!Number.isFinite(endTick)) continue;
    for (const clip of clips.values()) {
      if (clip.muted) continue;
      const from = Math.max(clip.startTick, run.tick);
      const to = Math.min(clip.startTick + clip.duration, endTick);
      if (to - from < 1) continue;
      clipCoverage.push({
        clip: clip.id,
        run: run.cause,
        runT: round(run.t, 4),
        tick: round(from, 1),
        starts: clipStarts.filter(
          (c) => c.clip === clip.id && c.runT === round(run.t, 4),
        ).length,
      });
    }
  }

  // When the clip scheduler cancels (stops every playing clip at once),
  // against the boundary that should end them.
  const clipCancels = events
    .filter((e) => e.type === 'clip-cancel')
    .map((e) => {
      const near = causeOf(e.wall, ['play', 'resume', ...ENDS]);
      return {
        cause: near ? endLabel(near.cause) : 'other',
        errorMs: near ? ms(e.now - near.run.t) : null,
      };
    });

  // Metronome clicks against the beat grid (ticks from the transport).
  const clicks = events
    .filter((e) => e.type === 'click')
    .sort((a, b) => a.time - b.time);
  const metronome = clicks
    .filter((c) => !c.countingIn)
    .map((c) => {
      const phase = mod(c.tick, beatTicks);
      const errorTicks = phase <= beatTicks / 2 ? phase : phase - beatTicks;
      const barPhase = mod(c.tick, barTicks);
      return {
        time: round(c.time, 4),
        tick: round(c.tick, 1),
        errorMs: ms(errorTicks * spt),
        accent: c.note === 'C5',
        onBarLine: Math.min(barPhase, barTicks - barPhase) <= 2,
        run: runAt(c.time)?.cause ?? null,
      };
    });
  const laps = [];
  boundaries.forEach((b, i) => {
    if (b.kind === 'pause') return;
    const next = boundaries[i + 1];
    if (!next) return;
    // A lap ends at the loop end, or where the transport was when paused or
    // a seek moved it.
    const endTick = runEndTick(b);
    const beats = [];
    for (
      let k = Math.ceil(b.tick / beatTicks) * beatTicks;
      k < endTick;
      k += beatTicks
    ) {
      // A beat inside a seek's fade is cut by the seek, so not expected.
      if (next.cause === 'seek' && gridTime(b, k) > next.t - SEEK_FADE) {
        continue;
      }
      beats.push(k);
    }
    const lapClicks = metronome.filter(
      (c) => c.time >= b.t - 0.03 && c.time < next.t - 0.001,
    );
    const onBeat = beats.filter((k) =>
      lapClicks.some((c) => Math.abs(c.time - gridTime(b, k)) <= 0.025),
    ).length;
    laps.push({
      from: b.cause,
      to: endLabel(next.cause),
      fromTick: b.tick,
      toTick: endTick,
      beats: beats.length,
      clicks: lapClicks.length,
      clicksOnBeat: onBeat,
      missedBeats: beats.length - onBeat,
      medianErrorMs: median(lapClicks.map((c) => c.errorMs)),
    });
  });

  // Count-in: its clicks run on the audio clock; the transport then
  // starts from a setTimeout. The downbeat should land one beat after the
  // last click.
  const countInClicks = clicks.filter((c) => c.countingIn);
  let countIn = null;
  if (countInClicks.length) {
    const beatSec = beatTicks * spt;
    const first = countInClicks[0].time;
    const expectedDownbeat = first + info.countInBars * info.tsNum * beatSec;
    const downbeat = boundaries.find((b) => b.kind === 'start' && b.t > first);
    const storeEvents = events.filter((e) => e.type === 'store');
    const countStart = storeEvents.find((e) => e.isCountingIn);
    const playStart = storeEvents.find(
      (e) => e.isPlaying && countStart && e.wall > countStart.wall,
    );
    countIn = {
      clicks: countInClicks.length,
      expectedClicks: info.countInBars * info.tsNum,
      maxGridErrorMs: maxAbs(
        countInClicks.map((c, i) => ms(c.time - (first + i * beatSec))),
      ),
      accentsOnBeatOne: countInClicks.every(
        (c, i) => (c.note === 'C5') === (i % info.tsNum === 0),
      ),
      downbeatErrorMs: downbeat ? ms(downbeat.t - expectedDownbeat) : null,
      timerLateMs:
        countStart && playStart
          ? round(
              playStart.wall -
                countStart.wall -
                info.countInBars * info.tsNum * beatSec * 1000,
              1,
            )
          : null,
    };
  }

  // Instrument adapters: every note-on matched to the note it plays. Each
  // run (play, resume, loop lap, seek) should play every note of the session
  // between its first tick and where it ends, at that run's grid time; a
  // note-on is paired with the nearest such note of its track and pitch
  // (one each, closest pairs first, within 250 ms). A note-on left over is
  // extra (off the grid by more than that, or outside every run: booked
  // after a pause, a stop or a seek), and a note left over is missing.
  const edits = (raw.steps ?? []).filter(
    (step) => step.do === 'editNote' && !step.error,
  );
  const sessionNotes = [];
  for (const track of session.data.tracks) {
    for (const clip of track.midiClips ?? []) {
      if (clip.muted) continue;
      let tick = clip.startTick;
      clip.events.startTickDeltas.forEach((delta, index) => {
        tick += delta;
        sessionNotes.push({
          track: track.name,
          note: clip.events.notes[index],
          tick,
          index,
        });
      });
    }
  }
  const expectedNotes = [];
  for (const run of runs) {
    const endTick = runEndTick(run);
    if (!Number.isFinite(endTick)) continue;
    const next = nextBoundary(run);
    const runEnd = next?.t ?? Infinity;
    // A pause, stop or seek is pressed a lookahead before it takes effect
    // (Tone's transport acts at now + lookAhead). A note due between the
    // press (heard at that moment) and the transport's own end time may be
    // played or dropped: the student has already left that spot.
    let pressed = runEnd;
    if (next && next.kind !== 'loop') {
      const press = marks
        .filter((m) => m.label === next.cause && m.wall <= next.causeWall)
        .at(-1);
      if (press) pressed = Math.min(press.now, runEnd);
    }
    for (const n of sessionNotes) {
      let ticks = [{ tick: n.tick, optional: false }];
      const edit = edits.find(
        (e) =>
          e.track === n.track && e.index === n.index && e.fromTick === n.tick,
      );
      // A moved note: at its old tick on runs that ended before the edit, at
      // its new one on runs that start after it (a lookahead's margin), and
      // either (or neither) on the run it was moved in.
      if (edit && runEnd > edit.now) {
        ticks =
          run.t > edit.now + 0.25
            ? [{ tick: edit.toTick, optional: false }]
            : [
                { tick: n.tick, optional: true },
                { tick: edit.toTick, optional: true },
              ];
      }
      for (const { tick, optional } of ticks) {
        if (tick < run.tick || tick >= endTick) continue;
        const time = gridTime(run, tick);
        expectedNotes.push({
          track: n.track,
          note: n.note,
          tick,
          time,
          run: run.cause,
          optional: optional || time >= pressed,
        });
      }
    }
  }
  const adapterCalls = events.filter((e) => e.type === 'adapter');
  const noteOnCalls = adapterCalls.filter(
    (c) => c.fn === 'noteOn' && c.time !== null,
  );
  const pairs = [];
  for (const call of noteOnCalls) {
    expectedNotes.forEach((x, k) => {
      if (x.track !== call.track || x.note !== call.note) return;
      const distance = Math.abs(call.time - x.time);
      if (distance <= 0.25) pairs.push({ call, k, distance });
    });
  }
  pairs.sort((a, b) => a.distance - b.distance);
  const matchOf = new Map();
  const taken = new Set();
  for (const pair of pairs) {
    if (matchOf.has(pair.call) || taken.has(pair.k)) continue;
    matchOf.set(pair.call, expectedNotes[pair.k]);
    taken.add(pair.k);
  }
  const midi = {};
  const midiOf = (track, instrument) =>
    (midi[track] ??= {
      instrument,
      noteOns: 0,
      errors: [],
      ahead: [],
      late: 0,
      extra: [],
      missing: [],
    });
  for (const call of noteOnCalls) {
    const entry = midiOf(call.track, call.instrument);
    entry.noteOns++;
    const expected = matchOf.get(call);
    if (expected) {
      entry.errors.push(ms(call.time - expected.time));
    } else {
      entry.extra.push({
        note: call.note,
        time: round(call.time, 4),
        tick: call.tick === null ? null : round(call.tick, 1),
        outsideRuns: runAt(call.time) === null,
      });
    }
    entry.ahead.push(ms(call.time - call.now));
    if (call.time < call.now) entry.late++;
  }
  expectedNotes.forEach((x, k) => {
    if (taken.has(k) || x.optional) return;
    const entry = midi[x.track];
    const missing = { note: x.note, tick: x.tick, run: x.run };
    if (entry) entry.missing.push(missing);
    else midiOf(x.track, null).missing.push(missing);
  });
  const midiSummary = Object.fromEntries(
    Object.entries(midi).map(([track, m]) => [
      track,
      {
        instrument: m.instrument,
        noteOns: m.noteOns,
        maxGridErrorMs: maxAbs(m.errors),
        minAheadMs: m.ahead.length ? Math.min(...m.ahead) : null,
        medianAheadMs: median(m.ahead),
        late: m.late,
        extra: m.extra,
        missing: m.missing,
      },
    ]),
  );
  const releases = adapterCalls
    .filter((e) => e.fn === 'allNotesOff' || e.fn === 'panic')
    .map((e) => {
      const near = causeOf(e.wall, ENDS);
      return {
        track: e.track,
        fn: e.fn,
        cause: near ? endLabel(near.cause) : 'other',
        errorMs: near ? ms(e.now - near.run.t) : null,
      };
    });

  // What each adapter does natively for its notes: the calls made inside
  // its noteOn/noteOff/allNotesOff/panic carry that call's number. An
  // Oracle voice starts its oscillators at once on purpose (free-running,
  // silent until the envelope gate opens at the note time), so the gate,
  // not the oscillator start, is when its note is heard; what it does at
  // once that can be heard early is cutting the voice's previous sources and
  // setting the new pitch (synth-engine-02).
  const callBySeq = new Map(adapterCalls.map((c) => [c.seq, c]));
  const native = {};
  const nativeOf = (instrument) =>
    (native[instrument] ??= {
      notes: 0,
      envelopeCalls: 0,
      gateErrors: [],
      releaseErrors: [],
      started: { atNoteTime: 0, atOnce: 0, other: 0 },
      cutAtOnceAhead: [],
      pitchAtOnceAhead: [],
      stopped: {
        atOnceInNoteOn: 0,
        atOnceInOtherCalls: 0,
        scheduledInCalls: 0,
        atOnceLater: 0,
        scheduledLater: 0,
      },
      owned: new Set(),
      stoppedIds: new Set(),
    });
  for (const e of events) {
    if (e.type === 'adapter') {
      if (e.fn === 'noteOn') nativeOf(e.instrument).notes++;
      continue;
    }
    const call = e.call ? (callBySeq.get(e.call) ?? null) : null;
    const timed = call !== null && call.time !== null;
    if (e.type === 'src-start' && call) {
      const n = nativeOf(call.instrument);
      n.owned.add(e.id);
      if (timed && Math.abs(e.when - call.time) < 0.001) n.started.atNoteTime++;
      else if (atOnce(e)) n.started.atOnce++;
      else n.started.other++;
    } else if (e.type === 'src-stop') {
      // A stop inside a note call, or a later one (a timer's) of a source
      // an adapter started.
      const owner =
        call?.instrument ??
        Object.keys(native).find((name) => native[name].owned.has(e.id));
      if (!owner) continue;
      const n = nativeOf(owner);
      n.stoppedIds.add(e.id);
      if (!call) {
        n.stopped[atOnce(e) ? 'atOnceLater' : 'scheduledLater']++;
      } else if (!atOnce(e)) {
        n.stopped.scheduledInCalls++;
      } else if (call.fn === 'noteOn') {
        n.stopped.atOnceInNoteOn++;
        if (timed) n.cutAtOnceAhead.push(ms(call.time - e.now));
      } else {
        n.stopped.atOnceInOtherCalls++;
      }
    } else if (e.type === 'gate' && call) {
      const n = nativeOf(call.instrument);
      n.envelopeCalls++;
      const at = e.time ?? e.now;
      if (timed && e.fn === 'trigger' && call.fn === 'noteOn') {
        n.gateErrors.push(ms(at - call.time));
      }
      if (timed && e.fn === 'release' && call.fn === 'noteOff') {
        n.releaseErrors.push(ms(at - call.time));
      }
    } else if (
      e.type === 'param' &&
      timed &&
      call.fn === 'noteOn' &&
      e.param === 'osc.frequency' &&
      (e.fn === 'value' || atOnce(e))
    ) {
      nativeOf(call.instrument).pitchAtOnceAhead.push(ms(call.time - e.now));
    }
  }
  const adapters = Object.fromEntries(
    Object.entries(native).map(([instrument, n]) => [
      instrument,
      {
        notes: n.notes,
        // When the note is heard: the envelope's attack against the note
        // time and its release against the note-off time (Oracle only).
        gateErrorMs: maxAbs(n.gateErrors),
        releaseErrorMs: maxAbs(n.releaseErrors),
        envelopeCalls: n.envelopeCalls,
        sourcesStarted: n.started,
        // A voice's previous sources stopped at once inside noteOn: a
        // lookahead (this many ms) before the note that replaces them.
        cutAtOnceInNoteOn: {
          count: n.cutAtOnceAhead.length,
          medianAheadMs: median(n.cutAtOnceAhead),
        },
        // Oscillator frequency set at once inside noteOn.
        pitchAtOnceInNoteOn: {
          count: n.pitchAtOnceAhead.length,
          medianAheadMs: median(n.pitchAtOnceAhead),
        },
        sourcesStopped: {
          ...n.stopped,
          notStopped: [...n.owned].filter((id) => !n.stoppedIds.has(id)).length,
        },
      },
    ]),
  );

  // Seek while playing: every buffer source started before the seek (clip
  // audio, drum hits, samples; looping sources are free-running and gated,
  // so their notes are judged instead) must be silent by the seek time plus
  // a 12 ms fade, by its own end or a stop(), and every note started in the
  // run the seek leaves must be released by then (its noteOff, or an
  // allNotesOff/panic at a time at or after the note).
  const seeks = boundaries
    .filter((b) => b.kind === 'start' && b.cause === 'seek')
    .map((b) => {
      const seekMark = marks
        .filter((m) => m.label === 'seek' && m.wall <= b.causeWall)
        .at(-1);
      const before = seekMark?.wall ?? b.causeWall;
      const limit = b.t + SEEK_FADE;
      const left = runs.filter((r) => r.t < b.t - 1e-6).at(-1) ?? null;
      const sources = events.filter(
        (e) =>
          e.type === 'src-start' &&
          e.wall < before &&
          e.loop === false &&
          (e.clipId || e.call !== null),
      );
      const runningPast = [];
      for (const e of sources) {
        const end = Math.min(e.naturalEnd ?? Infinity, stopOf(e.id));
        if (end > limit) {
          runningPast.push({
            id: e.id,
            source: e.clipId ?? e.scope ?? e.node,
            startMs: ms(Math.max(e.when, e.now) - b.t),
            endMs: Number.isFinite(end) ? ms(end - b.t) : null,
          });
        }
      }
      // Sources a note call started that never end on their own
      // (oscillators, looping buffers). An instrument that gates its voices
      // with envelopes (Oracle) runs them free on purpose: there, each note
      // still sounding at the seek must get an envelope release or
      // forceStop by the seek + fade, logged after the seek. Any other
      // instrument's such source must be stopped (or ended) by then.
      const gatedInstruments = new Set(
        events
          .filter((e) => e.type === 'gate' && e.call)
          .map((e) => callBySeq.get(e.call)?.instrument)
          .filter(Boolean),
      );
      const voices = events.filter(
        (e) =>
          e.type === 'src-start' &&
          e.wall < before &&
          e.loop !== false &&
          e.call !== null &&
          !gatedInstruments.has(callBySeq.get(e.call)?.instrument),
      );
      for (const e of voices) {
        const end = stopOf(e.id);
        if (end > limit) {
          runningPast.push({
            id: e.id,
            source: `${e.scope ?? 'adapter'} ${e.node}`,
            startMs: ms(Math.max(e.when, e.now) - b.t),
            endMs: Number.isFinite(end) ? ms(end - b.t) : null,
          });
        }
      }
      const gatesOpen = [];
      for (const instrument of gatedInstruments) {
        const sounding = adapterCalls.filter((on) => {
          if (on.fn !== 'noteOn' || on.instrument !== instrument) return false;
          if (on.time === null || on.time >= limit || on.wall >= before) {
            return false;
          }
          const off = adapterCalls.find(
            (c) =>
              c.fn === 'noteOff' &&
              c.track === on.track &&
              c.note === on.note &&
              c.seq > on.seq &&
              (c.time ?? c.now) >= on.time - 1e-4,
          );
          return !off || (off.time ?? off.now) > b.t;
        });
        if (!sounding.length) continue;
        const closed = events.filter(
          (e) =>
            e.type === 'gate' &&
            (e.fn === 'release' || e.fn === 'forceStop') &&
            e.wall >= before &&
            callBySeq.get(e.call)?.instrument === instrument &&
            (e.time ?? e.now) <= limit,
        ).length;
        if (closed < sounding.length) {
          gatesOpen.push({ instrument, sounding: sounding.length, closed });
        }
      }
      const noteOns = adapterCalls.filter(
        (c) =>
          c.fn === 'noteOn' &&
          c.time !== null &&
          c.wall < before &&
          (!left || c.time >= left.t - 1e-6),
      );
      const hanging = [];
      let latestRelease = null;
      for (const on of noteOns) {
        let release = Infinity;
        for (const c of adapterCalls) {
          if (c.track !== on.track || c.seq <= on.seq) continue;
          const at = c.time ?? c.now;
          const fits =
            (c.fn === 'noteOff' && c.note === on.note) ||
            c.fn === 'allNotesOff' ||
            c.fn === 'panic';
          if (fits && at >= on.time - 1e-4) release = Math.min(release, at);
        }
        if (Number.isFinite(release)) {
          latestRelease = Math.max(latestRelease ?? -Infinity, release - b.t);
        }
        if (release > limit) {
          hanging.push({
            track: on.track,
            note: on.note,
            noteMs: ms(on.time - b.t),
            releaseMs: Number.isFinite(release) ? ms(release - b.t) : null,
          });
        }
      }
      return {
        t: round(b.t, 4),
        tick: b.tick,
        sourcesBefore: sources.length + voices.length,
        runningPast,
        gatesOpen,
        notesBefore: noteOns.length,
        hanging,
        latestReleaseMs: latestRelease === null ? null : ms(latestRelease),
      };
    });

  // Edit while playing: the moved note sounds on the next pass (the first
  // loop lap whose loop event came after the edit) at its new tick, and no
  // longer at its old one.
  const noteEdits = edits.map((edit) => {
    const pass =
      boundaries.find((b) => b.kind === 'loop' && b.causeWall > edit.wall) ??
      null;
    const out = {
      track: edit.track,
      note: edit.pitch,
      fromTick: edit.fromTick,
      toTick: edit.toTick,
      passT: pass ? round(pass.t, 4) : null,
      reachable: false,
      newErrorMs: null,
      stillAtOldTick: false,
    };
    if (!pass) return out;
    out.reachable = edit.toTick >= pass.tick && edit.toTick < runEndTick(pass);
    const end = nextBoundary(pass)?.t ?? Infinity;
    const ons = adapterCalls.filter(
      (c) =>
        c.fn === 'noteOn' &&
        c.track === edit.track &&
        c.note === edit.pitch &&
        c.time !== null &&
        c.time >= pass.t - 0.05 &&
        c.time < end,
    );
    const expected = gridTime(pass, edit.toTick);
    const nearest = ons.reduce(
      (best, c) =>
        !best || Math.abs(c.time - expected) < Math.abs(best.time - expected)
          ? c
          : best,
      null,
    );
    out.newErrorMs = nearest ? ms(nearest.time - expected) : null;
    const old = gridTime(pass, edit.fromTick);
    out.stillAtOldTick = ons.some((c) => Math.abs(c.time - old) <= 0.025);
    return out;
  });

  // Every start(when) the audio thread got too late, and every "now" start.
  const category = (e) => (e.clipId ? 'clip' : (e.scope ?? `other:${e.node}`));
  const lateStarts = {};
  const immediateStarts = {};
  for (const e of events) {
    if (e.type !== 'src-start') continue;
    const key = category(e);
    if (e.when > 0 && e.when < e.now) {
      const entry = (lateStarts[key] ??= { count: 0, maxLateMs: 0 });
      entry.count++;
      entry.maxLateMs = Math.max(entry.maxLateMs, ms(e.now - e.when));
    } else if (atOnce(e)) {
      immediateStarts[key] = (immediateStarts[key] ?? 0) + 1;
    }
  }

  // Resume restarts the transport from the store's playhead, which lags the
  // transport: how far before the paused tick it starts again.
  const resume = boundaries.find((b) => b.cause === 'resume');
  const paused = resume
    ? boundaries.filter((b) => b.kind === 'pause' && b.t < resume.t).at(-1)
    : null;
  const pick = (list, key, value, field) =>
    median(list.filter((x) => x[key] === value).map((x) => x[field]));
  return {
    info,
    reachedPause: raw.reachedPause,
    steps: raw.steps ?? [],
    transport: boundaries.map((b) => ({
      kind: b.kind,
      cause: b.cause,
      t: round(b.t, 4),
      tick: b.tick,
      ...(b.eventTick !== undefined ? { eventTick: b.eventTick } : {}),
    })),
    summary: {
      // Each track's own meter during the run: -120 means never heard.
      liveTrackPeakDb: raw.liveTrackPeakDb,
      clipStartErrorMs: {
        play: pick(clipStarts, 'cause', 'play', 'timeErrorMs'),
        resume: pick(clipStarts, 'cause', 'resume', 'timeErrorMs'),
        loop: pick(clipStarts, 'cause', 'loop', 'timeErrorMs'),
        scheduled: pick(clipStarts, 'cause', 'scheduled', 'timeErrorMs'),
      },
      clipOffsetErrorMs: {
        play: pick(clipStarts, 'cause', 'play', 'offsetErrorMs'),
        resume: pick(clipStarts, 'cause', 'resume', 'offsetErrorMs'),
        loop: pick(clipStarts, 'cause', 'loop', 'offsetErrorMs'),
      },
      // Where each clip's audio really ends (its own end or a stop()),
      // against the loop seam, pause, stop or clip end that should end it.
      clipEndErrorMs: {
        loopSeam: pick(clipStarts, 'endCause', 'loopSeam', 'endErrorMs'),
        pause: pick(clipStarts, 'endCause', 'pause', 'endErrorMs'),
        stop: pick(clipStarts, 'endCause', 'stop', 'endErrorMs'),
        clipEnd: pick(clipStarts, 'endCause', 'clipEnd', 'endErrorMs'),
      },
      clipCancelErrorMs: {
        loopSeam: pick(clipCancels, 'cause', 'loopSeam', 'errorMs'),
        pause: pick(clipCancels, 'cause', 'pause', 'errorMs'),
        stop: pick(clipCancels, 'cause', 'stop', 'errorMs'),
      },
      noteReleaseErrorMs: {
        loopSeam: pick(releases, 'cause', 'loopSeam', 'errorMs'),
        pause: pick(releases, 'cause', 'pause', 'errorMs'),
        stop: pick(releases, 'cause', 'stop', 'errorMs'),
      },
      resumeRewindMs:
        resume && paused ? ms((resume.tick - paused.tick) * spt) : null,
      metronomeMedianErrorMs: {
        play: pick(metronome, 'run', 'play', 'errorMs'),
        resume: pick(metronome, 'run', 'resume', 'errorMs'),
        loopLaps: pick(metronome, 'run', 'loop', 'errorMs'),
      },
      metronomeMissedBeatsPerLap: laps.map((l) => l.missedBeats),
      metronomeAccentsOffBarLine: metronome.filter(
        (c) => c.accent !== c.onBarLine,
      ).length,
      countInDownbeatErrorMs: countIn?.downbeatErrorMs ?? null,
      startsBeforeCurrentTime: Object.values(lateStarts).reduce(
        (sum, e) => sum + e.count,
        0,
      ),
    },
    clipStarts,
    clipCoverage,
    seeks,
    noteEdits,
    clipCancels,
    metronome: { clicks: metronome, laps },
    countIn,
    midi: midiSummary,
    releases,
    adapters,
    lateStarts,
    immediateStarts,
  };
}

/**
 * Whether the trace itself worked (sanity: the plan ran through and every
 * probe saw what the session must produce; a failure means the measurement
 * is broken) and whether playback kept to the grid (timing, ±2 ms; a
 * failure means the scheduler is off).
 */
function traceChecks(result, session, setup) {
  const checks = [];
  const check = (name, pass, detail = null, kind = 'sanity') =>
    checks.push({ name, pass: Boolean(pass), detail, kind });
  // Timing checks hold the scheduler to the grid; a --legacy run records
  // them without failing on them (the legacy timings are the known-bad
  // ones).
  const timing = (name, pass, detail = null) =>
    check(name, pass, detail, 'timing');
  const within = (value, tol = TRACE_TOLERANCE_MS) =>
    value !== null && value !== undefined && Math.abs(value) <= tol;
  const plan = session.golden.trace;
  const kinds = new Set(result.steps.map((step) => step.do));
  const causes = result.transport.map((b) => b.cause);
  const flow = causes.join(' → ') || 'none';
  const waiting = setup.ready.instruments.filter(
    (t) => t.state !== 'ready' && t.state !== 'none',
  );
  check(
    'live instruments ready before the run',
    setup.ready.complete,
    waiting.map((t) => `${t.name}: ${t.state}`).join(', ') || null,
  );
  const unknown = result.steps.filter((step) => step.error);
  check(
    'every plan step ran',
    unknown.length === 0,
    unknown.map((step) => step.error).join('; ') || null,
  );
  check(
    'playhead reached every tick the plan waits for',
    result.reachedPause,
    result.steps
      .filter((step) => step.do === 'untilTick')
      .map((step) => `tick ${step.tick}${step.reached ? '' : ' (not reached)'}`)
      .join(', ') || null,
  );
  check(
    'transport started for Play and for the resume',
    causes.includes('play') &&
      (!kinds.has('resume') || causes.includes('resume')),
    flow,
  );
  check('transport looped', causes.includes('loop'), flow);
  check(
    'transport paused for Pause and for Stop',
    (!kinds.has('pause') || causes.includes('pause')) &&
      causes.includes('stop'),
    flow,
  );
  if (kinds.has('seek')) {
    check('transport restarted for the seek', causes.includes('seek'), flow);
  }
  if (plan.countInBars) {
    const clicks = result.countIn?.clicks ?? 0;
    const expected = plan.countInBars * result.info.tsNum;
    check(
      'count-in clicked every beat',
      clicks === expected,
      `${clicks} of ${expected}`,
    );
  }
  if (session.data.transport?.metronomeEnabled) {
    check(
      'metronome clicked',
      result.metronome.clicks.length > 0,
      `${result.metronome.clicks.length} clicks`,
    );
  }
  const audioClips = session.data.tracks.flatMap((t) =>
    (t.audioClips ?? []).map((c) => c.id),
  );
  for (const id of audioClips) {
    const starts = result.clipStarts.filter((c) => c.clip === id).length;
    check(`clip ${id} started`, starts > 0, `${starts} starts`);
  }
  if (audioClips.length) {
    check(
      'clip scheduler cancels logged',
      result.clipCancels.length > 0,
      `${result.clipCancels.length} cancels`,
    );
  }
  const loaded = setup.ready.instruments.filter((t) => t.state === 'ready');
  check(
    'every live instrument wrapped',
    setup.adapters.length === loaded.length &&
      setup.adapters.every((a) => a.fns.includes('noteOn')),
    `${setup.adapters.map((a) => a.track).join(', ')} of ${loaded.map((t) => t.name).join(', ')}`,
  );
  for (const track of session.data.tracks) {
    const notes = (track.midiClips ?? []).reduce(
      (sum, c) => sum + (c.events?.startTickDeltas?.length ?? 0),
      0,
    );
    if (!notes) continue;
    const noteOns = result.midi[track.name]?.noteOns ?? 0;
    check(`${track.name} got noteOns`, noteOns > 0, `${noteOns} noteOns`);
  }
  if (session.data.tracks.some((t) => t.instrument === 'oracle-synth')) {
    const calls = result.adapters['oracle-synth']?.envelopeCalls ?? 0;
    check(
      'Oracle envelope gates logged',
      setup.envelopeFns.includes('trigger') && calls > 0,
      `${calls} envelope calls; wrapped ${setup.envelopeFns.join(', ') || 'nothing'}`,
    );
  }

  // ── Timing (gated, ±2 ms against the grid) ──
  const tol = TRACE_TOLERANCE_MS;
  if (result.clipStarts.length) {
    const unplaced = result.clipStarts.filter((c) => c.timeErrorMs === null);
    const byCause = {};
    for (const c of result.clipStarts) {
      if (c.timeErrorMs === null) continue;
      byCause[c.cause] = maxAbs([byCause[c.cause] ?? null, c.timeErrorMs]);
    }
    timing(
      `clip starts on the grid (±${tol} ms)`,
      !unplaced.length && result.clipStarts.every((c) => within(c.timeErrorMs)),
      `worst per cause ${JSON.stringify(byCause)}${unplaced.length ? `; ${unplaced.length} not on any run` : ''}`,
    );
    timing(
      `clip buffer offsets (±${tol} ms)`,
      result.clipStarts.every((c) => within(c.offsetErrorMs)),
      `worst ${maxAbs(result.clipStarts.map((c) => c.offsetErrorMs))} ms`,
    );
    const missing = result.clipCoverage.filter((c) => c.starts !== 1);
    timing(
      'every clip starts once on each run (play, resume, loop lap, seek)',
      !missing.length,
      missing
        .map((c) => `${c.clip} ${c.starts}× on ${c.run} @${c.runT}`)
        .join(', ') || `${result.clipCoverage.length} runs`,
    );
  }
  if (session.data.transport?.metronomeEnabled) {
    const clicks = result.metronome.clicks;
    timing(
      `metronome clicks on the beat (±${tol} ms)`,
      clicks.length > 0 && clicks.every((c) => within(c.errorMs)),
      `worst ${maxAbs(clicks.map((c) => c.errorMs))} ms; median after resume ${result.summary.metronomeMedianErrorMs.resume} ms`,
    );
    const missed = result.metronome.laps.reduce(
      (sum, l) => sum + l.missedBeats,
      0,
    );
    timing(
      'no missed metronome beats',
      missed === 0,
      `missed per lap [${result.summary.metronomeMissedBeatsPerLap.join(', ')}]`,
    );
  }
  if (plan.countInBars && result.countIn) {
    timing(
      `count-in clicks on the grid (±${tol} ms)`,
      within(result.countIn.maxGridErrorMs),
      `worst ${result.countIn.maxGridErrorMs} ms`,
    );
    timing(
      `downbeat after the count-in (±${tol} ms)`,
      within(result.countIn.downbeatErrorMs),
      `${result.countIn.downbeatErrorMs} ms`,
    );
  }
  for (const [track, m] of Object.entries(result.midi)) {
    const outside = m.extra.filter((x) => x.outsideRuns).length;
    const list = (items, fmt) =>
      items.slice(0, 4).map(fmt).join(', ') +
      (items.length > 4 ? ` +${items.length - 4}` : '');
    timing(
      `${track}: every note plays once, on the grid (±${tol} ms)`,
      (m.noteOns === 0 || within(m.maxGridErrorMs)) &&
        !m.extra.length &&
        !m.missing.length,
      [
        `worst ${m.maxGridErrorMs} ms over ${m.noteOns} note-ons`,
        m.extra.length
          ? `${m.extra.length} extra (${outside} outside every run): ${list(m.extra, (x) => `${x.note}@${x.time}s`)}`
          : null,
        m.missing.length
          ? `${m.missing.length} missing: ${list(m.missing, (x) => `${x.note}@${x.tick} on ${x.run}`)}`
          : null,
      ]
        .filter(Boolean)
        .join('; '),
    );
  }
  if (kinds.has('seek')) {
    const fade = 12;
    const past = result.seeks.flatMap((s) => s.runningPast);
    const open = result.seeks.flatMap((s) => s.gatesOpen);
    timing(
      `seek: nothing sounds past the seek + ${fade} ms (buffer sources and other instruments' oscillators stopped; Oracle voices, which run free, closed by their envelopes)`,
      result.seeks.length > 0 && !past.length && !open.length,
      [
        past.length
          ? `${past.length} running on: ${past
              .slice(0, 6)
              .map(
                (p) =>
                  `${p.source} until ${p.endMs === null ? 'never' : `${p.endMs} ms`}`,
              )
              .join(', ')}`
          : `${result.seeks.map((s) => s.sourcesBefore).join(', ')} sources before`,
        ...open.map(
          (g) =>
            `${g.instrument}: ${g.sounding} notes sounding, ${g.closed} envelopes closed`,
        ),
      ].join('; '),
    );
    const hanging = result.seeks.flatMap((s) => s.hanging);
    timing(
      `seek: every earlier note released by the seek + ${fade} ms`,
      result.seeks.length > 0 && !hanging.length,
      hanging.length
        ? `${hanging.length} held: ${hanging
            .slice(0, 6)
            .map(
              (h) =>
                `${h.track} ${h.note} until ${h.releaseMs === null ? 'never' : `${h.releaseMs} ms`}`,
            )
            .join(', ')}`
        : `${result.seeks.map((s) => s.notesBefore).join(', ')} notes before; latest release ${result.seeks.map((s) => s.latestReleaseMs).join(', ')} ms`,
    );
  }
  if (kinds.has('editNote')) {
    const edits = result.noteEdits;
    timing(
      `edited note sounds on the next pass at its new tick (±${tol} ms)`,
      edits.length > 0 &&
        edits.every(
          (e) => e.reachable && within(e.newErrorMs) && !e.stillAtOldTick,
        ),
      edits
        .map(
          (e) =>
            `${e.track} ${e.note} ${e.fromTick}→${e.toTick}: ${e.passT === null ? 'no next pass' : `${e.newErrorMs} ms${e.stillAtOldTick ? ', still at the old tick' : ''}${e.reachable ? '' : ' (not reached)'}`}`,
        )
        .join('; ') || 'no edit ran',
    );
  }

  check(
    'no uncaught page errors',
    setup.pageErrors.length === 0,
    setup.pageErrors.join(' | ') || null,
  );
  return checks;
}

async function traceCase(
  browser,
  base,
  fixture,
  profile,
  rateLabel,
  legacy = false,
) {
  const golden = fixture.session.golden ?? {};
  if (!golden.trace)
    throw new Error(`fixture ${fixture.name} has no trace plan`);
  const rate = rateLabel === 'default' ? null : Number(rateLabel);
  const { context, page, errors, consoleErrors } = await editorPage(
    browser,
    base,
    profile,
    { rate, trace: true, legacy },
  );
  try {
    await page.evaluate(
      ([session, audio]) => window.__golden.loadFixture(session, audio),
      [fixture.session, golden.audio ?? {}],
    );
    const ready = await page.evaluate(
      (ms) => window.__golden.waitReady(ms),
      INSTRUMENT_TIMEOUT_MS,
    );
    const wrapped = await page.evaluate(() =>
      window.__golden.installTraceWrappers(),
    );
    // Whether the page really booted with the legacy flag.
    const legacyFlag = await page.evaluate(() => {
      try {
        return localStorage.getItem('ma:daw:legacyScheduler');
      } catch {
        return null;
      }
    });
    const loadBefore = loadavg()[0];
    const raw = await page.evaluate(
      (plan) => window.__golden.runTracePlan(plan),
      golden.trace,
    );
    const analysis = analyseTrace(raw, fixture.session);
    const pageErrors = errorLines(errors);
    const checks = traceChecks(analysis, fixture.session, {
      ready,
      ...wrapped,
      pageErrors,
    });
    if (legacy) {
      checks.push({
        name: 'legacy scheduler flag set before boot',
        pass: legacyFlag === '1',
        detail: `ma:daw:legacyScheduler = ${legacyFlag}`,
        kind: 'sanity',
      });
    }
    return {
      fixture: fixture.name,
      profile,
      rate: rateLabel,
      legacy,
      legacyFlag,
      plan: golden.trace,
      // Live timings depend on how busy the machine was: the 1-minute load
      // average before and after the run, against the number of cores.
      host: {
        cores: cpus().length,
        loadAvg1m: [round(loadBefore, 1), round(loadavg()[0], 1)],
      },
      ready,
      checks,
      ...analysis,
      consoleErrors: errorLines(consoleErrors),
      pageErrors,
      warnings: await page.evaluate(() => window.__golden.takeWarnings()),
      events: raw.events,
    };
  } finally {
    await context.close();
  }
}

async function runTrace({ base, browser, args, outDir }) {
  const fixtures = loadFixtures(
    fixtureDirOf(args),
    args.fixture ?? TRACE_FIXTURE,
  );
  const rates = args.rates
    ? parseRates(args.rates, { allowDefault: true })
    : TRACE_RATES;
  const profiles = profilesFrom(args, 'chromebook');
  const goldenDir = resolve(args.goldens ?? DEFAULT_GOLDEN_DIR);
  const update = args.update === 'true';
  const legacy = args.legacy === 'true';
  // A trace is live playback: on a stopped clock nothing is scheduled.
  await requireAudioClock(browser);
  const summary = [];
  const broken = [];
  for (const fixture of fixtures) {
    for (const profile of profiles) {
      for (const rateLabel of rates.map(String)) {
        const label = `${fixture.name}@${rateLabel}-${profile}${legacy ? '-legacy' : ''}`;
        process.stdout.write(`trace ${label} … `);
        const result = await traceCase(
          browser,
          base,
          fixture,
          profile,
          rateLabel,
          legacy,
        );
        const file = writeJson(outDir, `trace-${label}`, result);
        const failedChecks = result.checks.filter(
          (c) => !c.pass && (c.kind === 'sanity' || !legacy),
        );
        console.log(`${result.info.sampleRate} Hz → ${file}`);
        if (failedChecks.length) broken.push(label);
        if (update && !failedChecks.length) {
          // The measured baseline without the raw event log. Timings move a
          // little run to run, so traces are kept for reference, not compared.
          const measured = {
            note: 'Measured live schedule trace (golden.mjs --trace --update); kept for reference, never compared.',
            ...result,
          };
          delete measured.events;
          mkdirSync(goldenDir, { recursive: true });
          writeFileSync(
            join(goldenDir, `trace-${label}.json`),
            `${formatJson(measured)}\n`,
          );
        }
        printTraceSummary(result);
        summary.push({
          case: label,
          sampleRate: result.info.sampleRate,
          host: result.host,
          checksPassed: !failedChecks.length,
          failedChecks,
          ...result.summary,
          countIn: result.countIn,
          midi: result.midi,
          adapters: result.adapters,
          lateStarts: result.lateStarts,
        });
      }
    }
  }
  console.log(`\nsummary: ${writeJson(outDir, 'trace-summary', summary)}`);
  if (broken.length) {
    console.log(
      `trace checks failed for ${broken.join(', ')}: a sanity check means the trace is not measuring what it should, a timing check that playback is off the grid${update ? ' (not written to the goldens)' : ''}.`,
    );
    process.exitCode = 1;
  }
}

function printTraceSummary(result) {
  const s = result.summary;
  const line = (text) => console.log(`    ${text}`);
  const failed = result.checks.filter((c) => !c.pass && c.kind === 'sanity');
  const late = result.checks.filter((c) => !c.pass && c.kind === 'timing');
  const describe = (list) =>
    list.map((c) => `${c.name}${c.detail ? ` (${c.detail})` : ''}`).join('; ');
  line(
    failed.length
      ? `CHECKS FAILED: ${describe(failed)}`
      : `sanity checks: all pass (plan ran: ${result.transport.map((b) => b.cause).join(' → ')}; reached every tick: ${result.reachedPause})`,
  );
  line(
    late.length
      ? `TIMING FAILED${result.legacy ? ' (legacy scheduler: recorded, not gated)' : ''}: ${describe(late)}`
      : `timing checks: all ${result.checks.filter((c) => c.kind === 'timing').length} within ±${TRACE_TOLERANCE_MS} ms`,
  );
  line(
    `host load (1 min avg, before/after): ${result.host.loadAvg1m.join(' / ')} on ${result.host.cores} cores`,
  );
  for (const warning of result.warnings) line(`warning: ${warning}`);
  line(
    `live peak per track meter (dBFS): ${JSON.stringify(s.liveTrackPeakDb)}`,
  );
  line(
    `clip start vs grid: play ${s.clipStartErrorMs.play} ms, resume ${s.clipStartErrorMs.resume} ms, loop laps ${s.clipStartErrorMs.loop} ms, on the transport ${s.clipStartErrorMs.scheduled} ms; buffer offset error on loop laps ${s.clipOffsetErrorMs.loop} ms`,
  );
  line(
    `clip audio ends vs loop seam ${s.clipEndErrorMs.loopSeam} ms, vs pause ${s.clipEndErrorMs.pause} ms, vs stop ${s.clipEndErrorMs.stop} ms, vs its own end ${s.clipEndErrorMs.clipEnd} ms; clip scheduler cancels vs seam ${s.clipCancelErrorMs.loopSeam} / pause ${s.clipCancelErrorMs.pause} / stop ${s.clipCancelErrorMs.stop} ms`,
  );
  line(
    `notes released vs seam ${s.noteReleaseErrorMs.loopSeam} / pause ${s.noteReleaseErrorMs.pause} / stop ${s.noteReleaseErrorMs.stop} ms; resume restarts ${s.resumeRewindMs} ms from the paused position`,
  );
  line(
    `metronome vs beat: after play ${s.metronomeMedianErrorMs.play} ms, after resume ${s.metronomeMedianErrorMs.resume} ms, loop laps ${s.metronomeMedianErrorMs.loopLaps} ms; missed beats per lap [${s.metronomeMissedBeatsPerLap.join(', ')}]; accents off the bar line ${s.metronomeAccentsOffBarLine}`,
  );
  if (result.countIn) {
    line(
      `count-in: ${result.countIn.clicks}/${result.countIn.expectedClicks} clicks, grid ${result.countIn.maxGridErrorMs} ms, downbeat ${result.countIn.downbeatErrorMs} ms (timer late ${result.countIn.timerLateMs} ms)`,
    );
  }
  for (const [track, m] of Object.entries(result.midi)) {
    line(
      `${track} (${m.instrument}): ${m.noteOns} notes, vs grid ${m.maxGridErrorMs} ms, scheduled ${m.minAheadMs} ms (min) / ${m.medianAheadMs} ms (median) ahead, ${m.late} late`,
    );
  }
  for (const [instrument, a] of Object.entries(result.adapters)) {
    const st = a.sourcesStarted;
    const gate =
      a.gateErrorMs === null
        ? 'no envelope gates'
        : `envelope gate vs note ${a.gateErrorMs} ms, release vs note-off ${a.releaseErrorMs} ms`;
    line(
      `${instrument}: ${gate}; sources started at the note time ${st.atNoteTime}, at once ${st.atOnce}${a.gateErrorMs === null ? '' : ' (free-running until the gate)'}, other ${st.other}; cut at once in noteOn ${a.cutAtOnceInNoteOn.count} (median ${a.cutAtOnceInNoteOn.medianAheadMs} ms before the note); pitch set at once ${a.pitchAtOnceInNoteOn.count} (median ${a.pitchAtOnceInNoteOn.medianAheadMs} ms before); stopped ${JSON.stringify(a.sourcesStopped)}`,
    );
  }
  line(
    `start(when) earlier than currentTime: ${s.startsBeforeCurrentTime} ${JSON.stringify(result.lateStarts)}`,
  );
}

// ── Fixture builder ──────────────────────────────────────────────────────

async function runMakeFixtures({ base, browser, args }) {
  const dir = fixtureDirOf(args);
  mkdirSync(dir, { recursive: true });
  const wanted = args.fixture ? args.fixture.split(',') : null;
  const unknown = (wanted ?? []).filter(
    (name) => !FIXTURES.some((spec) => spec.name === name),
  );
  if (unknown.length) {
    throw new Error(`no fixture spec named ${unknown.join(', ')}`);
  }
  for (const spec of FIXTURES) {
    if (wanted && !wanted.includes(spec.name)) continue;
    const file = join(dir, `${spec.name}.json`);
    if (existsSync(file) && args.force !== 'true') {
      console.log(`${spec.name}: exists (use --force to rebuild)`);
      continue;
    }
    const { context, page } = await newPage(browser, 'small', {
      probes: false,
    });
    try {
      await page.addInitScript(installDevModules);
      await openEditor(page, base, spec.boot ?? '?new=1');
      await page.evaluate(installPageHelpers);
      const { golden, ...build } = spec;
      const session = await page.evaluate(
        (s) => window.__golden.buildFixture(s),
        build,
      );
      writeFileSync(
        file,
        `${JSON.stringify({ ...session, golden }, null, 2)}\n`,
      );
      console.log(
        `${spec.name}: ${session.data.tracks.length} tracks → ${file}`,
      );
    } finally {
      await context.close();
    }
  }
}

await withStudio('golden', async (env) => {
  if (env.args['make-fixtures'] === 'true') return runMakeFixtures(env);
  if (env.args.trace === 'true') return runTrace(env);
  return runRender(env);
});
