/**
 * Editor URLs: what each asks to open, the keys its open consumes (and the
 * ones it never touches: MSP launch keys, utm_*), and the synchronous checks
 * a link must pass before anything changes.
 *
 * Run: npx vitest run src/daw/session/__tests__/parseBootIntent.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  BOOT_KEYS,
  MSP_KEYS,
  editorBootCatalog,
  hasBootKeys,
  parseBootIntent,
  stripSearchKeys,
  validateIntent,
  type BootCatalog,
} from '../parseBootIntent';
import type { OpenIntent } from '../types';

const parse = (search: string) => parseBootIntent(new URLSearchParams(search));
const intentOf = (search: string) => parse(search).intent;

describe('parseBootIntent', () => {
  it.each<[string, OpenIntent]>([
    ['', { kind: 'resume' }],
    ['?seeded=1', { kind: 'resume' }],
    // Legacy seeded wins, as it always has.
    ['?seeded=1&song=x', { kind: 'resume' }],
    ['?draft=d-1', { kind: 'draft', draftId: 'd-1' }],
    ['?draft=d-1&project=p1', { kind: 'draft', draftId: 'd-1' }],
    ['?project=p1', { kind: 'project', projectId: 'p1' }],
    ['?project=p1&template=project-pop', { kind: 'project', projectId: 'p1' }],
    // 'Open saved version' by URL: the cloud copy, not the device's draft.
    [
      '?project=p1&saved=1',
      { kind: 'project', projectId: 'p1', fromCloud: true },
    ],
    ['?project=p1&saved=0', { kind: 'project', projectId: 'p1' }],
    ['?template=project-pop', { kind: 'template', templateId: 'project-pop' }],
    ['?demo=demo-x', { kind: 'demo', demoId: 'demo-x' }],
    ['?tutorial=t1', { kind: 'tutorial', tutorialId: 't1' }],
    ['?song=africa', { kind: 'song', songId: 'africa', transpose: 0 }],
    [
      '?song=africa&transpose=2',
      { kind: 'song', songId: 'africa', transpose: 2 },
    ],
    ['?song=a&transpose=-3', { kind: 'song', songId: 'a', transpose: -3 }],
    ['?song=a&transpose=40', { kind: 'song', songId: 'a', transpose: 11 }],
    ['?song=a&transpose=-40', { kind: 'song', songId: 'a', transpose: -11 }],
    ['?song=a&transpose=2.7', { kind: 'song', songId: 'a', transpose: 2 }],
    ['?song=a&transpose=x', { kind: 'song', songId: 'a', transpose: 0 }],
    ['?song=a&transpose=-0', { kind: 'song', songId: 'a', transpose: 0 }],
    [
      '?practiceGenre=funk&practiceLevel=2&practiceSection=C',
      { kind: 'practiceGenre', genre: 'funk', level: 2, section: 'C' },
    ],
    [
      '?practiceGenre=funk&practiceLevel=zero&practiceSection=Z',
      { kind: 'practiceGenre', genre: 'funk', level: 1, section: 'A' },
    ],
    [
      '?practiceMode=dorian&practiceRoot=d&practiceOpen=chords&practiceLevel=3',
      {
        kind: 'practiceMode',
        mode: 'dorian',
        rootParam: 'd',
        openTrack: 'chords',
        level: 3,
      },
    ],
    [
      '?practiceMode=dorian&practiceLevel=9',
      {
        kind: 'practiceMode',
        mode: 'dorian',
        rootParam: null,
        openTrack: 'melody',
        level: 1,
      },
    ],
    [
      '?collab=new',
      {
        kind: 'collab',
        code: 'new',
        host: false,
        jamImport: false,
        awaitHost: false,
      },
    ],
    [
      '?collab=NEW&host=1',
      {
        kind: 'collab',
        code: 'new',
        host: false,
        jamImport: false,
        awaitHost: false,
      },
    ],
    [
      '?collab=AbCd1234',
      {
        kind: 'collab',
        code: 'AbCd1234',
        host: false,
        jamImport: false,
        awaitHost: true,
      },
    ],
    [
      '?jam=1&collab=abcd1234&host=1',
      {
        kind: 'collab',
        code: 'abcd1234',
        host: true,
        jamImport: true,
        awaitHost: false,
      },
    ],
    ['?jam=1', { kind: 'jam' }],
    ['?new=1', { kind: 'new' }],
    ['?new=1&jam=1', { kind: 'jam' }],
    ['?new=0', { kind: 'resume' }],
    ['?projects=1', { kind: 'resume' }],
  ])('%s', (search, intent) => {
    expect(intentOf(search)).toEqual(intent);
  });

  it('consumes every boot key in the URL, and nothing else', () => {
    const msp =
      'interactionId=i1&enrollmentId=e1&module=m1&activityRef=a1&expects=x&msp=1';
    const parsed = parse(
      `?tutorial=t1&${msp}&utm_source=mail&utm_campaign=c&other=keep&song=stray`,
    );
    expect(parsed.intent).toEqual({ kind: 'tutorial', tutorialId: 't1' });
    expect([...parsed.consumedKeys].sort()).toEqual(['song', 'tutorial']);
    for (const key of MSP_KEYS) expect(parsed.consumedKeys).not.toContain(key);
    expect(
      stripSearchKeys(
        `?tutorial=t1&${msp}&utm_source=mail&other=keep&song=stray`,
        parsed.consumedKeys,
      ),
    ).toBe(`?${msp}&utm_source=mail&other=keep`);
  });

  it('consumes a song link with its transposition, and ?seeded=1', () => {
    expect(parse('?song=a&transpose=3').consumedKeys).toEqual([
      'song',
      'transpose',
    ]);
    expect(parse('?seeded=1&msp=1').consumedKeys).toEqual(['seeded']);
    expect(parse('').consumedKeys).toEqual([]);
  });

  it("consumes 'Open saved version' with its project", () => {
    expect(parse('?project=p1&saved=1&utm_x=1').consumedKeys).toEqual([
      'project',
      'saved',
    ]);
  });

  it('consumes a practice link with all its keys', () => {
    expect(
      [
        ...parse(
          '?practiceMode=dorian&practiceRoot=d&practiceOpen=chords&practiceLevel=3',
        ).consumedKeys,
      ].sort(),
    ).toEqual([
      'practiceLevel',
      'practiceMode',
      'practiceOpen',
      'practiceRoot',
    ]);
    expect(
      [
        ...parse('?practiceGenre=funk&practiceLevel=2&practiceSection=C')
          .consumedKeys,
      ].sort(),
    ).toEqual(['practiceGenre', 'practiceLevel', 'practiceSection']);
    expect(
      [...parse('?jam=1&collab=x1234&host=1&invite=1').consumedKeys].sort(),
    ).toEqual(['collab', 'host', 'invite', 'jam']);
  });

  it('reads ?projects=1 as a flag on any intent, and consumes it', () => {
    expect(parse('?projects=1')).toEqual({
      intent: { kind: 'resume' },
      consumedKeys: ['projects'],
      openProjects: true,
    });
    expect(parse('?project=p1&projects=1').openProjects).toBe(true);
    expect(parse('?projects=0').openProjects).toBe(false);
  });

  it('says whether a URL carries a boot key', () => {
    expect(hasBootKeys(new URLSearchParams('?msp=1&utm_source=x'))).toBe(false);
    expect(hasBootKeys(new URLSearchParams('?demo=d'))).toBe(true);
    expect(hasBootKeys(new URLSearchParams('?projects=1'))).toBe(true);
    expect(BOOT_KEYS).toContain('draft');
  });

  it('strips to an empty search when nothing is left', () => {
    expect(stripSearchKeys('?new=1', ['new'])).toBe('');
    expect(stripSearchKeys('', ['new'])).toBe('');
  });
});

describe('validateIntent', () => {
  const catalog = (over: Partial<BootCatalog> = {}): BootCatalog => ({
    hasTemplate: () => true,
    hasDemo: () => true,
    hasTutorial: () => true,
    isPracticeMode: () => true,
    hasPendingJam: () => true,
    ...over,
  });
  const message = (intent: OpenIntent, cat = catalog()) =>
    validateIntent(intent, cat)?.message ?? null;

  it("keeps today's messages for ids that name nothing", () => {
    const none = catalog({
      hasTemplate: () => false,
      hasDemo: () => false,
      hasTutorial: () => false,
      isPracticeMode: () => false,
      hasPendingJam: () => false,
    });
    expect(message({ kind: 'template', templateId: 'x' }, none)).toBe(
      'That template could not be found.',
    );
    expect(message({ kind: 'demo', demoId: 'x' }, none)).toBe(
      'That demo could not be found.',
    );
    expect(message({ kind: 'tutorial', tutorialId: 'x' }, none)).toBe(
      'That lesson could not be found.',
    );
    expect(
      message(
        {
          kind: 'practiceMode',
          mode: 'x',
          rootParam: null,
          openTrack: 'melody',
          level: 1,
        },
        none,
      ),
    ).toBe('That practice track mode could not be found.');
    expect(message({ kind: 'jam' }, none)).toBe('That jam could not be found.');
    expect(message({ kind: 'draft', draftId: ' ' })).toBe(
      "That draft couldn't be found.",
    );
  });

  it('turns away a room code that cannot be one, and a jam host with no jam', () => {
    const collab = (code: string, jamImport = false) =>
      ({
        kind: 'collab',
        code,
        host: jamImport,
        jamImport,
        awaitHost: !jamImport,
      }) as const;
    expect(message(collab('a b'))).toBe('That session link is not valid.');
    expect(message(collab('abc'))).toBe('That session link is not valid.');
    expect(message(collab('new'))).toBeNull();
    expect(message(collab('AbCd1234'))).toBeNull();
    expect(
      message(
        collab('abcd1234', true),
        catalog({ hasPendingJam: () => false }),
      ),
    ).toBe('That jam could not be found.');
    expect(message(collab('abcd1234', true))).toBeNull();
  });

  it('refuses as a toast that Retry cannot help', () => {
    expect(
      validateIntent(
        { kind: 'template', templateId: 'x' },
        catalog({ hasTemplate: () => false }),
      ),
    ).toEqual({
      kind: 'not-found',
      message: 'That template could not be found.',
      retryable: false,
      surface: 'toast',
    });
  });

  it('leaves fetched things to the prepare step', () => {
    expect(message({ kind: 'project', projectId: 'p' })).toBeNull();
    expect(message({ kind: 'song', songId: 's', transpose: 0 })).toBeNull();
    expect(message({ kind: 'resume' })).toBeNull();
    expect(message({ kind: 'new' })).toBeNull();
  });

  it("checks the editor's own catalog lazily", () => {
    const cat = editorBootCatalog();
    expect(cat.hasTemplate('project-pop')).toBe(true);
    expect(cat.hasTemplate('nope')).toBe(false);
    expect(cat.isPracticeMode('dorian')).toBe(true);
    expect(cat.isPracticeMode('nope')).toBe(false);
    expect(cat.hasTutorial('nope')).toBe(false);
  });
});
