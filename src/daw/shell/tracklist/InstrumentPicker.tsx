import {
  useCallback,
  useId,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AudioLines,
  Bell,
  Check,
  Church,
  Drum,
  Globe,
  Guitar,
  KeyboardMusic,
  Megaphone,
  MicVocal,
  Music,
  Piano,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/components/utilities';
import {
  familyOf,
  instrumentsIn,
  simpleInstrument,
  type InstrumentFamilyId,
  type SimpleInstrument,
} from '@/daw/instruments/simpleInstruments';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tab, TabList, TabPanel, Tabs } from '@/daw/ui/Tabs';

// ── The simple instrument picker ───────────────────────────────────────────
//
// One way to choose what a track plays: the instrument families down the
// left (arrow keys move between them), the family's instruments on the
// right, the track's own marked with a tick. It offers the plain instruments
// of simpleInstruments.ts only: no Oracle Synth, no audio (the owner's "one
// simpler instrument picker"). Three ways reach it: a track's ⋯ menu
// (Instrument…) and the dock's instrument button open it in
// InstrumentDialog to change that track's instrument, and the Add-track
// picker's Instruments category shows it as its second step, to add a
// track on the instrument chosen.

export const FAMILY_ICONS: Readonly<Record<InstrumentFamilyId, LucideIcon>> = {
  piano: Piano,
  'electric-piano': KeyboardMusic,
  organ: Church,
  guitar: Guitar,
  bass: AudioLines,
  strings: Music,
  brass: Megaphone,
  woodwinds: Wind,
  mallets: Bell,
  voice: MicVocal,
  world: Globe,
  drums: Drum,
};

export interface InstrumentPickerProps {
  /** The families to offer, in order (pickerFamilies). */
  families: readonly InstrumentFamilyId[];
  /** The catalog id of the instrument playing now, ticked. */
  currentId?: string;
  onPick(item: SimpleInstrument): void;
  /**
   * The picker's own heading ('Instrument'), or null for none when the
   * place it is shown in has one: then `labelledBy` names that heading.
   */
  title?: string | null;
  /** The id of the heading that names the picker, with `title` null. */
  labelledBy?: string;
  /** Where the heading's description goes, under it. */
  description?: string;
  className?: string;
}

/** Up and down arrows move between the instruments of the open family. */
function moveInList(event: ReactKeyboardEvent<HTMLUListElement>): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
  );
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (at === -1) return;
  event.preventDefault();
  const next = event.key === 'ArrowDown' ? at + 1 : at - 1;
  buttons[(next + buttons.length) % buttons.length]?.focus();
}

function InstrumentList({
  family,
  currentId,
  onPick,
}: {
  family: InstrumentFamilyId;
  currentId?: string;
  onPick(item: SimpleInstrument): void;
}) {
  return (
    <ul
      aria-label={`${familyOf(family).label} instruments`}
      onKeyDown={moveInList}
      className="flex max-h-[min(336px,60vh)] flex-col gap-0.5 overflow-y-auto"
    >
      {instrumentsIn(family).map((item) => {
        const current = item.id === currentId;
        return (
          <li key={item.id}>
            <button
              type="button"
              data-tutorial-id={`instrument-${item.id}`}
              data-instrument-id={item.id}
              aria-current={current || undefined}
              onClick={() => onPick(item)}
              className={cn(
                'flex h-7 w-full items-center gap-2 rounded-[var(--daw-radius-sm)] px-2 text-left text-daw-text hover:bg-daw-hover',
                current && 'bg-daw-selected',
                TYPE_CLASS.body,
                TRANSITION,
                FOCUS_RING,
              )}
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {current ? (
                <>
                  <Check aria-hidden className="size-4 shrink-0" />
                  <span className="sr-only">(playing now)</span>
                </>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function InstrumentPicker({
  families,
  currentId,
  onPick,
  title = 'Instrument',
  labelledBy,
  description,
  className,
}: InstrumentPickerProps) {
  const headingId = useId();
  const current = currentId ? simpleInstrument(currentId) : undefined;
  const [family, setFamily] = useState<InstrumentFamilyId>(
    current && families.includes(current.family) ? current.family : families[0],
  );
  const pick = useCallback((item: SimpleInstrument) => onPick(item), [onPick]);

  return (
    <div
      data-tutorial-id="instrument-picker"
      role="group"
      aria-labelledby={title === null ? labelledBy : headingId}
      className={cn('flex flex-col gap-2', className)}
    >
      {title === null ? null : (
        <div className="px-1">
          <div id={headingId} className={cn(TYPE_CLASS.title, 'text-daw-text')}>
            {title}
          </div>
          {description ? (
            <div className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
              {description}
            </div>
          ) : null}
        </div>
      )}
      {families.length === 1 ? (
        <InstrumentList
          family={families[0]}
          currentId={currentId}
          onPick={pick}
        />
      ) : (
        <Tabs
          value={family}
          onValueChange={(value) => setFamily(value as InstrumentFamilyId)}
          orientation="vertical"
          className="flex min-h-0 gap-2"
        >
          <TabList
            aria-label="Instrument families"
            className="flex w-40 shrink-0 flex-col items-stretch gap-0.5"
          >
            {families.map((id) => {
              const Icon = FAMILY_ICONS[id];
              return (
                <Tab
                  key={id}
                  value={id}
                  data-tutorial-id={`instrument-family-${id}`}
                  className="justify-start gap-2 px-2 after:hidden"
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="truncate">{familyOf(id).label}</span>
                </Tab>
              );
            })}
          </TabList>
          {families.map((id) => (
            // Its instruments take focus, not the panel: one Tab stop less.
            <TabPanel
              key={id}
              value={id}
              tabIndex={-1}
              className="min-w-0 flex-1"
            >
              <InstrumentList family={id} currentId={currentId} onPick={pick} />
            </TabPanel>
          ))}
        </Tabs>
      )}
    </div>
  );
}
