/**
 * AppRouteLaunch — the student-device launcher for an `app-route` slide.
 *
 * Resolves the atlas interaction's target to an in-SPA route
 * (`resolveContentHref`), mints an MSP token best-effort (tokenless offline),
 * appends the launch handshake params, and opens the module in a new tab. It
 * submits a `{status:'launched'}` marker immediately (teacher sees "in module"),
 * then a completion payload when the module reports back via `useMspReport`
 * (auto) or the student taps "I'm done" (fallback). All three states are
 * bilingual and dark-glass.
 *
 * Lives under `live/interactions/` (which already imports MSP hooks) so the
 * `slides/` firewall stays intact — it reaches the slide via the pre-gated
 * `launch` slot.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ExternalLink, Rocket } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { getSong } from '@/curriculum/data/songs';
import { appendMspLaunchParams } from '../../msp/mspLaunchParams';
import type { MspResultPayload } from '../../msp/mspResponseInbox';
import { useMspReport } from '../../msp/useMspReport';
import { useMspTokenMint } from '../../msp/useMspTokenMint';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import { resolveActivityRefHref } from '../../slides/resolveContentHref';
import type { LocalizedText } from '../../types';
import type { InteractionInputProps } from './types';

const LOCAL_ENROLLMENT_ID = 'local-preview';

const COPY = {
  launch: { en: 'Launch', es: 'Iniciar' },
  comeBack: {
    en: "Come back here when you're done.",
    es: 'Vuelve aquí cuando termines.',
  },
  working: { en: 'Working in the module…', es: 'Trabajando en el módulo…' },
  done: { en: "I'm done", es: '¡Terminé!' },
  relaunch: { en: 'Launch again', es: 'Abrir de nuevo' },
  openHere: { en: 'open here instead', es: 'abrir aquí' },
  finished: { en: 'Nice work!', es: '¡Buen trabajo!' },
  unavailable: {
    en: 'Ask your teacher — this activity is not ready.',
    es: 'Pregunta a tu maestro — esta actividad no está lista.',
  },
} satisfies Record<string, LocalizedText>;

/** Bilingual inline label: EN, with the ES line appended in 'both' mode. */
const Bi = ({
  text,
  language,
}: {
  text: LocalizedText;
  language: InteractionInputProps['language'];
}) => {
  const alt = secondaryLine(text, language);
  return (
    <>
      {pickLocalized(text, language)}
      {alt && <span className="text-white/40"> · {alt}</span>}
    </>
  );
};

type AtlasResult = { status?: string } & Record<string, unknown>;

export const AppRouteLaunch = ({
  interaction,
  language,
  onSubmit,
  submittedPayload,
  disabled,
  enrollmentId,
  sessionId,
}: InteractionInputProps) => {
  const atlas = interaction.atlas;
  const reducedMotion = useReducedMotion();
  const { mintToken } = useMspTokenMint();
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);

  const href = useMemo(
    () =>
      atlas
        ? resolveActivityRefHref(atlas.module, atlas.activityRef, { getSong })
        : null,
    [atlas],
  );

  const effectiveEnrollment = enrollmentId ?? LOCAL_ENROLLMENT_ID;

  const submitResult = useCallback(
    (result: AtlasResult) => {
      if (!atlas) return;
      onSubmit({
        kind: 'atlas',
        module: atlas.module,
        activityRef: atlas.activityRef,
        result,
      });
    },
    [atlas, onSubmit],
  );

  const handleResult = useCallback(
    (payload: MspResultPayload) => {
      submitResult({ ...payload, source: 'module' });
    },
    [submitResult],
  );

  useMspReport(interaction.id, atlas?.module ?? 'learn', handleResult);

  const buildLaunchUrl = useCallback(async (): Promise<string | null> => {
    if (!atlas || !href) return null;
    let token: string | undefined;
    try {
      token = await mintToken({
        interactionId: interaction.id,
        enrollmentId: effectiveEnrollment,
        module: atlas.module,
        activityRef: atlas.activityRef,
        expects: atlas.expects,
        sessionId,
      });
    } catch {
      // Offline / mint unavailable — launch tokenless; the module reports via
      // the fallback inbox token.
      token = undefined;
    }
    return appendMspLaunchParams(href, {
      ...(token ? { token } : {}),
      interactionId: interaction.id,
      enrollmentId: effectiveEnrollment,
      module: atlas.module,
      activityRef: atlas.activityRef,
      expects: atlas.expects,
    });
  }, [atlas, href, mintToken, interaction.id, effectiveEnrollment, sessionId]);

  const handleLaunch = useCallback(async () => {
    setLaunchError(null);
    setPopupBlocked(false);
    const url = await buildLaunchUrl();
    if (!url) {
      setLaunchError('unavailable');
      return;
    }
    setLaunchUrl(url);
    const opened = window.open(url, '_blank', 'noopener');
    if (!opened) setPopupBlocked(true);
    submitResult({ status: 'launched' });
  }, [buildLaunchUrl, submitResult]);

  if (!atlas || !href) {
    return (
      <p className="text-sm text-white/60">
        <Bi text={COPY.unavailable} language={language} />
      </p>
    );
  }

  const atlasResult =
    submittedPayload?.kind === 'atlas'
      ? (submittedPayload.result as AtlasResult)
      : null;
  const launched = atlasResult?.status === 'launched';
  const done = atlasResult !== null && !launched;

  if (done) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-emerald-200"
      >
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">
          <Bi text={COPY.finished} language={language} />
        </span>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleLaunch}
        disabled={disabled}
        className="inline-flex w-fit items-center gap-2.5 rounded-2xl border border-[#7ecfcf]/40 bg-[#7ecfcf]/[0.08] px-6 py-4 text-base font-semibold text-[#7ecfcf] transition-colors hover:border-[#7ecfcf]/70 hover:bg-[#7ecfcf]/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Rocket className="h-5 w-5" />
        {launched ? (
          <Bi text={COPY.relaunch} language={language} />
        ) : (
          <Bi text={COPY.launch} language={language} />
        )}
      </button>

      {launched ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-white/60">
            <Bi text={COPY.working} language={language} />
          </p>
          <button
            type="button"
            onClick={() =>
              submitResult({ completion: true, source: 'student' })
            }
            disabled={disabled}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/80 hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <Bi text={COPY.done} language={language} />
          </button>
        </div>
      ) : (
        <p className="text-sm text-white/55">
          <Bi text={COPY.comeBack} language={language} />
        </p>
      )}

      {popupBlocked && (
        <a
          href={launchUrl ?? href}
          className="inline-flex w-fit items-center gap-1.5 text-xs text-[#7ecfcf]/80 underline hover:text-[#7ecfcf]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <Bi text={COPY.openHere} language={language} />
        </a>
      )}

      {launchError && (
        <p className="text-sm text-white/60" role="alert">
          <Bi text={COPY.unavailable} language={language} />
        </p>
      )}
    </div>
  );
};
