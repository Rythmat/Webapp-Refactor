import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
  MODULE_CAPABILITIES,
  resolveMspModuleBaseUrl,
} from '../../msp/capabilities';
import type { MspResultPayload } from '../../msp/mspResponseInbox';
import { useMspReport } from '../../msp/useMspReport';
import { useMspTokenMint } from '../../msp/useMspTokenMint';
import type { InteractionInputProps } from './types';

const LOCAL_ENROLLMENT_ID = 'local-preview';

const summarize = (payload: MspResultPayload): string => {
  if (payload.kind === 'completion') return 'Completed';
  if (payload.kind === 'score')
    return `Score ${payload.score} / ${payload.max}`;
  return `Artifact · ${payload.artifactRef.module}`;
};

export const AtlasInput = ({
  interaction,
  onSubmit,
  submittedPayload,
  disabled,
  enrollmentId,
  sessionId,
  assignmentId,
}: InteractionInputProps) => {
  const atlas = interaction.atlas;
  const { mintToken } = useMspTokenMint();

  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [receivedSummary, setReceivedSummary] = useState<string | null>(() =>
    submittedPayload?.kind === 'atlas'
      ? `Submitted · ${submittedPayload.activityRef}`
      : null,
  );

  const handleResult = useCallback(
    (payload: MspResultPayload) => {
      if (!atlas) return;
      setEmbedUrl(null);
      setWaiting(false);
      setReceivedSummary(summarize(payload));
      onSubmit({
        kind: 'atlas',
        module: atlas.module,
        activityRef: atlas.activityRef,
        result: payload as unknown as Record<string, unknown>,
      });
    },
    [atlas, onSubmit],
  );

  useMspReport(interaction.id, atlas?.module ?? 'learn', handleResult);

  if (!atlas) return null;

  const capability = MODULE_CAPABILITIES[atlas.module];
  const embeddable = capability.embeddable;
  const effectiveEnrollment = enrollmentId ?? LOCAL_ENROLLMENT_ID;

  const handleOpen = async () => {
    setLaunchError(null);
    try {
      const token = await mintToken({
        interactionId: interaction.id,
        enrollmentId: effectiveEnrollment,
        module: atlas.module,
        activityRef: atlas.activityRef,
        expects: atlas.expects,
        sessionId,
        assignmentId,
      });
      const url =
        resolveMspModuleBaseUrl(atlas.module) +
        `?msp=${encodeURIComponent(token)}`;
      if (embeddable) {
        setEmbedUrl(url);
      } else {
        window.open(url, '_blank', 'noopener');
        setWaiting(true);
      }
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Launch failed');
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-wide text-white/50">
        Atlas activity — {atlas.module} · {atlas.expects}
      </p>
      <p className="text-sm text-white/80">{interaction.question.en}</p>

      {receivedSummary && (
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-1 text-xs text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {receivedSummary}
        </div>
      )}

      {launchError && (
        <p className="text-xs text-red-300" role="alert">
          {launchError}
        </p>
      )}

      {!receivedSummary && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled || waiting}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Open {atlas.module}
          <ExternalLink className="h-4 w-4" />
        </button>
      )}

      {waiting && !receivedSummary && (
        <p className="text-xs text-white/50">Waiting for result…</p>
      )}

      {embedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
            <div className="flex items-center justify-between px-4 py-2 text-white">
              <span className="text-sm">
                {atlas.module} · {atlas.activityRef}
              </span>
              <button
                type="button"
                onClick={() => setEmbedUrl(null)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              src={embedUrl}
              title={`${atlas.module} activity`}
              sandbox="allow-scripts allow-same-origin"
              allow="clipboard-write"
              className="h-full w-full flex-1 border-0 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
