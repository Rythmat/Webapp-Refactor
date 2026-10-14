// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STUDIO_NOTE_MAX_AGE_MS,
  readStudioCurrentProject,
  writeStudioCurrentProject,
} from './studioCurrentProject';

const NOW = new Date('2026-10-08T15:00:00.000Z');

beforeEach(() => {
  window.localStorage.clear();
});

describe('the current Studio project note', () => {
  it('reads back what the Studio wrote, per user', () => {
    writeStudioCurrentProject(
      'acct-1',
      { projectId: 'proj-9', roomId: 'clsabc', name: 'Night Drive' },
      NOW,
    );
    expect(readStudioCurrentProject('acct-1', NOW)).toEqual({
      projectId: 'proj-9',
      roomId: 'clsabc',
      name: 'Night Drive',
      updatedAt: NOW.toISOString(),
    });
    // Another student on the same computer never sees it.
    expect(readStudioCurrentProject('acct-2', NOW)).toBeNull();
  });

  it('ignores a note from an earlier session', () => {
    writeStudioCurrentProject(
      'acct-1',
      { projectId: 'proj-9', roomId: null, name: 'Old' },
      new Date(NOW.getTime() - STUDIO_NOTE_MAX_AGE_MS - 1),
    );
    expect(readStudioCurrentProject('acct-1', NOW)).toBeNull();
  });

  it('ignores an unreadable note', () => {
    window.localStorage.setItem('ma:studio:current:v1:acct-1', '{not json');
    expect(readStudioCurrentProject('acct-1', NOW)).toBeNull();
  });
});
