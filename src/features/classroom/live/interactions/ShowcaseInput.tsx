/**
 * ShowcaseInput — the student's "offer to share" affordance for a `showcase`
 * interaction. Rides the normal response pipeline as a `{kind:'showcase'}`
 * offer. Rule 2: offers are teacher-only (buildProjectorView hard-refuses
 * 'showcase').
 *
 * In a live session (owner, 2026-11-11) the student picks from this class's
 * work, whatever place it was made in (`workspace/useClassWork`), and shows
 * it to the class or sends it to their teacher; or leaves it, sharing is
 * theirs to choose.
 *
 * Elsewhere (a preview, an assignment) it offers the Studio project: the
 * Studio's own note of its current project comes first
 * (`lib/studioCurrentProject.ts`). Without one — the Studio was never opened,
 * or ran in this very tab before the note existed — it falls back to this
 * tab's DAW store (lazy import so the store stays out of the live-session
 * chunk).
 */
import { CheckCircle2, Send, Share2 } from 'lucide-react';
import { useState } from 'react';
import { AppIcons } from '@/components/icons/appIcons';
import { WHITE_PILL_LG } from '@/components/kit';
import { cn } from '@/components/utilities';
import { useMe } from '@/hooks/data';
import { readStudioCurrentProject } from '@/lib/studioCurrentProject';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type {
  LocalizedText,
  ShowcaseArtifact,
  StudentLanguage,
} from '../../types';
import { useClassWork, type ClassWorkItem } from '../workspace/useClassWork';
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
  pick: {
    en: 'Pick something you made this class',
    es: 'Elige algo que hiciste en esta clase',
  },
  none: {
    en: 'Nothing from this class yet',
    es: 'Aún nada de esta clase',
  },
  showClass: { en: 'Show the class', es: 'Mostrar a la clase' },
  sendTeacher: { en: 'Send to my teacher', es: 'Enviar a mi maestro' },
  shownClass: {
    en: 'Offered to the class:',
    es: 'Ofrecido a la clase:',
  },
  sentTeacher: {
    en: 'Sent to your teacher:',
    es: 'Enviado a tu maestro:',
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

/** When it was touched, as a short time of day. */
const timeOf = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * This class's work, to show the class or send the teacher. The Studio
 * project open right now joins the list (with its collab room, so the
 * teacher can open it live on the room's screen).
 */
const ClassWorkPicker = ({
  language,
  onSubmit,
  submittedPayload,
  disabled,
  startedAt,
}: Pick<
  InteractionInputProps,
  'language' | 'onSubmit' | 'submittedPayload' | 'disabled'
> & { startedAt: string }) => {
  const { data: me } = useMe();
  const { work, loading } = useClassWork(startedAt);
  const note = readStudioCurrentProject(me?.id ?? null);
  const items: ClassWorkItem[] = [...work];
  if (
    note &&
    (note.projectId || note.roomId) &&
    !items.some((i) => i.place === 'studio' && i.projectId === note.projectId)
  ) {
    const id = note.projectId ?? note.roomId ?? 'local';
    items.unshift({
      key: `studio:open:${id}`,
      place: 'studio',
      projectId: id,
      name: note.name || 'My Project',
      touchedAt: Date.now(),
      deepLink: note.projectId
        ? `/studio?project=${encodeURIComponent(note.projectId)}`
        : '/studio',
    });
  }
  const [picked, setPicked] = useState<string | null>(null);
  const chosen = items.find((i) => i.key === picked) ?? items[0] ?? null;

  const send = (audience: 'class' | 'teacher') => {
    if (!chosen) return;
    const roomId =
      chosen.place === 'studio' && note?.projectId === chosen.projectId
        ? note?.roomId
        : undefined;
    const artifact: ShowcaseArtifact = {
      projectId: chosen.projectId,
      name: chosen.name,
      place: chosen.place,
      deepLink: chosen.deepLink,
      audience,
      ...(roomId ? { roomId } : {}),
    };
    onSubmit({ kind: 'showcase', artifact });
  };

  if (submittedPayload?.kind === 'showcase') {
    const { artifact } = submittedPayload;
    return (
      <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-emerald-200">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm">
          <Bi
            text={
              artifact.audience === 'teacher'
                ? COPY.sentTeacher
                : COPY.shownClass
            }
            language={language}
          />{' '}
          “{artifact.name}”
        </span>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <p className="text-sm text-white/55">
        <Bi text={COPY.none} language={language} />
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-class-work="">
      <span className="text-sm text-white/70">
        <Bi text={COPY.pick} language={language} />
      </span>
      <ul
        role="radiogroup"
        className="flex max-h-72 flex-col gap-1.5 overflow-y-auto"
      >
        {items.slice(0, 12).map((item) => {
          const Icon = AppIcons[item.place];
          const on = chosen?.key === item.key;
          return (
            <li key={item.key}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPicked(item.key)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                  on
                    ? 'border-white/40 bg-white/[0.08]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20',
                )}
              >
                <Icon className="size-4 shrink-0 text-white/70" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {item.name}
                </span>
                <span className="shrink-0 text-xs text-white/40">
                  {timeOf(item.touchedAt)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !chosen}
          onClick={() => send('class')}
          className={cn(
            WHITE_PILL_LG,
            'w-fit disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Share2 className="h-5 w-5" />
          <Bi text={COPY.showClass} language={language} />
        </button>
        <button
          type="button"
          disabled={disabled || !chosen}
          onClick={() => send('teacher')}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/85 hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <Bi text={COPY.sendTeacher} language={language} />
        </button>
      </div>
    </div>
  );
};

export const ShowcaseInput = ({
  language,
  onSubmit,
  submittedPayload,
  disabled,
  live,
}: InteractionInputProps) => {
  const [busy, setBusy] = useState(false);
  const { data: me } = useMe();
  const offered = submittedPayload?.kind === 'showcase';

  if (live?.state.startedAt) {
    return (
      <ClassWorkPicker
        language={language}
        onSubmit={onSubmit}
        submittedPayload={submittedPayload}
        disabled={disabled}
        startedAt={live.state.startedAt}
      />
    );
  }

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
        className={cn(
          WHITE_PILL_LG,
          'w-fit disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <Share2 className="h-5 w-5" />
        <Bi text={COPY.offer} language={language} />
      </button>
    </div>
  );
};
