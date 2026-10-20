// ── Make Your Song ─────────────────────────────────────────────────────────
// Echo's creative half (docs/echo-game.md, Make Your Song, Takes): after
// the Boss, the student chooses a band and its groove, then makes a song
// in a mini-Studio, a Chords take and a Melody take over the band.
//
//   Choose Your Band   the live bands and their 4/4 grooves, each at its
//                      tempo; the song plays at the groove's
//   the mini-Studio    Chords and Melody on top, the band's tracks under
//                      them, on a timeline of the song (2 bars ×4, 4 ×2,
//                      8 ×1). Record: a bar's count-in, then the phrase,
//                      the band playing; the take is shown (processTake)
//                      with Use That Take / Try Another Take. Chords first:
//                      once used, the band plays them (buildEchoBand).
//   the pop-up         both takes in: Listen / Edit / Finish
//   the victory        the song's chords, band and key; Play Again, Next
//                      Level!, Take Your Song To The Studio!
//
// The sound is the Studio's own instruments (songPlayer.ts), the takes are
// stamped on its transport clock, the flow is a reducer (songFlow.ts). The
// input is the play screens' (`renderInput`); it only calls the handlers,
// and the sound of each key is made here, on the track's own instrument.

import { ArrowLeft, Circle, Loader2, Play, Square, Trophy } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/components/utilities';
import {
  BAR_TICKS,
  assembleSong,
  echoLevel,
  processTake,
  type EchoLevelNumber,
  type PlayedNote,
} from '@/curriculum/engine/echo';
import {
  chartKeyColor,
  chartKeyName,
  chordSymbol,
} from '@/curriculum/engine/musicLiteracy/chart';
import type { LiteracyKey } from '@/curriculum/engine/musicLiteracy/pitch';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import {
  literacyBands,
  type LiteracyBandOption,
} from '@/features/practiceTracks/genre/bandPracticeTrack';
import {
  buildEchoBand,
  echoBandKey,
  echoBandParts,
  openEchoSongInStudio,
  type EchoBand,
} from '@/features/practiceTracks/genre/echoSongStudio';
import { BandChooser } from './BandChooser';
import { MiniStudio } from './MiniStudio';
import { SongReadyPopup } from './SongReadyPopup';
import { TakeReview } from './TakeReview';
import { Victory, type VictoryChord } from './Victory';
import {
  initialSongFlow,
  songComplete,
  songFlowReducer,
  studioFree,
  type SongTrack,
} from './songFlow';
import { songPlayer } from './songPlayer';
import {
  TRACK_SOUND,
  bandTracks,
  chordColors,
  listenTracks,
  recordingTracks,
  reviewTracks,
  songSounds,
  studioRows,
} from './songTracks';
import type { EchoInputHandlers, MakeYourSongProps } from './types';

/** A take being recorded: its notes so far, and the keys still held. */
interface Capture {
  track: SongTrack;
  open: Map<number, number>;
  notes: PlayedNote[];
}

/** How a live key plays when the input gives no velocity. */
const LIVE_VELOCITY = 100;

/** How long Hear the Groove plays: four bars. */
const PREVIEW_TICKS = 4 * BAR_TICKS;

/** The groove a band opens on: the first at the song's level, else its first. */
function grooveFor(option: LiteracyBandOption, level: EchoLevelNumber) {
  return (option.styles.find((s) => s.level === level) ?? option.styles[0])
    .variation;
}

const TRACK_NAME: Record<SongTrack, string> = {
  chords: 'Chords',
  melody: 'Melody',
};

export function MakeYourSong({
  level,
  keyChoice,
  input,
  scaffolding,
  renderInput,
  onSongFinished,
  onPlayAgain,
  onNextLevel,
  onExit,
}: MakeYourSongProps) {
  const navigate = useNavigate();
  const key: LiteracyKey = useMemo(
    () => ({ tonic: keyChoice.tonic, mode: keyChoice.mode }),
    [keyChoice.tonic, keyChoice.mode],
  );
  const config = echoLevel(level);
  const phraseTicks = config.phraseBars * BAR_TICKS;
  const keyColor = chartKeyColor(key);
  const keyName = chartKeyName(key);
  const [flow, dispatch] = useReducer(songFlowReducer, undefined, () =>
    initialSongFlow(),
  );

  // ── The bands ──
  const [bands, setBands] = useState<LiteracyBandOption[] | null>(null);
  const [bandsFailed, setBandsFailed] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    literacyBands()
      .then((list) => {
        if (!live) return;
        setBands(list);
        if (list[0])
          dispatch({
            type: 'pickBand',
            band: list[0].band.id,
            variation: grooveFor(list[0], level),
          });
      })
      .catch(() => {
        if (!live) return;
        setBands([]);
        setBandsFailed(
          'The bands couldn’t load. Check your connection, then try again.',
        );
      });
    return () => {
      live = false;
    };
    // The bands load once; the level only picks the first groove.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const option = bands?.find((b) => b.band.id === flow.band?.band) ?? null;
  const style =
    option?.styles.find((s) => s.variation === flow.band?.variation) ?? null;
  const bpm = style?.bpm ?? config.tempo;

  // ── The song, and the band playing it ──
  const song = useMemo(
    () =>
      assembleSong(level, key, flow.takes.chords, flow.takes.melody, {
        tempo: bpm,
      }),
    [level, key, flow.takes.chords, flow.takes.melody, bpm],
  );
  const wanted = flow.band
    ? echoBandKey(song, flow.band.band, flow.band.variation)
    : null;
  const [band, setBand] = useState<EchoBand | null>(null);
  const [bandFailed, setBandFailed] = useState(false);
  useEffect(() => {
    if (!flow.band || !style || band?.key === wanted) return;
    let live = true;
    setBandFailed(false);
    buildEchoBand(song, flow.band.band, flow.band.variation)
      .then((built) => {
        if (!live) return;
        if (built) setBand(built);
        else setBandFailed(true);
      })
      .catch(() => {
        if (live) setBandFailed(true);
      });
    return () => {
      live = false;
    };
    // Built again whenever what it plays changes (`wanted`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, style]);
  const parts = useMemo(
    () => (band ? echoBandParts(band.built, song.length) : []),
    [band, song.length],
  );
  const bandReady = band !== null && band.key === wanted;

  // ── The sounds ──
  const sounds = useMemo(() => songSounds(parts), [parts]);
  const soundsKey = sounds.join(',');
  const [loaded, setLoaded] = useState<string | null>(null);
  useEffect(() => {
    if (parts.length === 0) return;
    let live = true;
    void songPlayer.load(sounds).then(() => {
      if (live) setLoaded(soundsKey);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundsKey]);
  useEffect(() => {
    void songPlayer.prepareLive([TRACK_SOUND.chords, TRACK_SOUND.melody]);
  }, []);
  const audioReady = bandReady && loaded === soundsKey;
  // Leaving stops whatever plays.
  useEffect(() => () => songPlayer.stop(), []);

  // ── A take under review, and the band over its chords ──
  const review = flow.activity.kind === 'review' ? flow.activity.take : null;
  const reviewSong = useMemo(
    () =>
      review?.kind === 'chords' && !review.empty
        ? assembleSong(level, key, review, flow.takes.melody, { tempo: bpm })
        : null,
    [review, level, key, flow.takes.melody, bpm],
  );
  const reviewWanted =
    reviewSong && flow.band
      ? echoBandKey(reviewSong, flow.band.band, flow.band.variation)
      : null;
  const [reviewBand, setReviewBand] = useState<EchoBand | null>(null);
  useEffect(() => {
    if (!reviewSong || !flow.band || reviewBand?.key === reviewWanted) return;
    let live = true;
    void buildEchoBand(reviewSong, flow.band.band, flow.band.variation).then(
      (built) => {
        if (live && built) setReviewBand(built);
      },
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewWanted]);
  const reviewParts = useMemo(() => {
    if (!review) return null;
    if (review.kind === 'melody' || review.empty) return parts;
    return reviewBand && reviewBand.key === reviewWanted
      ? echoBandParts(reviewBand.built, song.length)
      : null;
  }, [review, parts, reviewBand, reviewWanted, song.length]);

  // ── Recording ──
  const capture = useRef<Capture | null>(null);
  /** The sound each live key started on, so its release finds it. */
  const liveSounds = useRef(new Map<number, string>());
  const selectedRef = useRef(flow.selected);
  selectedRef.current = flow.selected;

  const finishTake = useCallback(() => {
    const taken = capture.current;
    capture.current = null;
    songPlayer.stop();
    if (!taken) return;
    const played: PlayedNote[] = [
      ...taken.notes,
      ...[...taken.open].map(([midi, onset]) => ({
        midi,
        onset,
        duration: Math.max(1, phraseTicks - onset),
      })),
    ];
    dispatch({
      type: 'recorded',
      take: processTake(played, {
        kind: taken.track,
        key,
        level,
        scaffolding,
      }),
    });
  }, [phraseTicks, key, level, scaffolding]);

  const record = async () => {
    if (!audioReady || !studioFree(flow)) return;
    const track = flow.selected;
    capture.current = { track, open: new Map(), notes: [] };
    dispatch({ type: 'countIn', beat: 0 });
    await songPlayer.play({
      tracks: recordingTracks(track, parts, flow.takes),
      bpm,
      from: 0,
      to: phraseTicks,
      countInBars: config.countInBars,
      onCountIn: (beat) => dispatch({ type: 'countIn', beat }),
      onStart: () => dispatch({ type: 'record' }),
      onEnd: finishTake,
    });
  };

  const stopAll = () => {
    capture.current = null;
    songPlayer.stop();
    dispatch({ type: 'stop' });
  };

  const handlers = useMemo<EchoInputHandlers>(
    () => ({
      kind: flow.selected,
      noteOn: (midi, velocity = LIVE_VELOCITY) => {
        const sound = TRACK_SOUND[selectedRef.current];
        liveSounds.current.set(midi, sound);
        songPlayer.noteOn(sound, midi, velocity);
        const taking = capture.current;
        if (!taking) return;
        const tick = songPlayer.playedTick();
        if (tick === null) return;
        const held = taking.open.get(midi);
        if (held !== undefined)
          taking.notes.push({
            midi,
            onset: held,
            duration: Math.max(1, tick - held),
          });
        taking.open.set(midi, tick);
      },
      noteOff: (midi) => {
        const sound =
          liveSounds.current.get(midi) ?? TRACK_SOUND[selectedRef.current];
        liveSounds.current.delete(midi);
        songPlayer.noteOff(sound, midi);
        const taking = capture.current;
        const held = taking?.open.get(midi);
        if (!taking || held === undefined) return;
        taking.open.delete(midi);
        const tick = songPlayer.playedTick() ?? held;
        taking.notes.push({
          midi,
          onset: held,
          duration: Math.max(1, tick - held),
        });
      },
    }),
    [flow.selected],
  );

  // ── Playing back ──
  const listen = async () => {
    if (!audioReady || !studioFree(flow)) return;
    dispatch({ type: 'listen' });
    await songPlayer.play({
      tracks: listenTracks(song, parts),
      bpm,
      from: 0,
      to: song.length,
      onEnd: () => {
        songPlayer.stop();
        dispatch({ type: 'stop' });
      },
    });
  };

  const playReview = async () => {
    if (!review || !reviewParts) return;
    dispatch({ type: 'reviewPlaying', playing: true });
    await songPlayer.play({
      tracks: reviewTracks(review, reviewParts, flow.takes),
      bpm,
      from: 0,
      to: phraseTicks,
      onEnd: () => {
        songPlayer.stop();
        dispatch({ type: 'reviewPlaying', playing: false });
      },
    });
  };

  const useTake = () => {
    songPlayer.stop();
    // The band already learned these chords for the review: it stays.
    if (review?.kind === 'chords' && reviewBand?.key === reviewWanted)
      setBand(reviewBand);
    dispatch({ type: 'useTake' });
  };

  const tryAgain = () => {
    songPlayer.stop();
    dispatch({ type: 'tryAgain' });
  };

  const select = (track: SongTrack) => {
    if (flow.activity.kind === 'listening') songPlayer.stop();
    dispatch({ type: 'select', track });
  };

  // ── The band, chosen again ──
  const [previewing, setPreviewing] = useState(false);
  const beforeChange = useRef<{ band: string; variation: string } | null>(null);
  const preview = async () => {
    if (!audioReady) return;
    setPreviewing(true);
    await songPlayer.play({
      tracks: bandTracks(parts),
      bpm,
      from: 0,
      to: Math.min(song.length, PREVIEW_TICKS),
      onEnd: () => {
        songPlayer.stop();
        setPreviewing(false);
      },
    });
  };
  const stopPreview = () => {
    songPlayer.stop();
    setPreviewing(false);
  };
  const pickBand = (bandId: string, variation: string) => {
    if (previewing) stopPreview();
    dispatch({ type: 'pickBand', band: bandId, variation });
  };
  const changeBand = () => {
    songPlayer.stop();
    beforeChange.current = flow.band;
    dispatch({ type: 'changeBand' });
  };
  const bandDone = () => {
    stopPreview();
    beforeChange.current = null;
    dispatch({ type: 'openStudio' });
  };
  const cancelChange = () => {
    stopPreview();
    const was = beforeChange.current;
    beforeChange.current = null;
    if (was) dispatch({ type: 'pickBand', ...was });
    dispatch({ type: 'openStudio' });
  };

  // ── Finishing ──
  const finished = useRef(false);
  useEffect(() => {
    if (flow.screen !== 'victory' || finished.current) return;
    finished.current = true;
    songPlayer.stop();
    onSongFinished();
  }, [flow.screen, onSongFinished]);

  const [studioBusy, setStudioBusy] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);
  const toStudio = async () => {
    if (!flow.band || studioBusy) return;
    setStudioBusy(true);
    setStudioError(null);
    try {
      const url = await openEchoSongInStudio({
        level,
        key,
        chordTake: flow.takes.chords,
        melodyTake: flow.takes.melody,
        band: flow.band.band,
        variation: flow.band.variation,
        bpm,
        heard: band,
      });
      if (url) navigate(url);
      else setStudioError('The band couldn’t come along just now. Try again.');
    } catch {
      setStudioError(
        'Your song couldn’t get to the Studio. Check your connection, then try again.',
      );
    } finally {
      setStudioBusy(false);
    }
  };

  const victoryChords = useMemo<VictoryChord[]>(() => {
    const colors = chordColors(key);
    return (flow.takes.chords?.chords ?? []).map((c) => ({
      label: c.label,
      symbol: formatAccidentalsForDisplay(chordSymbol(key, c.degree)),
      color: colors.get(c.degree) ?? keyColor,
    }));
  }, [flow.takes.chords, key, keyColor]);

  // ── What the screen says ──
  const rows = useMemo(
    () => studioRows(song, flow.takes, parts),
    [song, flow.takes, parts],
  );
  const { activity } = flow;
  const complete = songComplete(flow);
  const playing =
    activity.kind === 'countIn' ||
    activity.kind === 'recording' ||
    activity.kind === 'listening' ||
    (activity.kind === 'review' && activity.playing) ||
    previewing;
  const recordingTrack =
    activity.kind === 'countIn' || activity.kind === 'recording'
      ? activity.track
      : null;
  const bars = config.phraseBars;
  const direction = (() => {
    if (!bandReady && bandFailed)
      return 'The band couldn’t get ready. Change the band, then try again.';
    if (!audioReady) return 'The band is getting ready…';
    switch (activity.kind) {
      case 'countIn':
        return 'Get ready… listen to the count-in.';
      case 'recording':
        return 'Play now!';
      case 'review':
        return 'Listen to your take, then use it or try another.';
      case 'listening':
        return 'Listening to your song…';
      default:
        break;
    }
    if (complete)
      return 'Your song is ready! Click a track to record it again, change the band, or finish your song.';
    const has = flow.takes[flow.selected] !== null;
    if (has)
      return `This track has a take. Press Record to record it again, or click the other track.`;
    return flow.selected === 'chords'
      ? `Press Record, wait for the count-in, then play your chords for ${bars} bars. Chords go first, so the band can play them.`
      : `Press Record, wait for the count-in, then play a melody for ${bars} bars over the band.`;
  })();

  const busy = activity.kind === 'countIn' || activity.kind === 'recording';

  return (
    <div
      data-make-your-song
      data-screen={flow.screen}
      data-activity={activity.kind}
      data-level={level}
      data-input={input}
      className="flex h-full min-h-0 w-full flex-col bg-[#101012] text-[#e8e8f0]"
    >
      <header className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/[0.08] px-4 py-2">
        <button
          type="button"
          onClick={() => {
            songPlayer.stop();
            onExit();
          }}
          aria-label="Leave Make Your Song"
          className="inline-flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-[#e8e8f0]"
        >
          <ArrowLeft aria-hidden className="size-4" />
        </button>
        <h1 className="text-[17px] font-medium leading-6">Make Your Song</h1>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-xs text-white/70">
          Level {level}
        </span>
        {flow.screen === 'studio' && option && style && (
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span data-echo-band-summary>
              {option.band.name} · {style.name} · {bpm} BPM
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 font-medium"
              style={{ backgroundColor: `${keyColor}33`, color: '#e8e8f0' }}
            >
              {keyName}
            </span>
            <button
              type="button"
              data-echo-change-band
              disabled={!studioFree(flow)}
              onClick={changeBand}
              className="inline-flex h-7 items-center rounded-full bg-white/10 px-3 text-xs font-medium text-[#e8e8f0] hover:bg-white/[0.14] disabled:opacity-40"
            >
              Change Band
            </button>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {flow.screen === 'band' && (
          <BandChooser
            bands={bands}
            failed={bandsFailed}
            picked={flow.band}
            onPick={pickBand}
            keyColor={keyColor}
            keyName={keyName}
            previewing={previewing}
            previewLoading={!audioReady}
            onPreview={() => void preview()}
            onStopPreview={stopPreview}
            doneLabel={
              beforeChange.current ? 'Back to My Song' : 'Start My Song'
            }
            onDone={bandDone}
            onCancel={beforeChange.current ? cancelChange : undefined}
          />
        )}

        {flow.screen === 'studio' && (
          <div className="mx-auto flex min-h-full w-full max-w-[1200px] flex-col gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {busy ? (
                <button
                  type="button"
                  data-echo-stop
                  onClick={stopAll}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[13px] font-medium text-[#e8e8f0] hover:bg-white/[0.14]"
                >
                  <Square aria-hidden className="size-3.5" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  data-echo-record={flow.selected}
                  onClick={() => void record()}
                  disabled={!audioReady || !studioFree(flow)}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-[#101012] hover:bg-[#e6e6e8] disabled:opacity-40"
                >
                  {audioReady ? (
                    <Circle
                      aria-hidden
                      className="size-3 fill-[#ef4444] text-[#ef4444]"
                    />
                  ) : (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  )}
                  {flow.takes[flow.selected]
                    ? `Record ${TRACK_NAME[flow.selected]} Again`
                    : `Record ${TRACK_NAME[flow.selected]}`}
                </button>
              )}
              {activity.kind === 'listening' ? (
                <button
                  type="button"
                  data-echo-play-song
                  onClick={stopAll}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[13px] font-medium text-[#e8e8f0] hover:bg-white/[0.14]"
                >
                  <Square aria-hidden className="size-3.5" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  data-echo-play-song
                  onClick={() => void listen()}
                  disabled={!audioReady || !studioFree(flow)}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-[13px] font-medium text-[#e8e8f0] hover:bg-white/[0.14] disabled:opacity-40"
                >
                  <Play aria-hidden className="size-3.5" />
                  Play Song
                </button>
              )}
              {activity.kind === 'countIn' && (
                <ol
                  aria-label="Count-in"
                  data-echo-count-in={activity.beat}
                  className="flex gap-1"
                >
                  {[1, 2, 3, 4].map((beat) => (
                    <li
                      key={beat}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums transition-colors',
                        beat === activity.beat
                          ? 'bg-white text-[#101012]'
                          : beat < activity.beat
                            ? 'bg-white/20 text-[#e8e8f0]'
                            : 'bg-white/[0.06] text-white/45',
                      )}
                    >
                      {beat}
                    </li>
                  ))}
                </ol>
              )}
              {activity.kind === 'recording' && (
                <span
                  data-echo-recording-now
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-[#ef4444]/15 px-3 text-[13px] font-medium text-[#f87171]"
                >
                  <span className="size-2 rounded-full bg-[#ef4444] motion-safe:animate-pulse" />
                  Recording {TRACK_NAME[activity.track]}
                </span>
              )}
              {complete && !flow.popup && studioFree(flow) && (
                <button
                  type="button"
                  data-echo-finish-song
                  onClick={() => dispatch({ type: 'openPopup' })}
                  className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-[#101012] hover:bg-[#e6e6e8]"
                >
                  <Trophy aria-hidden className="size-3.5" />
                  Finish My Song
                </button>
              )}
            </div>
            <p
              aria-live="polite"
              data-echo-direction
              className="text-[15px] leading-6 text-white/70"
            >
              {direction}
            </p>

            <MiniStudio
              rows={rows}
              selected={flow.selected}
              onSelect={select}
              selectable={studioFree(flow) && !flow.popup}
              bars={song.bars}
              barTicks={song.barTicks}
              phraseBars={song.phraseBars}
              repeats={song.repeats}
              playing={playing}
              heardTick={songPlayer.heardTick}
              recording={recordingTrack}
              bandChart={band?.built.literacy.chart.chords.join('-')}
            />

            <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-3 pb-2">
              {flow.popup ? (
                <SongReadyPopup
                  listening={activity.kind === 'listening'}
                  onListen={() => void listen()}
                  onStopListening={stopAll}
                  onEdit={() => {
                    songPlayer.stop();
                    dispatch({ type: 'edit' });
                  }}
                  onFinish={() => {
                    songPlayer.stop();
                    dispatch({ type: 'finish' });
                  }}
                />
              ) : review ? (
                <TakeReview
                  take={review}
                  keyColor={keyColor}
                  playing={activity.kind === 'review' && activity.playing}
                  bandReady={reviewParts !== null && audioReady}
                  onPlay={() => void playReview()}
                  onStop={() => {
                    songPlayer.stop();
                    dispatch({ type: 'reviewPlaying', playing: false });
                  }}
                  onUse={useTake}
                  onTryAgain={tryAgain}
                />
              ) : (
                <div className="flex w-full justify-center" data-echo-input>
                  {renderInput(handlers)}
                </div>
              )}
            </div>
          </div>
        )}

        {flow.screen === 'victory' && option && style && (
          <Victory
            chords={victoryChords}
            bandName={option.band.name}
            styleName={style.name}
            keyName={keyName}
            bpm={bpm}
            keyColor={keyColor}
            onPlayAgain={onPlayAgain}
            onNextLevel={onNextLevel}
            onStudio={() => void toStudio()}
            studioBusy={studioBusy}
            studioError={studioError}
          />
        )}
      </div>
    </div>
  );
}
