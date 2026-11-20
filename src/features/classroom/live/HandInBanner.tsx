import { BellRing, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WHITE_PILL_LG } from '@/components/kit';
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type {
  InteractionResponsePayload,
  LocalizedText,
  StudentLanguage,
} from '../types';
import { hasHandedIn, type HandInSlide } from './handIn';
import { InteractionInput } from './interactions';
import type { SessionState } from './sessionsStore';
import type { SessionClock } from './useServerClock';

// ── The teacher's ask, on a student's device (owner, 2026-11-13) ───────────
// "Hand in what you've done so far": a banner over everything the student
// has open (the slides, or their work in the Studio, a lesson…) until they
// have handed in or set it aside. Hand in opens the hand-in slide's own
// inputs (their work, and a note) wherever the class is. Setting one aside
// is remembered for the tab; the teacher asking again brings it back.

const COPY = {
  asks: {
    en: 'Your teacher asks you to hand in what you’ve done so far',
    es: 'Tu maestro te pide entregar lo que has hecho hasta ahora',
  },
  handIn: { en: 'Hand in', es: 'Entregar' },
  later: { en: 'Not now', es: 'Ahora no' },
  done: { en: 'Done', es: 'Listo' },
  title: { en: 'Hand in your work', es: 'Entrega tu trabajo' },
} satisfies Record<string, LocalizedText>;

const Bi = ({
  text,
  language,
}: {
  text: LocalizedText;
  language: StudentLanguage;
}) => {
  const alt = secondaryLine(text, language);
  return (
    <>
      {pickLocalized(text, language)}
      {alt && <span className="text-white/45"> · {alt}</span>}
    </>
  );
};

const dismissedKey = (sessionId: string) => `ma:hand-in:set-aside:${sessionId}`;

const readDismissed = (sessionId: string): number | null => {
  try {
    const raw = sessionStorage.getItem(dismissedKey(sessionId));
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

export interface HandInBannerProps {
  sessionId: string;
  state: SessionState;
  /** The deck's hand-in slide; none, no banner. */
  handIn: HandInSlide | null;
  submissions: Readonly<Record<string, InteractionResponsePayload>>;
  onSubmit: (
    interactionId: string,
  ) => (payload: InteractionResponsePayload) => void;
  language: StudentLanguage;
  clock: SessionClock;
  /** The hand-in slide is in front of them already: no banner. */
  hidden?: boolean;
}

export const HandInBanner = ({
  sessionId,
  state,
  handIn,
  submissions,
  onSubmit,
  language,
  clock,
  hidden = false,
}: HandInBannerProps) => {
  const notice = state.notice?.kind === 'hand-in' ? state.notice : null;
  const [dismissed, setDismissed] = useState(() => readDismissed(sessionId));
  const [open, setOpen] = useState(false);

  // A new ask closes nothing it finds open, and shows again if set aside.
  useEffect(() => {
    setDismissed(readDismissed(sessionId));
  }, [sessionId, notice?.id]);

  const done = handIn ? hasHandedIn(submissions, handIn.interactions) : false;
  const showBanner =
    Boolean(notice && handIn) &&
    !hidden &&
    state.status !== 'ended' &&
    !done &&
    dismissed !== notice?.id;

  const setAside = () => {
    if (!notice) return;
    try {
      sessionStorage.setItem(dismissedKey(sessionId), String(notice.id));
    } catch {
      // Storage refused: set aside until the page reloads.
    }
    setDismissed(notice.id);
  };

  return (
    <>
      {showBanner && !open && (
        <div
          role="status"
          data-hand-in-banner=""
          className="fixed inset-x-0 top-3 z-[65] mx-auto flex w-[min(40rem,calc(100%-1.5rem))] flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-[#161618]/95 px-4 py-3 text-white shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
        >
          <BellRing className="size-5 shrink-0 text-white/80" aria-hidden />
          <span className="min-w-0 flex-1 text-sm">
            <Bi text={COPY.asks} language={language} />
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full bg-white px-4 py-1.5 text-sm text-black hover:opacity-90"
            >
              <Bi text={COPY.handIn} language={language} />
            </button>
            <button
              type="button"
              onClick={setAside}
              aria-label={`${COPY.later.en} · ${COPY.later.es}`}
              className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </span>
        </div>
      )}

      {open && handIn && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={COPY.title.en}
          data-hand-in-sheet=""
          className="fixed inset-0 z-[66] flex items-end justify-center bg-black/60 p-3 sm:items-center"
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[40rem] flex-col gap-5 overflow-y-auto rounded-3xl border border-white/10 bg-[#141418] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg">
                <Bi text={COPY.title} language={language} />
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {handIn.interactions.map((interaction) => (
              <div key={interaction.id} className="flex flex-col gap-3">
                <p className="text-base text-white/90">
                  <Bi text={interaction.question} language={language} />
                </p>
                <InteractionInput
                  interaction={interaction}
                  language={language}
                  onSubmit={onSubmit(interaction.id)}
                  submittedPayload={submissions[interaction.id] ?? null}
                  live={{ state, clock, slideId: handIn.slide.id }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${WHITE_PILL_LG} w-fit self-end`}
            >
              <Bi text={COPY.done} language={language} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
