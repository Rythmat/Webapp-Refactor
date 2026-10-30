import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { learnTabOfPath, learnTabRoute } from '@/features/learn/learnPaths';
import {
  isLearnInstrumentEnabled,
  learnPageRoute,
  useInstrumentStore,
  useLearnInstrument,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';

/** The instruments, as Home's row lists them; `id` null until it has
 *  lessons. */
const INSTRUMENTS: { label: string; id: LearnInstrument | null }[] = [
  { label: 'Keyboard', id: 'piano' },
  { label: 'Guitar', id: 'guitar' },
  { label: 'Bass', id: 'bass' },
  { label: 'Ukulele', id: 'ukulele' },
  { label: 'Drums', id: null },
];

/**
 * The Learn page's instrument switcher (owner, 2026-10-24), sized and placed
 * as Home's search pill (HomeSearchPill). Closed, it is the chosen
 * instrument's name; a click widens the bar leftward, as the search pill
 * widens on focus, to the other instruments' names, the chosen one staying
 * put, highlighted. Choosing one stores it (as
 * Home's row does) and opens its Learn page, /learn/keyboard or
 * /learn/guitar, or on a tab's page the same tab's on it. One without
 * lessons yet shows dimmed and can't be chosen. Escape, a click outside or
 * focus leaving closes it.
 */
export const LearnInstrumentPill = ({
  stay = false,
}: {
  /** Switch the instrument where you are, not open its Learn page (Set
   *  Lists). */
  stay?: boolean;
} = {}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // On a tab's page, switching keeps the tab: /learn/keyboard/songs →
  // /learn/guitar/songs.
  const tab = learnTabOfPath(pathname);
  const instrument = useLearnInstrument();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const current = INSTRUMENTS.find((i) => i.id === instrument)!;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // A click outside closes it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      toggleRef.current?.focus();
    }
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  return (
    <div ref={wrapRef} onKeyDown={onKeyDown} onBlur={onBlur}>
      <div
        className={cn(
          'flex h-10 items-center rounded-full border bg-white/10 text-white backdrop-blur-md transition-colors duration-150',
          open ? 'border-white/20' : 'border-white/10 hover:bg-white/[0.14]',
        )}
      >
        {/* The other names, opening leftward of the chosen one: the column
          grows from 0fr to 1fr, so the bar widens to fit them. */}
        <div
          className="grid transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none"
          style={{ gridTemplateColumns: open ? '1fr' : '0fr' }}
        >
          <div className="min-w-0 overflow-hidden">
            <div
              role="group"
              aria-label="Instruments"
              data-testid="learn-instrument-names"
              aria-hidden={!open || undefined}
              className="flex items-center gap-0.5 whitespace-nowrap pl-1"
            >
              {INSTRUMENTS.filter((i) => i.id !== instrument).map(
                ({ label, id }) => {
                  const available = id !== null && isLearnInstrumentEnabled(id);
                  return (
                    <button
                      key={label}
                      type="button"
                      tabIndex={open ? 0 : -1}
                      disabled={!available}
                      title={available ? undefined : 'Coming soon'}
                      aria-label={available ? label : `${label}, coming soon`}
                      onClick={() => {
                        if (!id) return;
                        setOpen(false);
                        setInstrument(id);
                        if (stay) return;
                        navigate(
                          tab ? learnTabRoute(id, tab) : learnPageRoute(id),
                        );
                      }}
                      className={cn(
                        'h-8 rounded-full px-3 text-[0.9375rem] leading-6 outline-none transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-white/40',
                        available
                          ? 'text-white/70 hover:bg-white/[0.08] hover:text-white'
                          : 'cursor-default text-white/30',
                      )}
                    >
                      {label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-label={`Instrument: ${current.label}. ${open ? 'Close' : 'Change instrument'}`}
          onClick={() => setOpen((o) => !o)}
          // 4px in plus its 12px padding: the search pill's 16px, closed.
          className={cn(
            'mx-1 h-8 shrink-0 rounded-full px-3 text-[0.9375rem] leading-6 outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-white/40',
            open && 'bg-white/15',
          )}
        >
          {current.label}
        </button>
      </div>
    </div>
  );
};
