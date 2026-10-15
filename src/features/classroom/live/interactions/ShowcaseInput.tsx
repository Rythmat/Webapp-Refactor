/**
 * ShowcaseInput — the student's "offer to share" affordance for a `showcase`
 * interaction. Rides the normal response pipeline as a `{kind:'showcase'}`
 * offer. Rule 2: offers are teacher-only (buildProjectorView hard-refuses
 * 'showcase').
 *
 * Which project: slides open the Studio in a new tab, so the Studio's own
 * note of its current project comes first (`lib/studioCurrentProject.ts`).
 * Without one — the Studio was never opened, or ran in this very tab before
 * the note existed — it falls back to this tab's DAW store (lazy import so the
 * store stays out of the live-session chunk).
 */
import { CheckCircle2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useMe } from '@/hooks/data';
import { readStudioCurrentProject } from '@/lib/studioCurrentProject';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../../types';
import type { InteractionInputProps } from './types';

const COPY = {
  offer: {
    en: 'Offer to share your project',
    es: 'Ofrece compartir tu proyecto',
  },
  offered: {
    en: 'Shared with your teacher!',
    es: '¡Compartido con tu maestro!',
  },
  help: {
    en: 'Your teacher may feature it for the class.',
    es: 'Tu maestro puede mostrarlo a la clase.',
  },
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
      {alt && <span className="text-white/40"> · {alt}</span>}
    </>
  );
};

export const ShowcaseInput = ({
  language,
  onSubmit,
  submittedPayload,
  disabled,
}: InteractionInputProps) => {
  const [busy, setBusy] = useState(false);
  const { data: me } = useMe();
  const offered = submittedPayload?.kind === 'showcase';

  const handleOffer = async () => {
    setBusy(true);
    try {
      const note = readStudioCurrentProject(me?.id ?? null);
      if (note && (note.projectId || note.roomId)) {
        onSubmit({
          kind: 'showcase',
          artifact: {
            projectId: note.projectId ?? note.roomId ?? 'local',
            ...(note.roomId ? { roomId: note.roomId } : {}),
            name: note.name || 'My Project',
          },
        });
        return;
      }
      const { useStore } = await import('@/daw/store');
      const s = useStore.getState();
      onSubmit({
        kind: 'showcase',
        artifact: {
          projectId: s.projectId ?? s.roomId ?? 'local',
          ...(s.roomId ? { roomId: s.roomId } : {}),
          name: s.projectName || 'My Project',
        },
      });
    } finally {
      setBusy(false);
    }
  };

  if (offered) {
    return (
      <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-emerald-200">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">
          <Bi text={COPY.offered} language={language} />
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={handleOffer}
        className="inline-flex w-fit items-center gap-2.5 rounded-2xl border border-[#7ecfcf]/40 bg-[#7ecfcf]/[0.08] px-6 py-4 text-base font-semibold text-[#7ecfcf] transition-colors hover:border-[#7ecfcf]/70 hover:bg-[#7ecfcf]/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Share2 className="h-5 w-5" />
        <Bi text={COPY.offer} language={language} />
      </button>
      <p className="text-sm text-white/55">
        <Bi text={COPY.help} language={language} />
      </p>
    </div>
  );
};
