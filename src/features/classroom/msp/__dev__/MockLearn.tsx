/**
 * Dev-only MockLearn — mounted at `/dev/msp/mock-learn`. Reads `?msp=<token>`,
 * decodes the mock claims, and lets you fire completion/score/artifact
 * results via postMessage (iframe path) or the mspResponseInbox (new-tab
 * path). Used to smoke-test the P5 wire against a real AtlasInput.
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { recordMspResponseForUser } from '../mspResponseInbox';
import { decodeMockMspToken } from '../mspTokenStore';
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
  const claims = useMemo(() => decodeMockMspToken(token), [token]);
  const embedded = isEmbedded();
  const [notice, setNotice] = useState<string | null>(null);

  if (!claims) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-xl">MockLearn — invalid token.</h1>
      </div>
    );
  }

  const fire = (envelope: MspEnvelope) => {
    if (embedded) {
      window.parent.postMessage(envelope, '*');
      setNotice('postMessage sent to parent.');
      return;
    }
    recordMspResponseForUser(claims.sub === 'anon' ? null : claims.sub, {
      token,
      interactionId: envelope.interactionId,
      participant: envelope.participant,
      module: claims.module,
      activityRef: claims.activityRef,
      payload: envelope.payload,
    });
    setNotice('Result posted to inbox — you can close this tab.');
  };

  const envelopeBase = {
    msp: 'result' as const,
    version: 1 as const,
    interactionId: claims.ctx.interactionId,
    participant: { enrollmentId: claims.ctx.enrollmentId },
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-8 text-white">
      <h1 className="text-xl font-medium">MockLearn (dev)</h1>
      <p className="text-sm text-white/60">
        Activity: <span className="text-white">{claims.activityRef}</span> ·
        Module: <span className="text-white">{claims.module}</span> · Expects:{' '}
        <span className="text-white">{claims.expects}</span> ·{' '}
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
                  module: claims.module,
                  deepLink: `https://learn.example/artifacts/${claims.activityRef}`,
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
