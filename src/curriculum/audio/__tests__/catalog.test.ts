import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUDIO_MODULES, audioLessonRoute, audioShelves } from '../catalog';
import { LAB_TOPIC_PAGES } from '../labPages';

const lessons = AUDIO_MODULES.flatMap((m) => m.lessons);

function sourcesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === '__tests__' ? [] : sourcesUnder(path);
    }
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('the Audio catalog', () => {
  it('gives every lesson its own id, and every module too', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const modules = AUDIO_MODULES.map((m) => m.id);
    expect(new Set(modules).size).toBe(modules.length);
  });

  it('keeps only Sound Basics free', () => {
    expect(
      AUDIO_MODULES.filter((m) => m.access === 'free').map((m) => m.id),
    ).toEqual(['sound-basics']);
  });

  it('builds what it lists: every topic has a page, every page a topic', () => {
    const topics = lessons.flatMap((l) =>
      l.kind === 'lab' ? l.topics.map((t) => t.id) : [],
    );
    expect(new Set(topics).size).toBe(topics.length);
    expect(Object.keys(LAB_TOPIC_PAGES).sort()).toEqual([...topics].sort());
  });

  it('gives each taught module one tile', () => {
    const course = audioShelves().find((shelf) => shelf.title === 'Course');
    expect(course?.modules.map((m) => m.lessons.length)).toEqual(
      course?.modules.map(() => 1),
    );
  });

  it('teaches Sound Basics as one unit of four topics', () => {
    const [unit, ...others] =
      AUDIO_MODULES.find((m) => m.id === 'sound-basics')?.lessons ?? [];
    expect(others).toEqual([]);
    expect(unit.kind === 'lab' && unit.topics.map((t) => t.id)).toEqual([
      'waves',
      'compression',
      'frequency',
      'amplitude',
    ]);
  });

  it('holds all nine anatomy lessons and Signal Flow', () => {
    expect(lessons.filter((l) => l.kind === 'anatomy')).toHaveLength(9);
    expect(lessons.filter((l) => l.kind === 'arcade').map((l) => l.id)).toEqual(
      ['signal-flow'],
    );
  });

  it('draws a different figure on each tile of a shelf', () => {
    for (const module of AUDIO_MODULES) {
      const figures = module.lessons.map((l) => l.ratio.join(':'));
      expect(new Set(figures).size).toBe(figures.length);
    }
  });

  it('opens each lesson inside the app', () => {
    for (const module of AUDIO_MODULES) {
      for (const lesson of module.lessons) {
        expect(audioLessonRoute(module, lesson)).toMatch(/^\/[^/]/);
      }
    }
  });

  it('never accents a module in yellow', () => {
    // A is yellow and D amber; the owner's rule is no brand yellow.
    for (const module of AUDIO_MODULES) {
      expect(['A', 'D']).not.toContain(module.accentKey);
    }
  });
});

describe('the Audio section’s source', () => {
  const root = join(process.cwd(), 'src/curriculum/audio');

  it('links nowhere outside the app (owner: build ours, no links)', () => {
    for (const file of sourcesUnder(root)) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/https?:\/\//);
    }
  });

  it('keeps the labs off Tone and the Studio’s engine', () => {
    const banned =
      /from '(tone|@\/daw\/audio\/EffectChain|@\/daw\/store[^']*|@\/learn\/audio\/lessonVolumeStore|@\/learn\/audio\/useLessonVolume)'/;
    for (const file of sourcesUnder(join(root, 'lab'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(banned);
    }
    for (const file of sourcesUnder(join(root, 'labs'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(banned);
    }
  });
});
