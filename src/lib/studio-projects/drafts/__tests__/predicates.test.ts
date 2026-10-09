import { describe, expect, it } from 'vitest';
import {
  draftHasWork,
  draftIsCloudEqual,
  draftIsPristine,
  draftIsReadOnly,
  draftTouchedAt,
} from '../predicates';
import type { DraftMeta } from '../types';

// ── What a draft is worth keeping for (milestone 1.4, E3) ─────────────────
// Run: npx vitest run src/lib/studio-projects/drafts/__tests__/predicates.test.ts

function meta(overrides: Partial<DraftMeta> = {}): DraftMeta {
  return {
    v: 1,
    draftId: 'd1',
    userKey: 'me',
    origin: 'session',
    createdAt: 1,
    updatedAt: 2,
    writeSeq: 1,
    writer: { build: 'dev', doc: 'w' },
    schema: 3,
    name: 'Untitled',
    trackCount: 1,
    chars: 100,
    contentHash: 'h1:0000000000000000',
    docFingerprint: 'h1:aaaaaaaaaaaaaaaa',
    hasContent: true,
    baseline: {
      source: 'template',
      ref: 'project-pop',
      reopenable: true,
      fingerprint: 'h1:bbbbbbbbbbbbbbbb',
    },
    media: [],
    mediaMissing: 0,
    ...overrides,
  };
}

const cloud = (savedFingerprint: string, savedComplete = true) => ({
  projectId: 'p1',
  updatedAt: '2026-10-08T00:00:00.000Z',
  savedFingerprint,
  savedComplete,
  savedAt: 3,
});

describe('draftIsPristine', () => {
  it('is true only for a reopenable baseline with an equal, known fingerprint', () => {
    const same = 'h1:bbbbbbbbbbbbbbbb';
    expect(draftIsPristine(meta({ docFingerprint: same }))).toBe(true);
    expect(draftIsPristine(meta())).toBe(false);
    expect(
      draftIsPristine(
        meta({
          docFingerprint: same,
          baseline: { source: 'jam', reopenable: false, fingerprint: same },
        }),
      ),
    ).toBe(false);
    expect(
      draftIsPristine(
        meta({
          docFingerprint: null,
          baseline: { source: 'import', reopenable: true, fingerprint: null },
        }),
      ),
    ).toBe(false);
  });
});

describe('draftIsCloudEqual', () => {
  const fp = 'h1:aaaaaaaaaaaaaaaa';

  it('is true when the complete save holds exactly this document and no media waits', () => {
    expect(draftIsCloudEqual(meta({ cloud: cloud(fp) }))).toBe(true);
  });

  it('is false without a cloud record, an incomplete save, or another fingerprint', () => {
    expect(draftIsCloudEqual(meta())).toBe(false);
    expect(draftIsCloudEqual(meta({ cloud: cloud(fp, false) }))).toBe(false);
    expect(
      draftIsCloudEqual(meta({ cloud: cloud('h1:cccccccccccccccc') })),
    ).toBe(false);
  });

  it('is false while the fingerprint is unknown', () => {
    expect(
      draftIsCloudEqual(meta({ docFingerprint: null, cloud: cloud(fp) })),
    ).toBe(false);
  });

  it('is false while media is stored or missing', () => {
    const ref = {
      mediaId: 'f'.repeat(64),
      contentType: 'audio/wav',
      size: 10,
      clipIds: ['c1'],
      samplerSampleIds: [],
    };
    expect(draftIsCloudEqual(meta({ cloud: cloud(fp), media: [ref] }))).toBe(
      false,
    );
    expect(draftIsCloudEqual(meta({ cloud: cloud(fp), mediaMissing: 1 }))).toBe(
      false,
    );
  });
});

describe('draftHasWork', () => {
  it('is hasContent and neither pristine nor cloud-equal', () => {
    expect(draftHasWork(meta())).toBe(true);
    expect(draftHasWork(meta({ hasContent: false }))).toBe(false);
    expect(draftHasWork(meta({ docFingerprint: 'h1:bbbbbbbbbbbbbbbb' }))).toBe(
      false,
    );
    expect(draftHasWork(meta({ cloud: cloud('h1:aaaaaaaaaaaaaaaa') }))).toBe(
      false,
    );
  });

  it('counts an unknown fingerprint as work', () => {
    expect(
      draftHasWork(
        meta({
          docFingerprint: null,
          origin: 'migrated',
          baseline: { source: 'import', reopenable: false, fingerprint: null },
        }),
      ),
    ).toBe(true);
  });
});

describe('draftIsReadOnly', () => {
  it('is true only above the schema this build writes', () => {
    expect(draftIsReadOnly(meta({ schema: 3 }), 3)).toBe(false);
    expect(draftIsReadOnly(meta({ schema: 2 }), 3)).toBe(false);
    expect(draftIsReadOnly(meta({ schema: 4 }), 3)).toBe(true);
  });
});

describe('malformed or partial metas (every stored record is read)', () => {
  /** A meta as it may come back from storage: fields missing or null. */
  const loose = (fields: Record<string, unknown>): DraftMeta =>
    ({ ...meta(), ...fields }) as unknown as DraftMeta;
  const same = 'h1:cccccccccccccccc';

  it('never throws on cloud: null, and treats it as no save', () => {
    const m = loose({ cloud: null, docFingerprint: same });
    expect(draftIsCloudEqual(m)).toBe(false);
    expect(draftHasWork(m)).toBe(true);
  });

  it('never throws without media or a baseline, and leans to work', () => {
    const noMedia = loose({
      media: undefined,
      cloud: cloud(same),
      docFingerprint: same,
    });
    expect(draftIsCloudEqual(noMedia)).toBe(false);
    expect(draftHasWork(noMedia)).toBe(true);

    const noMissing = loose({
      mediaMissing: undefined,
      cloud: cloud(same),
      docFingerprint: same,
    });
    expect(draftIsCloudEqual(noMissing)).toBe(false);

    const noBaseline = loose({ baseline: undefined, docFingerprint: same });
    expect(draftIsPristine(noBaseline)).toBe(false);
    expect(draftHasWork(noBaseline)).toBe(true);

    const nullBaseline = loose({ baseline: null });
    expect(draftIsPristine(nullBaseline)).toBe(false);
  });

  it('counts a meta that does not say whether it has content as work', () => {
    expect(draftHasWork(loose({ hasContent: undefined }))).toBe(true);
    expect(draftHasWork(loose({ hasContent: false }))).toBe(false);
  });

  it('does not read a missing schema as read-only', () => {
    expect(draftIsReadOnly(loose({ schema: undefined }), 3)).toBe(false);
  });
});

describe('draftTouchedAt', () => {
  it('is the latest of updatedAt, createdAt and keptAt', () => {
    expect(draftTouchedAt(meta({ createdAt: 5, updatedAt: 9 }))).toBe(9);
    // An import: content time months back, entered the store now.
    expect(draftTouchedAt(meta({ createdAt: 500, updatedAt: 10 }))).toBe(500);
    expect(
      draftTouchedAt(meta({ createdAt: 5, updatedAt: 9, keptAt: 700 })),
    ).toBe(700);
  });

  it('skips missing or non-finite times', () => {
    const m = { ...meta({ createdAt: 40 }), updatedAt: Number.NaN };
    expect(draftTouchedAt(m)).toBe(40);
    expect(
      draftTouchedAt({
        ...meta(),
        createdAt: undefined,
        updatedAt: undefined,
      } as unknown as DraftMeta),
    ).toBe(0);
  });
});
