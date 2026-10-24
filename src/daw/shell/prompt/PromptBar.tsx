import { useReducedMotion } from 'framer-motion';
import { ChevronDown, Loader2, X } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  DiceButton,
  GoButton,
  PROMPT_CARD,
  PROMPT_FRAME,
  PROMPT_OPAQUE,
  PROMPT_TEXTAREA,
  PromptPillButton,
  ROTATE_MS,
  RotatingSuggestion,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { Chip, ColorChip } from '@/daw/ui/Chip';
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { IconButton } from '@/daw/ui/IconButton';
import { sectionRequest } from '@/features/promptSong/partWords';
import {
  FLAVOR_STYLES,
  GENRE_STYLES,
} from '@/features/promptSong/styleOptions';
import { TRACK_COLUMN_PX } from '../tracklist/rowLayout';
import {
  currentStyle,
  sessionStyleText,
  stylePicked,
  usePromptBarStore,
} from './promptBarStore';
import {
  promptSpotOf,
  spotForText,
  spotLabel,
  trackPartOf,
} from './promptSpot';
import { focusPromptRailButton } from './PromptRailButton';
import { promptSuggestions } from './promptSuggestion';
import {
  answerPrompt,
  dismissPrompt,
  retryPrompt,
  sendPrompt,
} from './runPrompt';

// ── The prompt bar (S9, owner 2026-10-23) ──────────────────────────────────
//
// Home's prompt box in the Studio (components/promptBox: one design), low
// over the lanes, centred on them. The input, with suggestions written in
// with the key-center rainbow beside a Tab key — steps in the session's
// style (the prompt it started from) for the spot and what the song lacks
// (promptSuggestion.ts) — and a row under it: the target chip (the spot the
// prompt acts on — bars dragged out, a lane or section right-clicked, the
// loop, or bars from the playhead — and its track), the dice, Create.
// While it writes, a card above it says what it's doing; the part then
// lands on the timeline with no card after it (⌘Z takes it back). Escape
// folds the bar away, to the ∆ on the side rail (PromptRailButton), which
// opens it again. Theory only for now: the part comes from the console's
// bands over the song's chords (features/promptSong), no agent.

/** The card's width (anatomy §6), kept inside narrow lanes. */
const BAR_WIDTH = 648;

const TARGET_HINT =
  'Where the part goes: bars you drag out on the timeline, else the loop while it’s on, else four bars from the playhead. Right-click a lane or a section to ask about it.';

export function PromptBar() {
  const reduce = !!useReducedMotion();
  const collapsed = usePromptBarStore((s) => s.collapsed);
  const phase = usePromptBarStore((s) => s.phase);
  const laneSpot = usePromptBarStore((s) => s.laneSpot);
  const selection = usePromptBarStore((s) => s.selection);
  const focusNonce = usePromptBarStore((s) => s.focusNonce);
  const pickedStyle = usePromptBarStore((s) => s.style);
  const sessionPromptState = usePromptBarStore((s) => s.sessionPrompt);
  const projectName = useStore((s) => s.projectName);
  const projectGenre = useStore((s) => s.genre);
  // The session's style: the tag picked, or set from the prompt the session
  // was generated from, else the song's own (its name, its genre).
  const style = currentStyle(pickedStyle, projectName, projectGenre);
  const styleText = sessionStyleText(
    { style: pickedStyle, sessionPrompt: sessionPromptState },
    projectName,
    projectGenre,
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [index, setIndex] = useState(0);
  /** Tab accepts, each replaying Create's comet; 0 once the text changes. */
  const [sweep, setSweep] = useState(0);

  // What the chip and the suggestions read: the spot as it is now (the
  // parked playhead moves on a seek, a stop or a pause), and a section the
  // student names as they type ("…for the bridge", "a new chorus"): the
  // chip follows it, as the send will.
  const tracks = useStore((s) => s.tracks);
  const chordRegions = useStore((s) => s.chordRegions);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const loopStart = useStore((s) => s.loopStart);
  const loopEnd = useStore((s) => s.loopEnd);
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const num = useStore((s) => s.timeSignatureNumerator);
  const den = useStore((s) => s.timeSignatureDenominator);
  const position = useStore((s) => s.position);
  const sections = useStore((s) => s.sections);
  const request = sectionRequest(value);
  const requestKey = request ? `${request.type}:${request.isNew}` : '';
  const spot = useMemo(
    () => {
      const ts = { timeSignatureNumerator: num, timeSignatureDenominator: den };
      return spotForText(
        { sections, tracks, chordRegions, ...ts },
        promptSpotOf(
          {
            sections,
            loopEnabled,
            loopStart,
            loopEnd,
            selectedTrackId,
            ...ts,
          },
          laneSpot,
          undefined,
          selection,
        ),
        request,
      );
    },
    // `position` stands for the parked playhead promptSpotOf reads;
    // `requestKey` for the section the text names.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sections,
      tracks,
      chordRegions,
      loopEnabled,
      loopStart,
      loopEnd,
      selectedTrackId,
      num,
      den,
      position,
      laneSpot,
      selection,
      requestKey,
    ],
  );
  const ts = { timeSignatureNumerator: num, timeSignatureDenominator: den };
  const track = spot.trackId
    ? tracks.find((t) => t.id === spot.trackId)
    : undefined;
  const suggestions = useStore((s) =>
    promptSuggestions(s, spot, styleText).join('\n'),
  ).split('\n');
  const suggestion = suggestions[index % suggestions.length];

  const working = phase.kind === 'working';
  const empty = value.trim().length === 0;

  // Rotate while the field is empty; from the top when the spot changes.
  useEffect(() => setIndex(0), [spot]);
  useEffect(() => {
    if (!empty) return;
    const id = window.setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [empty]);

  // Grow with the text, up to the max height in the class list.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // After the lane menu that asked has closed and handed focus back to
  // its trigger: a frame later, then the input.
  useEffect(() => {
    if (focusNonce === 0) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [focusNonce]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (working || empty) return;
    const text = value;
    setValue('');
    setSweep(0);
    void sendPrompt(text);
  };

  const accept = (text: string) => {
    setValue(text);
    inputRef.current?.focus();
  };

  const roll = () => {
    setSweep(0);
    const options = suggestions.filter((s) => s !== value);
    accept(options[Math.floor(Math.random() * options.length)] ?? suggestion);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Tab' && !e.shiftKey && empty && suggestion) {
      // Tab takes the suggestion into the input, to send or edit.
      e.preventDefault();
      accept(suggestion);
      setSweep((n) => n + 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      usePromptBarStore.getState().collapse();
      requestAnimationFrame(focusPromptRailButton);
    }
  };

  const fits = track && trackPartOf(track) !== null;
  // A section asked for that the song hasn't got: the spot will become it.
  const newSection =
    request &&
    !spot.section &&
    (request.isNew || !sections.some((s) => s.type === request.type))
      ? `New ${request.type.charAt(0).toUpperCase()}${request.type.slice(1)} · `
      : '';
  const chip = `${newSection}${spotLabel(spot, ts)} · ${fits ? track!.name : 'New track'}`;
  // The spot's chip shows only for a spot the student chose — bars dragged
  // out, a lane or section right-clicked, a section named — not the loop
  // or the bars from the playhead (the style tag stands there alone).
  const chosen =
    spot.from === 'selection' ||
    spot.from === 'lane' ||
    spot.from === 'section' ||
    !!newSection;

  return (
    <div
      data-testid="prompt-bar-layer"
      className="pointer-events-none absolute bottom-12 right-0 z-[var(--daw-z-dock)] flex justify-center px-4"
      style={{ left: TRACK_COLUMN_PX }}
    >
      {collapsed ? null : (
        <div
          className="pointer-events-auto flex w-full flex-col gap-2"
          style={{ maxWidth: BAR_WIDTH }}
        >
          <PhaseCard />
          <form
            onSubmit={submit}
            role="group"
            aria-label="Ask for a part"
            data-testid="prompt-bar"
            data-tutorial-id="prompt-box"
            className={cn(PROMPT_FRAME, PROMPT_OPAQUE)}
          >
            <div className="relative px-5 pt-4">
              <textarea
                ref={inputRef}
                rows={1}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setSweep(0);
                }}
                onKeyDown={onKeyDown}
                aria-label="Describe the part to add"
                data-testid="prompt-input"
                data-suggestion={suggestion}
                className={PROMPT_TEXTAREA}
              />
              {empty && suggestion && !working ? (
                <RotatingSuggestion text={suggestion} reduce={reduce} />
              ) : null}
            </div>
            <div className="flex items-center gap-2 px-3 pb-3 pt-3">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <StyleTag
                  label={style.label}
                  styleId={style.id}
                  picked={stylePicked(pickedStyle)}
                />
                {chosen ? (
                  <>
                    {fits ? (
                      <ColorChip
                        color={track!.color}
                        meaning="track-colour"
                        size="md"
                        data-testid="prompt-target"
                        title={TARGET_HINT}
                        className="min-w-0 truncate"
                      >
                        {chip}
                      </ColorChip>
                    ) : (
                      <Chip
                        size="md"
                        dashed
                        data-testid="prompt-target"
                        title={TARGET_HINT}
                        className="min-w-0 truncate"
                      >
                        {chip}
                      </Chip>
                    )}
                    {selection || laneSpot ? (
                      <IconButton
                        label="Clear the selection"
                        icon={<X />}
                        size="sm"
                        data-testid="prompt-clear-target"
                        onClick={() => {
                          const bar = usePromptBarStore.getState();
                          bar.clearSelection();
                          bar.clearLaneSpot();
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
              <IconButton
                label="Fold the prompt box away"
                icon={<X />}
                size="sm"
                onClick={() => usePromptBarStore.getState().collapse()}
              />
              <DiceButton onClick={roll} label="Suggest a part" />
              <GoButton
                disabled={empty || working}
                sweep={sweep}
                reduce={reduce}
                data-testid="prompt-send"
                icon={
                  working ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : undefined
                }
              >
                Create
              </GoButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * The style tag: the session's style, a menu of the genres and the styles
 * within them. Set from the prompt a session was generated from; "Match the
 * song" goes back to the style the song's name or genre names.
 */
function StyleTag({
  label,
  styleId,
  picked,
}: {
  label: string;
  styleId: string;
  picked: boolean;
}) {
  const choose = (id: string) =>
    usePromptBarStore.getState().setStyle(id === 'auto' ? null : id);
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          data-testid="prompt-style"
          aria-label={`Style: ${label}. Change the style`}
          className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/[0.08] pl-3 pr-2 text-[13px] font-medium text-white outline-none transition-colors hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {label}
          <ChevronDown aria-hidden className="size-3.5 text-white/60" />
        </button>
      </MenuTrigger>
      <MenuContent
        align="start"
        side="top"
        className="max-h-80 overflow-y-auto"
      >
        <MenuRadioGroup
          value={picked ? styleId : 'auto'}
          onValueChange={choose}
          aria-label="Style"
        >
          <MenuRadioItem value="auto">Match the song</MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuRadioGroup
          label="Genres"
          value={picked ? styleId : ''}
          onValueChange={choose}
        >
          {GENRE_STYLES.map((s) => (
            <MenuRadioItem key={s.id} value={s.id}>
              {s.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuRadioGroup
          label="Styles"
          value={picked ? styleId : ''}
          onValueChange={choose}
        >
          {FLAVOR_STYLES.map((s) => (
            <MenuRadioItem key={s.id} value={s.id}>
              {s.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

/**
 * The card above the box: what it's doing, a question before it writes over
 * a track the song has for the part, or what went wrong.
 */
function PhaseCard() {
  const phase = usePromptBarStore((s) => s.phase);
  if (phase.kind === 'idle') return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={`prompt-${phase.kind}`}
      className={cn(PROMPT_CARD, PROMPT_OPAQUE)}
    >
      {phase.kind === 'working' ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin text-white/50 motion-reduce:animate-none" />
          <p className="text-[15px] leading-6 text-white">{phase.status}</p>
        </>
      ) : phase.kind === 'confirm' ? (
        <>
          <p className="min-w-0 flex-1 text-[15px] leading-6 text-white">
            {phase.message}
          </p>
          <PromptPillButton
            variant="primary"
            onClick={() => answerPrompt('update')}
          >
            {phase.count === 1 ? `Update ${phase.tracks}` : 'Update them'}
          </PromptPillButton>
          <PromptPillButton onClick={() => answerPrompt('keep')}>
            Keep both
          </PromptPillButton>
          <PromptPillButton
            variant="ghost"
            onClick={() => answerPrompt('cancel')}
          >
            Cancel
          </PromptPillButton>
        </>
      ) : (
        <>
          <p className="min-w-0 flex-1 text-[15px] leading-6 text-white">
            {phase.message}
          </p>
          {phase.retryable ? (
            <PromptPillButton onClick={() => void retryPrompt()}>
              Retry
            </PromptPillButton>
          ) : null}
          <PromptPillButton variant="ghost" onClick={dismissPrompt}>
            Dismiss
          </PromptPillButton>
        </>
      )}
    </div>
  );
}
