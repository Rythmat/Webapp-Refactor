/**
 * Learn's tabs as paths (owner, 2026-10-24): each tab has a page per
 * instrument, and an old ?tab= link forwards to it.
 */
import { describe, expect, it } from 'vitest';
import { learnTabOfPath, learnTabRedirect, learnTabRoute } from '../learnPaths';

describe('learnTabRoute', () => {
  it('puts each tab under its instrument', () => {
    expect(learnTabRoute('piano', 'Songs')).toBe('/learn/keyboard/songs');
    expect(learnTabRoute('piano', 'Genre')).toBe('/learn/keyboard/genre');
    expect(learnTabRoute('guitar', 'Theory')).toBe('/learn/guitar/theory');
    expect(learnTabRoute('guitar', 'Technique')).toBe(
      '/learn/guitar/technique',
    );
    expect(learnTabRoute('piano', 'StartHere')).toBe(
      '/learn/keyboard/start-here',
    );
  });
});

describe('learnTabOfPath', () => {
  it('reads the tab back from its page, and nothing else', () => {
    expect(learnTabOfPath('/learn/guitar/genre')).toBe('Genre');
    expect(learnTabOfPath('/learn/keyboard/world-harmony')).toBe(
      'WorldHarmony',
    );
    expect(learnTabOfPath('/learn/keyboard')).toBeNull();
    expect(learnTabOfPath('/learn/guitar/dorian')).toBeNull();
    expect(learnTabOfPath('/learn/guitar/dorian/d')).toBeNull();
  });
});

describe('learnTabRedirect', () => {
  it('forwards an old ?tab= link to its page, other params kept', () => {
    expect(learnTabRedirect('piano', '?tab=Songs')).toBe(
      '/learn/keyboard/songs',
    );
    expect(learnTabRedirect('guitar', '?tab=Songs&q=jolene')).toBe(
      '/learn/guitar/songs?q=jolene',
    );
    expect(learnTabRedirect('piano', '?tab=Genre&genre=funk')).toBe(
      '/learn/keyboard/genre?genre=funk',
    );
  });

  it('leaves a search with no known tab alone', () => {
    expect(learnTabRedirect('piano', '')).toBeNull();
    expect(learnTabRedirect('piano', '?q=jolene')).toBeNull();
    expect(learnTabRedirect('piano', '?tab=Nope')).toBeNull();
  });
});
