// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { setLocalStoreUser } from '@/lib/local-store/userScope';
import { resetLibraryMetaForTests, toggleFavorite } from '../libraryLocalMeta';
import {
  addToProject,
  createProject,
  deleteProject,
  moveInProject,
  removeFromProjects,
  renameProject,
  setProjectCover,
  UNTITLED_PROJECT,
} from '../libraryProjects';

/** What the Library keeps for the student, as stored. */
function meta() {
  const raw = localStorage.getItem('musicAtlas:library:student-1');
  return raw ? JSON.parse(raw) : { projects: [], favorites: [] };
}

describe('projects kept on this device', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLibraryMetaForTests();
    setLocalStoreUser('student-1');
  });

  it('makes a project with sessions, named or untitled', () => {
    const id = createProject('  Album  ', ['cloud:a', 'cloud:a', 'draft:b']);
    expect(id).toBeTruthy();
    const [p] = meta().projects;
    expect(p).toMatchObject({
      id,
      name: 'Album',
      sessions: ['cloud:a', 'draft:b'],
    });
    createProject('');
    expect(meta().projects[1].name).toBe(UNTITLED_PROJECT);
  });

  it('keeps a session in one project at most', () => {
    const one = createProject('One', ['cloud:a', 'cloud:b'])!;
    const two = createProject('Two', ['cloud:a'])!;
    let [p1, p2] = meta().projects;
    expect(p1.sessions).toEqual(['cloud:b']);
    expect(p2.sessions).toEqual(['cloud:a']);
    addToProject(one, ['cloud:a', 'cloud:c']);
    [p1, p2] = meta().projects;
    expect(p1.sessions).toEqual(['cloud:b', 'cloud:a', 'cloud:c']);
    expect(p2.sessions).toEqual([]);
    expect(p2.id).toBe(two);
  });

  it('moves a session up and down, never past the ends', () => {
    const id = createProject('P', ['a', 'b', 'c'])!;
    moveInProject(id, 'c', -1);
    expect(meta().projects[0].sessions).toEqual(['a', 'c', 'b']);
    moveInProject(id, 'a', -1);
    expect(meta().projects[0].sessions).toEqual(['a', 'c', 'b']);
  });

  it('takes sessions out, renames, and deletes without touching sessions', () => {
    const id = createProject('P', ['a', 'b'])!;
    toggleFavorite(`folder:${id}`);
    removeFromProjects(['a']);
    renameProject(id, 'Renamed');
    renameProject(id, '   ');
    expect(meta().projects[0]).toMatchObject({
      name: 'Renamed',
      sessions: ['b'],
    });
    deleteProject(id);
    expect(meta().projects).toEqual([]);
    expect(meta().favorites).toEqual([]);
  });

  it('takes an image, and goes back to its sessions’ covers', () => {
    const id = createProject('P')!;
    expect(meta().projects[0].cover).toBeUndefined();
    setProjectCover(id, 'pink-text');
    expect(meta().projects[0].cover).toBe('pink-text');
    setProjectCover(id, null);
    expect(meta().projects[0].cover).toBeNull();
  });

  it('keeps nothing while the user isn’t known', () => {
    setLocalStoreUser(undefined);
    expect(createProject('P')).toBeNull();
  });
});
