import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LESSON_DIR,
  planFingerEdits,
  writeLessonFingers,
  type LessonStep,
} from '../writeLessonFingers';

// A lesson file as the repo writes them.
const FILE = `import type { ActivitySectionV2 } from '../../types/activity.v2';

// L1 — the pocket.
const funkL1SectionA: ActivitySectionV2 = {
  id: 'A',
  name: 'Melody',
  steps: [
    // ── A1: Scale ──
    {
      stepNumber: 1,
      module: 'funk_l1',
      section: 'A',
      activity: 'A1.1: D Minor Pentatonic Ascending',
      targetNotes: [
        { midi: 62, onset: 0, duration: 460 },
        { midi: 65, onset: 480, duration: 460, finger: 4 },
        { midi: 67, onset: 960, duration: 460 },
      ],
    },
    {
      stepNumber: 2,
      module: 'funk_l1',
      section: 'A',
      activity: 'A1.2: In Time',
      targetNotes: [{ midi: 62, onset: 0, duration: 460 }],
    },
  ],
};
`;

const step = (fingers: (number | undefined)[]): LessonStep => ({
  stepNumber: 1,
  module: 'funk_l1',
  section: 'A',
  activity: 'A1.1: D Minor Pentatonic Ascending',
  targetNotes: [
    { midi: 62, onset: 0, finger: fingers[0] },
    { midi: 65, onset: 480, finger: fingers[1] },
    { midi: 67, onset: 960, finger: fingers[2] },
  ],
});

describe('planFingerEdits', () => {
  it('sets, changes and takes out fingers, and touches nothing else', () => {
    const { text, changed, skipped } = planFingerEdits(FILE, 'funk_v2.ts', [
      step([1, 2, undefined]),
    ]);
    expect(changed).toBe(2);
    expect(skipped).toEqual([]);
    expect(text).toBe(
      FILE.replace(
        '{ midi: 62, onset: 0, duration: 460 },',
        '{ midi: 62, onset: 0, duration: 460, finger: 1 },',
      ).replace('finger: 4', 'finger: 2'),
    );
    const cleared = planFingerEdits(FILE, 'funk_v2.ts', [
      step([undefined, undefined, undefined]),
    ]);
    expect(cleared.changed).toBe(1);
    expect(cleared.text).toBe(FILE.replace(', finger: 4', ''));
  });

  it('leaves a file alone where the fingers already agree', () => {
    const { text, changed } = planFingerEdits(FILE, 'funk_v2.ts', [
      step([undefined, 4, undefined]),
    ]);
    expect(changed).toBe(0);
    expect(text).toBe(FILE);
  });

  it('refuses a step whose notes differ from the file', () => {
    const moved = step([1, 2, 3]);
    moved.targetNotes![2].midi = 69;
    const { text, changed, skipped } = planFingerEdits(FILE, 'funk_v2.ts', [
      moved,
    ]);
    expect(changed).toBe(0);
    expect(text).toBe(FILE);
    expect(skipped).toEqual([
      'A1.1: D Minor Pentatonic Ascending: its notes differ from funk_v2.ts',
    ]);
  });

  it('knows a step only by its module, section, number and title', () => {
    const other = { ...step([1, 2, 3]), module: 'funk_l2' };
    const { matched, changed } = planFingerEdits(FILE, 'funk_v2.ts', [other]);
    expect(matched.size).toBe(0);
    expect(changed).toBe(0);
  });
});

describe('writeLessonFingers', () => {
  it('writes the file laid out as the repo lays it out, and says what it did', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lesson-fingers-'));
    const dir = path.join(root, LESSON_DIR);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'funk_v2.ts'), FILE);
    const report = await writeLessonFingers(root, {
      id: 'funk-l1',
      sections: [
        {
          steps: [
            step([1, 2, 3]),
            {
              stepNumber: 9,
              module: 'funk_l1',
              section: 'B',
              activity: 'Not in the file',
              targetNotes: [{ midi: 60, onset: 0, finger: 1 }],
            },
          ],
        },
      ],
    });
    expect(report).toEqual({
      files: [path.join(LESSON_DIR, 'funk_v2.ts')],
      changed: 3,
      skipped: ['Not in the file: not found in the lesson files'],
    });
    const written = await fs.readFile(path.join(dir, 'funk_v2.ts'), 'utf8');
    expect(written).toContain(
      '{ midi: 62, onset: 0, duration: 460, finger: 1 },',
    );
    expect(written).toContain(
      '{ midi: 65, onset: 480, duration: 460, finger: 2 },',
    );
    expect(written).toContain(
      '{ midi: 67, onset: 960, duration: 460, finger: 3 },',
    );
    expect(written).toContain('// L1 — the pocket.');
    await fs.rm(root, { recursive: true, force: true });
  });
});
