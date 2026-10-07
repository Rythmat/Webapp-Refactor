// @vitest-environment jsdom
/**
 * Editor boot links: every one is checked before anything is cleared, and a
 * link that names nothing real changes nothing. It used to clear the session
 * first and then find out (audit practice-tutorial-07, shell-08, ia-flows-02,
 * bundle-load-02, state-reload-03).
 *
 * The catalog here is built from the same lookups DawApp's BOOT_CATALOG
 * uses. A project, a song and a genre practice track are only known once
 * fetched, so the editor's boot checks those itself (scripts/studio-perf
 * roundtrip.mjs R5 covers them in the browser).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { isDiatonicMode } from '@prism/engine';
import { getTutorial } from '@/daw/components/Tutorial/tutorials';
import { getDemoProject } from '@/daw/data/demoProjects';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import {
  forgetLiveSession,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { isScaleLesson } from '@/lib/learn/scaleLessons';
import {
  bootIntentError,
  readBootIntent,
  readLocalSession,
  resumeLocalSession,
  writeLocalSession,
  type BootCatalog,
} from '../localSession';

const catalog: BootCatalog = {
  hasTemplate: (id) => Boolean(getProjectTemplate(id)),
  hasDemo: (id) => Boolean(getDemoProject(id)),
  hasTutorial: (id) => Boolean(getTutorial(id)),
  isPracticeMode: (mode) => isDiatonicMode(mode) || isScaleLesson(mode),
  hasPendingJam: () => true,
};

const problem = (search: string, cat: BootCatalog = catalog) =>
  bootIntentError(readBootIntent(search), cat);

const s = () => useStore.getState();

describe('reading a boot link', () => {
  it('reads each kind of link', () => {
    expect(readBootIntent('')).toEqual({ kind: 'resume' });
    expect(readBootIntent('?seeded=1&song=x')).toEqual({ kind: 'seeded' });
    expect(readBootIntent('?project=p1')).toEqual({
      kind: 'project',
      projectId: 'p1',
    });
    expect(readBootIntent('?template=project-pop')).toEqual({
      kind: 'template',
      templateId: 'project-pop',
    });
    expect(readBootIntent('?practiceGenre=funk')).toEqual({
      kind: 'practiceGenre',
      genre: 'funk',
      level: 1,
      section: 'A',
    });
    expect(
      readBootIntent(
        '?practiceMode=dorian&practiceRoot=dsharp&practiceOpen=chords&practiceLevel=3',
      ),
    ).toEqual({
      kind: 'practiceMode',
      mode: 'dorian',
      rootParam: 'dsharp',
      openTrack: 'chords',
      level: 3,
    });
    expect(readBootIntent('?jam=1&collab=ab12cd34&host=1')).toEqual({
      kind: 'collab',
      code: 'ab12cd34',
      host: true,
      jamImport: true,
    });
    expect(readBootIntent('?jam=1')).toEqual({ kind: 'jam' });
    expect(readBootIntent('?new=1')).toEqual({ kind: 'new' });
  });

  it('uses a room id as given, apart from the spaces around it', () => {
    // Rooms are told apart by case: lowering it would open another room.
    expect(readBootIntent('?collab=Showcase_Room-7')).toMatchObject({
      code: 'Showcase_Room-7',
    });
    expect(readBootIntent('?collab=%20ab12cd34%20')).toMatchObject({
      code: 'ab12cd34',
    });
    expect(readBootIntent('?collab=New')).toMatchObject({ code: 'new' });
  });

  it('keeps the boot’s order when a link carries more than one', () => {
    expect(readBootIntent('?new=1&template=project-pop').kind).toBe('template');
    expect(readBootIntent('?project=p1&demo=d').kind).toBe('project');
  });

  it('falls back to the defaults for loose practice parameters', () => {
    expect(
      readBootIntent('?practiceGenre=funk&practiceLevel=x&practiceSection=Q'),
    ).toMatchObject({ level: 1, section: 'A' });
    expect(readBootIntent('?practiceMode=dorian')).toMatchObject({
      openTrack: 'melody',
      level: 1,
      rootParam: null,
    });
  });
});

describe('checking a boot link before anything is cleared', () => {
  it('turns away ids that name nothing', () => {
    expect(problem('?template=bogus-id')).toBe(
      'That template could not be found.',
    );
    expect(problem('?demo=bogus-id')).toBe('That demo could not be found.');
    expect(problem('?tutorial=bogus-id')).toBe(
      'That lesson could not be found.',
    );
    expect(problem('?practiceMode=bogus-id&practiceRoot=d')).toBe(
      'That practice track mode could not be found.',
    );
    expect(problem('?collab=%3Cscript%3E')).toBe(
      'That session link is not valid.',
    );
    expect(problem('?jam=1', { ...catalog, hasPendingJam: () => false })).toBe(
      'That jam could not be found.',
    );
  });

  it('lets real ones through', () => {
    expect(problem('?template=project-pop')).toBeNull();
    expect(problem('?demo=demo-sunset-keys')).toBeNull();
    expect(problem('?tutorial=make-first-track')).toBeNull();
    expect(problem('?practiceMode=dorian&practiceRoot=d')).toBeNull();
    expect(problem('?collab=new')).toBeNull();
    expect(problem('?collab=ab12cd34')).toBeNull();
    expect(problem('?collab=Showcase_Room-7')).toBeNull();
    expect(problem('?jam=1')).toBeNull();
    expect(problem('?new=1')).toBeNull();
    expect(problem('')).toBeNull();
  });

  it('leaves fetched ones (project, song, genre practice) to the boot', () => {
    expect(problem('?project=00000000-dead')).toBeNull();
    expect(problem('?song=bogus-id')).toBeNull();
    expect(problem('?practiceGenre=bogus-id')).toBeNull();
  });
});

describe('a link that is turned away keeps the session', () => {
  /** A session with work, written to the autosave. */
  function workInProgress(): string {
    resetSessionToEmpty();
    s().setProjectName('Blue Hour');
    s().addTrack('midi', 'piano-sampler', 'Keys');
    writeLocalSession();
    return localStorage.getItem('musicAtlas:daw:autosave') ?? '';
  }

  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
    forgetLiveSession();
  });

  it('in-app: the live session stays, even over an older autosave', () => {
    const saved = workInProgress();
    s().addTrack('midi', 'drum-machine', 'Drums'); // newer than the autosave

    expect(problem('?template=bogus-id')).not.toBeNull();
    expect(resumeLocalSession()).toBe('live');
    expect(s().tracks.map((t) => t.name)).toEqual(['Keys', 'Drums']);
    expect(localStorage.getItem('musicAtlas:daw:autosave')).toBe(saved);
  });

  it('on a fresh page: the autosave is restored, untouched', () => {
    const saved = workInProgress();
    forgetLiveSession();
    useStore.setState(useStore.getInitialState(), true);

    expect(problem('?demo=bogus-id')).not.toBeNull();
    expect(resumeLocalSession()).toBe('restored');
    expect(s().projectName).toBe('Blue Hour');
    expect(localStorage.getItem('musicAtlas:daw:autosave')).toBe(saved);
  });

  it('a fresh page with no autosave starts a session the autosave covers', () => {
    expect(resumeLocalSession()).toBe('empty');
    s().addTrack('midi', 'piano-sampler', 'Keys');
    writeLocalSession();
    expect(readLocalSession()?.data.tracks).toHaveLength(1);
  });
});
