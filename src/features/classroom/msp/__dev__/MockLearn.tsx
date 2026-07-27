/**
 * Dev-only MockLearn — mounted at `/dev/msp/mock-learn`. Simulates an Atlas
 * module receiving a real HTTP-minted MSP token and firing back a result
 * envelope via postMessage (iframe path) or the mspResponseInbox (new-tab
 * path). Used to smoke-test the wire against a real AtlasInput.
 *
 * Reads the token from `?msp=<token>` as an opaque string (real backend
 * tokens are HS256 JWTs whose payload lives server-side and is NOT decoded
 * client-side). Context that the harness needs — `module`, `activityRef`,
 * `interactionId`, `enrollmentId`, `expects` — is passed as separate URL
 * query params by the caller.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AtlasExpects, AtlasModule } from '../capabilities';
import { recordMspResponseForUser } from '../mspResponseInbox';
import type { MspEnvelope } from '../useMspReport';

const isEmbedded = () => {
  try {
    return window.parent !== window;
  } catch {
    return false;
  }
};

export const MockLearn = () => {
  const [params] = useSearchParams();
  const token = params.get('msp') ?? '';
  const module = (params.get('module') as AtlasModule | null) ?? null;
  const activityRef = params.get('activityRef') ?? null;
  const interactionId = params.get('interactionId') ?? null;
  const enrollmentId = params.get('enrollmentId') ?? null;
  const expects =
    (params.get('expects') as AtlasExpects | null) ?? 'completion';
  const sub = params.get('sub');
  const embedded = isEmbedded();
  const [notice, setNotice] = useState<string | null>(null);

  if (!token || !module || !activityRef || !interactionId || !enrollmentId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-xl">MockLearn — missing required query params.</h1>
        <p className="mt-2 text-sm text-white/60">
          Need:{' '}
          <code>?msp=&lt;token&gt;&amp;module=learn&amp;activityRef=...</code>
          <code>
            &amp;interactionId=...&amp;enrollmentId=...&amp;expects=completion
          </code>
        </p>
      </div>
    );
  }

  const fire = (envelope: MspEnvelope) => {
    if (embedded) {
      window.parent.postMessage(envelope, '*');
      setNotice('postMessage sent to parent.');
      return;
    }
    recordMspResponseForUser(sub === 'anon' ? null : sub, {
      token,
      interactionId: envelope.interactionId,
      participant: envelope.participant,
      module,
      activityRef,
      payload: envelope.payload,
    });
    setNotice('Result posted to inbox — you can close this tab.');
  };

  const envelopeBase = {
    msp: 'result' as const,
    version: 1 as const,
    interactionId,
    participant: { enrollmentId },
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-8 text-white">
      <h1 className="text-xl font-medium">MockLearn (dev)</h1>
      <p className="text-sm text-white/60">
        Activity: <span className="text-white">{activityRef}</span> · Module:{' '}
        <span className="text-white">{module}</span> · Expects:{' '}
        <span className="text-white">{expects}</span> ·{' '}
        {embedded ? 'iframe' : 'new-tab'} mode
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            fire({
              ...envelopeBase,
              payload: { kind: 'completion', completed: true },
            })
          }
          className="rounded-full border border-white/10 px-4 py-2 text-sm hover:border-white/25"
        >
          Report completion
        </button>
        <button
          type="button"
          onClick={() =>
            fire({
              ...envelopeBase,
              payload: { kind: 'score', score: 8, max: 10 },
            })
          }
          className="rounded-full border border-white/10 px-4 py-2 text-sm hover:border-white/25"
        >
          Report score 8/10
        </button>
        <button
          type="button"
          onClick={() =>
            fire({
              ...envelopeBase,
              payload: {
                kind: 'artifact',
                artifactRef: {
                  module,
                  deepLink: `https://learn.example/artifacts/${activityRef}`,
                },
              },
            })
          }
          className="rounded-full border border-white/10 px-4 py-2 text-sm hover:border-white/25"
        >
          Report artifact
        </button>
      </div>
      {notice && <p className="text-xs text-white/60">{notice}</p>}
    </div>
  );
};
