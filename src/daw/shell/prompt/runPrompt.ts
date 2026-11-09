import { useStore } from '@/daw/store';
import {
  applyPromptPart,
  placePromptParts,
  PromptApplyRefusal,
} from './applyPromptPart';
import { styleOptionOf } from '@/features/promptSong/styleOptions';
import {
  sessionStyleText,
  stylePicked,
  usePromptBarStore,
} from './promptBarStore';
import { article } from './promptSuggestion';
import { sectionRequest } from '@/features/promptSong/partWords';
import {
  sessionSettingsOf,
  type PromptKey,
} from '@/features/promptSong/promptSettings';
import { withTransaction } from '@/daw/store/history';
import {
  barsLabel,
  partContextOf,
  promptSpotOf,
  spotForText,
  type PromptSpot,
} from './promptSpot';

// ── Sending a prompt from the Studio's bar (owner, 2026-10-23) ─────────────
//
// The spot (promptSpot.ts), what plays around it, the part built
// (features/promptSong/buildPromptPart.ts, loaded on first use: it reaches
// the curriculum engines, which the editor's start never needs), then put
// on the timeline as one Undo step (applyPromptPart.ts): ⌘Z takes it back.
// No card follows it (owner, 2026-10-23): the part on the timeline is the
// answer. A part the song has a track for already goes on that track; where
// that track plays in the spot, the bar asks first whether to update it or
// keep it and give the new part a track of its own (owner, 2026-10-24).

const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** The run in flight: a newer send supersedes it. */
let runId = 0;

type BuiltResult = Parameters<typeof applyPromptPart>[0];

/** A part built and waiting on the student's answer (the confirm card). */
let pending: { result: BuiltResult; spot: PromptSpot; text: string } | null =
  null;

/** "a Funk bass line", "Trap drums", "Funk drums, bass and chords". */
export function partsPhrase(style: string, parts: readonly string[]): string {
  if (parts.length === 1) {
    if (parts[0] === 'bass') return `${article(style)} ${style} bass line`;
    return `${style} ${parts[0]}`;
  }
  return `${style} ${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

async function build(text: string, spot: PromptSpot) {
  const bar = usePromptBarStore.getState();
  const id = ++runId;
  pending = null;
  const state = useStore.getState();
  const bars = barsLabel(spot, state).toLowerCase();
  const where = spot.section
    ? `the ${spot.section.label.toLowerCase()} (${bars})`
    : bars;
  bar.setPhase({ kind: 'working', status: `Writing for ${where}…` });
  try {
    const { buildPromptPart, PromptPartRefusal } = await import(
      '@/features/promptSong/buildPromptPart'
    );
    try {
      const result = await buildPromptPart(
        text,
        partContextOf(
          useStore.getState(),
          spot,
          sessionStyleText(
            usePromptBarStore.getState(),
            useStore.getState().projectName,
            useStore.getState().genre,
          ),
        ),
        { seed: newSeed() },
      );
      if (id !== runId) return;
      const asks = placePromptParts(result, spot).filter(
        (p) => !p.lane && p.other && p.occupied,
      );
      if (asks.length) {
        pending = { result, spot, text };
        const names = asks.map((p) => p.other!.name);
        const tracks =
          names.length === 1
            ? names[0]
            : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
        bar.setPhase({
          kind: 'confirm',
          message: `${tracks} already ${names.length === 1 ? 'plays' : 'play'} in ${bars}. Update ${names.length === 1 ? 'it' : 'them'} with the new part, or keep ${names.length === 1 ? 'it' : 'them'} and add the new part on a track of its own?`,
          tracks,
          count: names.length,
        });
        return;
      }
      finish(result, spot, text, 'update');
    } catch (err) {
      if (id !== runId) return;
      if (
        err instanceof PromptPartRefusal ||
        err instanceof PromptApplyRefusal
      ) {
        bar.setPhase({ kind: 'error', message: err.message, retryable: false });
        return;
      }
      throw err;
    }
  } catch (err) {
    if (id !== runId) return;
    console.error('The prompt bar failed to build a part', err);
    bar.setPhase({
      kind: 'error',
      message: 'Something went wrong writing that part.',
      retryable: true,
    });
  }
}

/** Place a built part, as one Undo step (⌘Z takes it back); no card after. */
function finish(
  result: BuiltResult,
  spot: PromptSpot,
  text: string,
  others: 'update' | 'keep',
): void {
  const bar = usePromptBarStore.getState();
  try {
    applyPromptPart(result, spot, others);
  } catch (err) {
    if (err instanceof PromptApplyRefusal) {
      bar.setPhase({ kind: 'error', message: err.message, retryable: false });
      return;
    }
    throw err;
  }
  bar.setPhase({ kind: 'idle' });
  bar.clearLaneSpot();
  // A style the prompt named becomes the session's, until one is picked
  // by hand ("add a trap beat" on a blank song: the tag says Trap).
  const named = styleOptionOf(text);
  if (named && !stylePicked(bar.style)) bar.setStyle(named.id);
}

/**
 * The confirm card's answer: update the song's track that plays the part
 * there, keep it and give the new part a track of its own, or neither.
 */
export function answerPrompt(choice: 'update' | 'keep' | 'cancel'): void {
  const waiting = pending;
  pending = null;
  if (!waiting || choice === 'cancel') {
    usePromptBarStore.getState().setPhase({ kind: 'idle' });
    return;
  }
  finish(waiting.result, waiting.spot, waiting.text, choice);
}

/**
 * The session takes the key and tempo a prompt asked for alone ("change the
 * key to G minor", "make it 100 bpm"), as one Undo step; no part is written.
 */
function setSessionSettings(key: PromptKey | null, bpm: number | null): void {
  const label =
    key && bpm !== null ? 'Set key and tempo' : key ? 'Set key' : 'Set tempo';
  withTransaction(label, () => {
    const s = useStore.getState();
    if (bpm !== null) s.setBpm(bpm);
    if (key) {
      if (s.rootLocked) s.toggleRootLock();
      s.setMode(key.mode);
      s.setRootNote(key.tonicPc);
    }
  });
}

/** Send `text`: a part for the current spot. */
export function sendPrompt(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();
  const bar = usePromptBarStore.getState();
  bar.setLastText(trimmed);
  const state = useStore.getState();
  // A key or tempo asked for alone: the session takes it, nothing written.
  const settings = sessionSettingsOf(
    trimmed,
    partContextOf(
      state,
      promptSpotOf(state, bar.laneSpot, undefined, bar.selection),
    ),
  );
  if (settings) {
    ++runId;
    pending = null;
    setSessionSettings(settings.key, settings.bpm);
    bar.setPhase({ kind: 'idle' });
    return Promise.resolve();
  }
  // A section the prompt names ("chords for the bridge") is the spot; a
  // new one ("a new chorus part") goes after the song's end.
  const spot = spotForText(
    state,
    promptSpotOf(state, bar.laneSpot, undefined, bar.selection),
    sectionRequest(trimmed),
  );
  return build(trimmed, spot);
}

/** Ask again after an error. */
export function retryPrompt(): Promise<void> {
  const { lastText } = usePromptBarStore.getState();
  return lastText ? sendPrompt(lastText) : Promise.resolve();
}

/** Close the error card above the bar. */
export function dismissPrompt(): void {
  usePromptBarStore.getState().setPhase({ kind: 'idle' });
}

/** For tests: forget the runs. */
export function resetPromptRunsForTests(): void {
  runId = 0;
  pending = null;
}
