import { describe, expect, it } from 'vitest';
import {
  ADVANCED_FEELINGS,
  PRIMARIES,
  PRIMARY_IDS,
  SIMPLE_FEELINGS,
  allDyads,
  buildClassMood,
  describeFeeling,
  dyadOf,
  faceValue,
  parseFeeling,
  wheelDistance,
  wheelValue,
} from './feelings';

const BRAND_YELLOWS = /#(FFCC33|FFB219|F2920C|FFE873|FFF9B2)\b/i;

describe('the three levels', () => {
  it('have five faces, nine faces, and eight feelings × three strengths', () => {
    expect(SIMPLE_FEELINGS.map((f) => f.label.en)).toEqual([
      'Angry',
      'Sad',
      'Okay',
      'Good',
      'Great',
    ]);
    expect(ADVANCED_FEELINGS).toHaveLength(9);
    expect(PRIMARY_IDS).toHaveLength(8);
    for (const id of PRIMARY_IDS) expect(PRIMARIES[id].shades).toHaveLength(3);
  });

  it('name everything in English and Spanish, in colour, never brand yellow', () => {
    const all = [
      ...SIMPLE_FEELINGS.map((f) => ({ label: f.label, color: f.color })),
      ...ADVANCED_FEELINGS.map((f) => ({ label: f.label, color: f.color })),
      ...PRIMARY_IDS.flatMap((id) => PRIMARIES[id].shades),
    ];
    for (const { label, color } of all) {
      expect(label.es, label.en).toBeTruthy();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(color).not.toMatch(BRAND_YELLOWS);
    }
  });
});

describe('the wheel’s blends', () => {
  it('names all 24 pairs that are not opposites, as the reference does', () => {
    const dyads = allDyads();
    expect(dyads).toHaveLength(24);
    expect(new Set(dyads.map((d) => d.id)).size).toBe(24);
    expect(dyadOf('joy', 'trust')?.label.en).toBe('Love');
    expect(dyadOf('trust', 'joy')?.label.en).toBe('Love');
    expect(dyadOf('anticipation', 'joy')).toMatchObject({
      id: 'optimism',
      kind: 1,
    });
    expect(dyadOf('fear', 'sadness')).toMatchObject({ id: 'shame', kind: 2 });
    expect(dyadOf('anger', 'trust')).toMatchObject({
      id: 'defensiveness',
      kind: 3,
    });
  });

  it('names no blend for opposites', () => {
    expect(wheelDistance('joy', 'sadness')).toBe(4);
    expect(dyadOf('joy', 'sadness')).toBeNull();
    expect(dyadOf('surprise', 'anticipation')).toBeNull();
  });
});

describe('answers', () => {
  it('round-trip faces', () => {
    const value = faceValue('advanced', { id: 'silly' });
    expect(value).toBe('advanced:silly');
    expect(parseFeeling(value)).toMatchObject({
      level: 'advanced',
      feeling: { id: 'silly' },
    });
  });

  it('write two wheel picks in wheel order, whatever order they were tapped', () => {
    const value = wheelValue([
      { primary: 'trust', intensity: 1 },
      { primary: 'joy', intensity: 2 },
    ]);
    expect(value).toBe('wheel:joy:2+trust:1');
    expect(parseFeeling(value)).toMatchObject({
      level: 'complex',
      blend: { id: 'love' },
    });
    // The same feeling twice is one pick.
    expect(
      wheelValue([
        { primary: 'joy', intensity: 1 },
        { primary: 'joy', intensity: 3 },
      ]),
    ).toBe('wheel:joy:1');
  });

  it('refuse anything else', () => {
    for (const bad of [
      '😀',
      '3',
      'Ready',
      'simple:ecstatic',
      'wheel:',
      'wheel:joy:4',
      'wheel:joy:1+joy:2',
      'wheel:joy:1+trust:1+fear:1',
    ])
      expect(parseFeeling(bad), bad).toBeNull();
  });

  it('read as words for the teacher', () => {
    expect(describeFeeling('simple:great')).toMatchObject({ label: 'Great' });
    expect(describeFeeling('simple:great', 'es')?.label).toBe('Genial');
    expect(describeFeeling('wheel:joy:1')).toMatchObject({
      label: 'Serenity',
      detail: 'mild joy',
    });
    expect(describeFeeling('wheel:joy:2')).toEqual({
      label: 'Joy',
      color: PRIMARIES.joy.shades[1].color,
      colors: [PRIMARIES.joy.shades[1].color],
    });
    expect(describeFeeling('wheel:joy:1+trust:1')).toMatchObject({
      label: 'Love',
      detail: 'Serenity + Acceptance',
    });
    expect(describeFeeling('wheel:joy:2+sadness:2')?.label).toBe(
      'Mixed feelings',
    );
    expect(describeFeeling('😀')).toBeNull();
  });
});

describe('the class mood', () => {
  it('lists who feels what, by face, in the level’s order', () => {
    const mood = buildClassMood(
      [
        { value: 'simple:great', name: 'Ana' },
        { value: 'simple:sad', name: 'Ben' },
        { value: 'simple:great', name: 'Cy' },
        { value: '😀', name: 'Dee' },
        { value: 'advanced:silly', name: 'Eve' },
      ],
      'simple',
    );
    expect(mood.total).toBe(5);
    expect(mood.faces.map((f) => [f.key, f.names])).toEqual([
      ['angry', []],
      ['sad', ['Ben']],
      ['okay', []],
      ['good', []],
      ['great', ['Ana', 'Cy']],
    ]);
    // Answers from another tool are kept, not dropped.
    expect(mood.other.map((o) => o.key).sort()).toEqual(
      ['advanced:silly', '😀'].sort(),
    );
  });

  it('counts a blend toward both feelings, and lists the blends', () => {
    const mood = buildClassMood(
      [
        { value: 'wheel:joy:1+trust:2', name: 'Ana' },
        { value: 'wheel:joy:3', name: 'Ben' },
        { value: 'wheel:joy:2+trust:1', name: 'Cy' },
        { value: 'wheel:joy:2+sadness:2', name: 'Dee' },
      ],
      'complex',
    );
    const joy = mood.primaries.find((p) => p.key === 'joy');
    expect(joy?.names).toEqual(['Ana', 'Ben', 'Cy', 'Dee']);
    expect(mood.blends).toEqual([
      { key: 'love', names: ['Ana', 'Cy'] },
      { key: 'mixed', names: ['Dee'] },
    ]);
  });
});
