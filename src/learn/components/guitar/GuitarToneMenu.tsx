import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Headphones } from 'lucide-react';
import { useId } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { shapeNotes } from '@/lib/guitar/fretboard';
import {
  GUITAR_AMP_MODELS,
  useGuitarTonePrefs,
} from '../../audio/guitar/guitarTonePrefs';
import {
  guitarLessonVoice,
  strumGuitarChord,
} from '../../audio/guitar/guitarVoice';

const ACOUSTIC = 'acoustic';

/** The Studio's amp categories, in the Studio's words. */
const TONE_TYPES = [
  { id: 'clean', label: 'Clean' },
  { id: 'crunch', label: 'Crunch' },
  { id: 'hi_gain', label: 'Hi Gain' },
] as const;

/** Open C, strummed to preview a tone. */
const PREVIEW_CHORD = shapeNotes('X-3-2-0-1-0');

async function previewTone(): Promise<void> {
  await guitarLessonVoice.load();
  strumGuitarChord(
    PREVIEW_CHORD.map((n) => n.midi),
    1.5,
    0.8,
    undefined,
    PREVIEW_CHORD.map((n) => n.position),
  );
}

interface GuitarToneMenuProps {
  /** The student's guitar is coming in by mic or interface. */
  inputActive: boolean;
  /** Their guitar is played back through the amp. */
  monitor: boolean;
  onMonitorChange: (monitor: boolean) => void;
  /**
   * A preview strum is about to sound: the lesson stops listening to the
   * microphone for PREVIEW_MS so the app isn't heard as the student.
   */
  onPreview?: () => void;
}

/** How long a preview strum sounds, with its ring. */
export const PREVIEW_MS = 2000;

/**
 * "Tone: Quartz ▾" — how lesson guitar sounds: one of the Studio's guitar
 * amps, or an acoustic guitar with no amp. A new choice strums a C to hear
 * it. Also switches monitoring the student's own guitar through the amp,
 * which needs audio input on and headphones (speakers feed back into a mic).
 */
export function GuitarToneMenu({
  inputActive,
  monitor,
  onMonitorChange,
  onPreview,
}: GuitarToneMenuProps) {
  const [prefs, setPrefs] = useGuitarTonePrefs();
  const monitorNoteId = useId();
  const value = prefs.tone === 'acoustic' ? ACOUSTIC : prefs.ampModelId;
  const label =
    prefs.tone === 'acoustic'
      ? 'Acoustic'
      : (GUITAR_AMP_MODELS.find((m) => m.id === prefs.ampModelId)?.name ??
        'Amp');

  const choose = (next: string) => {
    setPrefs(
      next === ACOUSTIC
        ? { tone: 'acoustic' }
        : { tone: 'amp', ampModelId: next },
    );
    onPreview?.();
    previewTone().catch((err: unknown) => {
      console.warn('[GuitarToneMenu] preview failed:', err);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Guitar tone: ${label}`}
        className="group flex items-center gap-1 rounded-md px-2 py-1 text-sm outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span className="text-white/60">Tone:</span>
        <span className="font-semibold text-white">{label}</span>
        <ChevronDown className="size-4 text-white/60 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[70vh] w-64 overflow-y-auto"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={choose}>
          {TONE_TYPES.map((type) => (
            <DropdownMenuGroup key={type.id} aria-label={`${type.label} amps`}>
              <DropdownMenuLabel className="text-xs">
                {type.label}
              </DropdownMenuLabel>
              {GUITAR_AMP_MODELS.filter((m) => m.toneType === type.id).map(
                (amp) => (
                  <DropdownMenuRadioItem key={amp.id} value={amp.id}>
                    {amp.name}
                  </DropdownMenuRadioItem>
                ),
              )}
            </DropdownMenuGroup>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value={ACOUSTIC}>
            Acoustic (no amp)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {/* The primitive, not the menu's check-mark item: this one is drawn
            as a switch. Still a menuitemcheckbox, so it keeps aria-checked. */}
        <DropdownMenuPrimitive.CheckboxItem
          checked={monitor}
          disabled={!inputActive}
          onCheckedChange={onMonitorChange}
          // Stay open, so the switch can be seen to change.
          onSelect={(event) => event.preventDefault()}
          aria-label="Monitor my guitar through the amp"
          aria-describedby={monitorNoteId}
          className="flex cursor-default select-none flex-col gap-1 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-white/10 focus:text-white data-[disabled]:pointer-events-none"
        >
          <span
            className={cn(
              'flex w-full items-center justify-between gap-3',
              !inputActive && 'opacity-50',
            )}
          >
            Monitor my guitar through the amp
            <span
              aria-hidden="true"
              className={cn(
                'relative h-4 w-7 shrink-0 rounded-full transition-colors',
                monitor ? 'bg-sky-500' : 'bg-white/20',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-3 rounded-full bg-white transition-transform',
                  monitor ? 'translate-x-3.5' : 'translate-x-0.5',
                )}
              />
            </span>
          </span>
          <span
            id={monitorNoteId}
            className="flex items-center gap-1 text-xs text-white/50"
          >
            <Headphones aria-hidden="true" className="size-3.5 shrink-0" />
            {inputActive
              ? 'Headphones only: speakers feed back into the mic.'
              : 'Turn on audio input to hear yourself.'}
          </span>
        </DropdownMenuPrimitive.CheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
