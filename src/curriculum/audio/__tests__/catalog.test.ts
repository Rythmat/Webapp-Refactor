import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AUDIO_MODULES,
  audioLessonRoute,
  audioModule,
  audioShelves,
  courseRows,
} from '../catalog';
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

  it('puts a course’s lab first where it has one, for whatever opens it', () => {
    const course = audioShelves().find((shelf) => shelf.title === 'Course');
    for (const module of course?.modules ?? []) {
      if (module.lessons.some((l) => l.kind === 'lab')) {
        expect(module.lessons[0].kind, module.id).toBe('lab');
      }
    }
  });

  it('teaches Sound Basics entirely in guided lessons', () => {
    expect(audioModule('sound-basics')?.lessons.map((l) => l.kind)).toEqual([
      'guided',
      'guided',
      'guided',
    ]);
  });

  it('hands a replaced topic to a guided lesson in its own course', () => {
    for (const module of AUDIO_MODULES) {
      for (const lesson of module.lessons) {
        if (lesson.kind !== 'lab') continue;
        for (const topic of lesson.topics) {
          if (!topic.replacedBy) continue;
          expect(
            module.lessons.find((l) => l.id === topic.replacedBy)?.kind,
            topic.id,
          ).toBe('guided');
        }
      }
    }
  });

  it('lays out a course’s path in teaching order', () => {
    const stops = (id: string) =>
      courseRows(audioModule(id)!).map((row) => row.lesson.id);
    expect(stops('sound-basics')).toEqual([
      'physics-of-sound',
      'hear-the-kit',
      'decibels-and-faders',
    ]);
    expect(stops('signal-path')).toEqual(['gain-staging', 'mic-to-speaker']);
    expect(stops('sound-color')).toEqual(['tone-and-timbre']);
  });

  it('leaves replaced topics out of what’s left of the lab', () => {
    const lab = courseRows(audioModule('signal-path')!)[1];
    expect(lab.kind === 'lab' && lab.topics.map((t) => t.id)).toEqual([
      'digital',
      'amps',
      'loudspeakers',
      'cables',
    ]);
  });

  it('hangs Microphone Anatomy from the lesson that uses it', () => {
    const [gain] = courseRows(audioModule('signal-path')!);
    expect(gain.kind === 'guided' && gain.side?.id).toBe('microphone');
    expect(gain.kind === 'guided' && gain.side?.route).toBe(
      '/learn/audio/anatomy/microphone',
    );
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
    for (const dir of ['mix', 'player', 'lessons']) {
      for (const file of sourcesUnder(join(root, dir))) {
        expect(readFileSync(file, 'utf8'), file).not.toMatch(banned);
      }
    }
    for (const file of sourcesUnder(join(root, 'labs'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(banned);
    }
  });
});
