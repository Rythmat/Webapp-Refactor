import type { FeelingsLevel, LocalizedText, StudentLanguage } from '../types';

// ── The emotional check-in (owner, 2026-11-09) ──────────────────────────────
// Connect opens every lesson by asking students how they are arriving. The
// teacher picks how fine-grained the answer is:
//
//   simple    five faces, angry → great (Emotion-scale.png)
//   advanced  nine faces in a 3×3 grid (the hand-drawn emotion grid)
//   complex   Plutchik's wheel: eight feelings × three strengths, and any two
//             of them named as the feeling they make together (the "dyads")
//   energy    a slider (owner, 2026-11-10): low energy on the left (sad,
//             tired, shy), regulated in the middle (focused, relaxed, ready
//             to learn), high energy on the right (excited, anxious, angry);
//             cool colours to greens to warm
//
// A student's answer is one stable string, so the response pipeline, the
// server and the CSV carry it unchanged as `{kind:'check-in', value}`:
//
//   simple:great · advanced:silly · wheel:joy:1 · wheel:joy:2+trust:1 ·
//   energy:72 (0 low … 100 high)
//
// Check-ins are teacher-eyes-only (Rule 2): nothing here reaches a projector.
// Colour is meaning here, so each feeling carries its own (semantic, not the
// brand's — none of these is a brand yellow).

export const FEELINGS_LEVELS: readonly FeelingsLevel[] = [
  'energy',
  'simple',
  'advanced',
  'complex',
];

export const FEELINGS_LEVEL_LABEL: Readonly<Record<FeelingsLevel, string>> = {
  energy: 'Energy',
  simple: 'Simple',
  advanced: 'Advanced',
  complex: 'Complex',
};

/** What a teacher gets at each level, for the picker's hint. */
export const FEELINGS_LEVEL_HINT: Readonly<Record<FeelingsLevel, string>> = {
  energy: 'A slider: low energy, regulated, high energy.',
  simple: 'Five faces, from angry to great.',
  advanced: 'Nine faces, for more ways to feel.',
  complex: 'The feelings wheel: eight feelings, three strengths, and blends.',
};

// ── Energy (a slider) ───────────────────────────────────────────────────────

export type EnergyZoneId = 'low' | 'regulated' | 'high';

export interface EnergyZone {
  id: EnergyZoneId;
  label: LocalizedText;
  /** Where it starts and ends on the slider, 0–100. */
  from: number;
  to: number;
}

export const ENERGY_ZONES: readonly EnergyZone[] = [
  {
    id: 'low',
    label: { en: 'Low energy', es: 'Poca energía' },
    from: 0,
    to: 100 / 3,
  },
  {
    id: 'regulated',
    label: { en: 'Regulated', es: 'En calma' },
    from: 100 / 3,
    to: 200 / 3,
  },
  {
    id: 'high',
    label: { en: 'High energy', es: 'Mucha energía' },
    from: 200 / 3,
    to: 100,
  },
];

/**
 * The slider's colours, left to right: cool (blue, cyan) for low energy,
 * greens for regulated, warm (orange, red) for high. None is a brand yellow.
 */
export const ENERGY_STOPS: readonly { at: number; color: string }[] = [
  { at: 0, color: '#6366f1' },
  { at: 0.17, color: '#3b82f6' },
  { at: 0.3, color: '#22d3ee' },
  { at: 0.42, color: '#34d399' },
  { at: 0.5, color: '#22c55e' },
  { at: 0.6, color: '#84cc16' },
  { at: 0.72, color: '#fb923c' },
  { at: 0.86, color: '#f97316' },
  { at: 1, color: '#ef4444' },
];

/** The slider's colours as a CSS gradient, left to right. */
export const ENERGY_GRADIENT = `linear-gradient(to right, ${ENERGY_STOPS.map(
  (s) => `${s.color} ${Math.round(s.at * 100)}%`,
).join(', ')})`;

const hex = (h: string) =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** The slider's colour at a value, 0–100. */
export const energyColor = (value: number): string => {
  const t = Math.min(1, Math.max(0, value / 100));
  const i = Math.max(
    1,
    ENERGY_STOPS.findIndex((s) => s.at >= t),
  );
  const a = ENERGY_STOPS[i - 1]!;
  const b = ENERGY_STOPS[i]!;
  const k = (t - a.at) / (b.at - a.at || 1);
  const [r, g, bl] = hex(a.color).map((c, j) =>
    Math.round(c + (hex(b.color)[j]! - c) * k),
  );
  return `rgb(${r}, ${g}, ${bl})`;
};

/** The zone a value falls in. */
export const energyZone = (value: number): EnergyZone =>
  ENERGY_ZONES.find((z) => value <= z.to) ?? ENERGY_ZONES[2]!;

/**
 * The feelings along the slider, by how much energy each carries (owner,
 * 2026-11-10: "research emotions and place a few on the slider"). The owner's
 * nine (sad, tired, shy; focused, relaxed, confident, which took "ready to
 * learn"'s place on 2026-11-10; excited, anxious, angry) and three more from the Zones of Regulation (bored, happy,
 * frustrated), ordered low to high as Russell's circumplex orders arousal
 * (tired lowest, angry highest), each inside its zone. Hidden on the slider
 * until a student slides onto one; none is the "right" place to be.
 */
export interface EnergyEmotion {
  id: string;
  /** Where it sits on the slider, 0–100. */
  at: number;
  word: LocalizedText;
  face: FaceKind;
}

export const ENERGY_EMOTIONS: readonly EnergyEmotion[] = [
  { id: 'tired', at: 6, word: { en: 'Tired', es: 'Cansado' }, face: 'tired' },
  { id: 'sad', at: 15, word: { en: 'Sad', es: 'Triste' }, face: 'sad' },
  { id: 'bored', at: 23, word: { en: 'Bored', es: 'Aburrido' }, face: 'okay' },
  { id: 'shy', at: 30, word: { en: 'Shy', es: 'Tímido' }, face: 'embarrassed' },
  {
    id: 'relaxed',
    at: 39,
    word: { en: 'Relaxed', es: 'Relajado' },
    face: 'calm',
  },
  { id: 'happy', at: 47, word: { en: 'Happy', es: 'Feliz' }, face: 'great' },
  {
    id: 'focused',
    at: 54,
    word: { en: 'Focused', es: 'Concentrado' },
    face: 'good',
  },
  {
    id: 'confident',
    at: 61,
    word: { en: 'Confident', es: 'Seguro' },
    face: 'confident',
  },
  {
    id: 'excited',
    at: 71,
    word: { en: 'Excited', es: 'Emocionado' },
    face: 'excited',
  },
  {
    id: 'anxious',
    at: 79,
    word: { en: 'Anxious', es: 'Ansioso' },
    face: 'nervous',
  },
  {
    id: 'frustrated',
    at: 87,
    word: { en: 'Frustrated', es: 'Frustrado' },
    face: 'stressed',
  },
  { id: 'angry', at: 95, word: { en: 'Angry', es: 'Enojado' }, face: 'angry' },
];

/** The feeling a slider position falls on: the nearest, each owning the
 *  stretch from the midpoint before it to the midpoint after it. */
export const energyEmotion = (value: number): EnergyEmotion => {
  let best = ENERGY_EMOTIONS[0]!;
  for (const e of ENERGY_EMOTIONS)
    if (Math.abs(e.at - value) < Math.abs(best.at - value)) best = e;
  return best;
};

/** The feeling's name at a slider position. */
export const energyWord = (value: number): LocalizedText =>
  energyEmotion(value).word;

/** The answer string for a slider position, 0–100. */
export const energyValue = (value: number): string =>
  `energy:${Math.round(Math.min(100, Math.max(0, value)))}`;

// ── Faces (simple + advanced) ───────────────────────────────────────────────

/** The line drawing on a face; `FeelingFace` draws each. */
export type FaceKind =
  | 'angry'
  | 'sad'
  | 'okay'
  | 'good'
  | 'great'
  | 'grumpy'
  | 'stressed'
  | 'excited'
  | 'loving'
  | 'silly'
  | 'embarrassed'
  | 'confident'
  | 'wiped-out'
  | 'nervous'
  | 'tired'
  | 'calm';

export interface FaceFeeling {
  id: string;
  label: LocalizedText;
  color: string;
  face: FaceKind;
}

const face = (
  id: FaceKind,
  en: string,
  es: string,
  color: string,
): FaceFeeling => ({ id, label: { en, es }, color, face: id });

/** Angry → great, coloured red → green. */
export const SIMPLE_FEELINGS: readonly FaceFeeling[] = [
  face('angry', 'Angry', 'Enojado', '#E5484D'),
  face('sad', 'Sad', 'Triste', '#F0883E'),
  face('okay', 'Okay', 'Más o menos', '#F5C84B'),
  face('good', 'Good', 'Bien', '#C3D95B'),
  face('great', 'Great', 'Genial', '#7CC05A'),
];

/** The 3×3 grid, row by row, as the reference draws it. */
export const ADVANCED_FEELINGS: readonly FaceFeeling[] = [
  face('grumpy', 'Grumpy', 'Gruñón', '#E5484D'),
  face('stressed', 'Stressed', 'Estresado', '#F0883E'),
  face('excited', 'Excited', 'Emocionado', '#F5C84B'),
  face('loving', 'Loving', 'Cariñoso', '#F28CB1'),
  face('silly', 'Silly', 'Juguetón', '#A8D46F'),
  face('embarrassed', 'Embarrassed', 'Avergonzado', '#F4A28C'),
  face('confident', 'Confident', 'Seguro', '#4FB3E0'),
  face('wiped-out', 'Wiped out', 'Agotado', '#A493C8'),
  face('nervous', 'Nervous', 'Nervioso', '#45B98A'),
];

const FACES: Readonly<Record<'simple' | 'advanced', readonly FaceFeeling[]>> = {
  simple: SIMPLE_FEELINGS,
  advanced: ADVANCED_FEELINGS,
};

// ── The wheel (complex) ─────────────────────────────────────────────────────

/** Plutchik's eight, clockwise from the top of the wheel. */
export const PRIMARY_IDS = [
  'joy',
  'trust',
  'fear',
  'surprise',
  'sadness',
  'disgust',
  'anger',
  'anticipation',
] as const;

export type PrimaryId = (typeof PRIMARY_IDS)[number];

/** 1 = mild (the wheel's outer ring), 2 = the feeling, 3 = intense (inner). */
export type Intensity = 1 | 2 | 3;

export const INTENSITIES: readonly Intensity[] = [1, 2, 3];

export interface Shade {
  label: LocalizedText;
  color: string;
}

export interface Primary {
  id: PrimaryId;
  /** Mild, the feeling, intense — indexed by `Intensity - 1`. */
  shades: readonly [Shade, Shade, Shade];
}

const shade = (en: string, es: string, color: string): Shade => ({
  label: { en, es },
  color,
});

export const PRIMARIES: Readonly<Record<PrimaryId, Primary>> = {
  joy: {
    id: 'joy',
    shades: [
      shade('Serenity', 'Serenidad', '#FBE7A1'),
      shade('Joy', 'Alegría', '#F9D45C'),
      shade('Ecstasy', 'Éxtasis', '#F2BE12'),
    ],
  },
  trust: {
    id: 'trust',
    shades: [
      shade('Acceptance', 'Aceptación', '#CFE39C'),
      shade('Trust', 'Confianza', '#A8CF68'),
      shade('Admiration', 'Admiración', '#82B83F'),
    ],
  },
  fear: {
    id: 'fear',
    shades: [
      shade('Apprehension', 'Aprensión', '#86CDA3'),
      shade('Fear', 'Miedo', '#3DB87A'),
      shade('Terror', 'Terror', '#079F55'),
    ],
  },
  surprise: {
    id: 'surprise',
    shades: [
      shade('Distraction', 'Distracción', '#90CDE7'),
      shade('Surprise', 'Sorpresa', '#3FB2DD'),
      shade('Amazement', 'Asombro', '#0B92C9'),
    ],
  },
  sadness: {
    id: 'sadness',
    shades: [
      shade('Pensiveness', 'Melancolía', '#A8C3E8'),
      shade('Sadness', 'Tristeza', '#73A3D8'),
      shade('Grief', 'Duelo', '#2F7BC2'),
    ],
  },
  disgust: {
    id: 'disgust',
    shades: [
      shade('Boredom', 'Aburrimiento', '#C3B4DB'),
      shade('Disgust', 'Asco', '#A493C8'),
      shade('Loathing', 'Aversión', '#8770B4'),
    ],
  },
  anger: {
    id: 'anger',
    shades: [
      shade('Annoyance', 'Molestia', '#F5A59C'),
      shade('Anger', 'Enojo', '#F2737A'),
      shade('Rage', 'Furia', '#EB5160'),
    ],
  },
  anticipation: {
    id: 'anticipation',
    shades: [
      shade('Interest', 'Interés', '#F9C894'),
      shade('Anticipation', 'Anticipación', '#F6AD64'),
      shade('Vigilance', 'Vigilancia', '#F08F35'),
    ],
  },
};

export const shadeOf = (primary: PrimaryId, intensity: Intensity): Shade =>
  PRIMARIES[primary].shades[intensity - 1];

/** The feeling's own name (the middle ring): "Joy", "Trust"… */
export const primaryLabel = (primary: PrimaryId): LocalizedText =>
  shadeOf(primary, 2).label;

/** Steps apart around the wheel: 1 (neighbours) … 4 (opposites). */
export const wheelDistance = (a: PrimaryId, b: PrimaryId): number => {
  const d = Math.abs(PRIMARY_IDS.indexOf(a) - PRIMARY_IDS.indexOf(b));
  return Math.min(d, PRIMARY_IDS.length - d);
};

export interface Dyad {
  id: string;
  label: LocalizedText;
  /** 1 primary (neighbours), 2 secondary, 3 tertiary — Plutchik's names. */
  kind: 1 | 2 | 3;
}

const pairKey = (a: PrimaryId, b: PrimaryId): string =>
  [a, b]
    .sort((x, y) => PRIMARY_IDS.indexOf(x) - PRIMARY_IDS.indexOf(y))
    .join('+');

const dyad = (
  a: PrimaryId,
  b: PrimaryId,
  en: string,
  es: string,
): [string, Omit<Dyad, 'kind'>] => [
  pairKey(a, b),
  { id: en.toLowerCase(), label: { en, es } },
];

/** Every blend, as the reference wheel names them. */
const DYADS = new Map<string, Omit<Dyad, 'kind'>>([
  // Neighbours.
  dyad('joy', 'trust', 'Love', 'Amor'),
  dyad('trust', 'fear', 'Submission', 'Sumisión'),
  dyad('fear', 'surprise', 'Awe', 'Sobrecogimiento'),
  dyad('surprise', 'sadness', 'Disapproval', 'Desaprobación'),
  dyad('sadness', 'disgust', 'Remorse', 'Remordimiento'),
  dyad('disgust', 'anger', 'Contempt', 'Desprecio'),
  dyad('anger', 'anticipation', 'Aggressiveness', 'Agresividad'),
  dyad('anticipation', 'joy', 'Optimism', 'Optimismo'),
  // One apart.
  dyad('anticipation', 'trust', 'Hope', 'Esperanza'),
  dyad('joy', 'fear', 'Guilt', 'Culpa'),
  dyad('trust', 'surprise', 'Curiosity', 'Curiosidad'),
  dyad('fear', 'sadness', 'Shame', 'Vergüenza'),
  dyad('surprise', 'disgust', 'Unbelief', 'Incredulidad'),
  dyad('sadness', 'anger', 'Envy', 'Envidia'),
  dyad('disgust', 'anticipation', 'Cynicism', 'Cinismo'),
  dyad('anger', 'joy', 'Pride', 'Orgullo'),
  // Two apart.
  dyad('anger', 'trust', 'Defensiveness', 'Actitud defensiva'),
  dyad('anticipation', 'fear', 'Anxiety', 'Ansiedad'),
  dyad('joy', 'surprise', 'Delight', 'Deleite'),
  dyad('trust', 'sadness', 'Sentimentality', 'Sentimentalismo'),
  dyad('fear', 'disgust', 'Repugnance', 'Repugnancia'),
  dyad('surprise', 'anger', 'Outrage', 'Indignación'),
  dyad('sadness', 'anticipation', 'Pessimism', 'Pesimismo'),
  dyad('disgust', 'joy', 'Morbidness', 'Morbo'),
]);

/** Opposite feelings felt at once: Plutchik names no blend for these. */
export const MIXED_FEELINGS: LocalizedText = {
  en: 'Mixed feelings',
  es: 'Sentimientos encontrados',
};

/** The blend two feelings make, or null for opposites (and for one feeling). */
export const dyadOf = (a: PrimaryId, b: PrimaryId): Dyad | null => {
  if (a === b) return null;
  const found = DYADS.get(pairKey(a, b));
  if (!found) return null;
  return { ...found, kind: wheelDistance(a, b) as Dyad['kind'] };
};

/** All 24 blends (for tests and the teacher's legend). */
export const allDyads = (): Dyad[] =>
  PRIMARY_IDS.flatMap((a, i) =>
    PRIMARY_IDS.slice(i + 1)
      .map((b) => dyadOf(a, b))
      .filter((d): d is Dyad => d !== null),
  );

// ── Answers ─────────────────────────────────────────────────────────────────

export interface WheelPick {
  primary: PrimaryId;
  intensity: Intensity;
}

export type ParsedFeeling =
  | { level: 'simple' | 'advanced'; feeling: FaceFeeling }
  | { level: 'complex'; picks: WheelPick[]; blend: Dyad | null }
  | { level: 'energy'; value: number; zone: EnergyZone };

const isPrimary = (v: string): v is PrimaryId =>
  (PRIMARY_IDS as readonly string[]).includes(v);

/** The answer string for a face. */
export const faceValue = (
  level: 'simple' | 'advanced',
  feeling: Pick<FaceFeeling, 'id'>,
): string => `${level}:${feeling.id}`;

/**
 * The answer string for one or two wheel picks. Two picks on the same feeling
 * collapse to the first; the pair is written in wheel order, so the same two
 * feelings always make the same string.
 */
export const wheelValue = (picks: readonly WheelPick[]): string => {
  const unique = picks.filter(
    (p, i) => picks.findIndex((q) => q.primary === p.primary) === i,
  );
  const sorted = unique
    .slice(0, 2)
    .sort(
      (a, b) => PRIMARY_IDS.indexOf(a.primary) - PRIMARY_IDS.indexOf(b.primary),
    );
  return `wheel:${sorted.map((p) => `${p.primary}:${p.intensity}`).join('+')}`;
};

/** Read an answer back; null for anything that isn't a feelings answer. */
export const parseFeeling = (value: string): ParsedFeeling | null => {
  const [level, rest] = [
    value.slice(0, value.indexOf(':')),
    value.slice(value.indexOf(':') + 1),
  ];
  if (level === 'simple' || level === 'advanced') {
    const feeling = FACES[level].find((f) => f.id === rest);
    return feeling ? { level, feeling } : null;
  }
  if (level === 'energy') {
    if (!/^\d{1,3}$/.test(rest)) return null;
    const value = Number(rest);
    return value <= 100 ? { level, value, zone: energyZone(value) } : null;
  }
  if (level !== 'wheel' || !rest) return null;
  const picks: WheelPick[] = [];
  for (const part of rest.split('+')) {
    const [primary, n] = part.split(':');
    const intensity = Number(n);
    if (!isPrimary(primary) || ![1, 2, 3].includes(intensity)) return null;
    picks.push({ primary, intensity: intensity as Intensity });
  }
  if (picks.length === 0 || picks.length > 2) return null;
  if (picks.length === 2 && picks[0].primary === picks[1].primary) return null;
  return {
    level: 'complex',
    picks,
    blend:
      picks.length === 2 ? dyadOf(picks[0].primary, picks[1].primary) : null,
  };
};

const pick = (text: LocalizedText, lang: StudentLanguage): string =>
  lang === 'es' && text.es ? text.es : text.en;

export interface FeelingDescription {
  /** The name: "Great", "Serenity", "Love", "Mixed feelings". */
  label: string;
  /** What it's made of, when that says more: "Serenity + Acceptance". */
  detail?: string;
  /** One colour (a blend's is its first feeling's). */
  color: string;
  /** Both colours, for a blend. */
  colors: string[];
}

/**
 * An answer in words, for the teacher's live view, the session report, Review
 * and the CSV. Null for an answer from an older check-in tool (an emoji, a
 * number, a word), which callers show as it is.
 */
export const describeFeeling = (
  value: string,
  lang: StudentLanguage = 'en',
): FeelingDescription | null => {
  const parsed = parseFeeling(value);
  if (!parsed) return null;
  if (parsed.level === 'energy') {
    const color = energyColor(parsed.value);
    return {
      label: pick(energyWord(parsed.value), lang),
      detail: pick(parsed.zone.label, lang),
      color,
      colors: [color],
    };
  }
  if (parsed.level !== 'complex') {
    return {
      label: pick(parsed.feeling.label, lang),
      color: parsed.feeling.color,
      colors: [parsed.feeling.color],
    };
  }
  const shades = parsed.picks.map((p) => shadeOf(p.primary, p.intensity));
  const names = shades.map((s) => pick(s.label, lang));
  if (parsed.picks.length === 1) {
    const [p] = parsed.picks;
    const strength =
      p.intensity === 1 ? 'mild' : p.intensity === 3 ? 'intense' : null;
    return {
      label: names[0],
      ...(strength && lang !== 'es'
        ? {
            detail: `${strength} ${pick(primaryLabel(p.primary), 'en').toLowerCase()}`,
          }
        : {}),
      color: shades[0].color,
      colors: [shades[0].color],
    };
  }
  return {
    label: pick(parsed.blend?.label ?? MIXED_FEELINGS, lang),
    detail: names.join(' + '),
    color: shades[0].color,
    colors: shades.map((s) => s.color),
  };
};

// ── The class, together (teacher-only) ──────────────────────────────────────

export interface FeelingAnswer {
  value: string;
  /** The student's name, as the teacher's roster shows it. */
  name: string;
}

export interface FeelingTally {
  /** A face id, a primary id, or a blend's id. */
  key: string;
  names: string[];
}

export interface ClassMood {
  /** Simple / advanced: students per face, in the level's order. */
  faces: FeelingTally[];
  /** Complex: students per feeling (a blend counts toward both of its own). */
  primaries: FeelingTally[];
  /** Complex: the blends students named, most common first. */
  blends: FeelingTally[];
  /** Answers made with another tool (an older check-in), kept as written. */
  other: FeelingTally[];
  /** Energy: each student where they put the slider, 0–100. */
  points: { value: number; name: string }[];
  total: number;
}

const tallyInto = (map: Map<string, string[]>, key: string, name: string) => {
  const names = map.get(key) ?? [];
  if (!names.includes(name)) names.push(name);
  map.set(key, names);
};

/** How the class is arriving, grouped for the teacher. */
export const buildClassMood = (
  answers: readonly FeelingAnswer[],
  level: FeelingsLevel,
): ClassMood => {
  const faces = new Map<string, string[]>();
  const primaries = new Map<string, string[]>();
  const blends = new Map<string, string[]>();
  const other = new Map<string, string[]>();
  const points: { value: number; name: string }[] = [];

  for (const { value, name } of answers) {
    const parsed = parseFeeling(value);
    // An answer made with another tool (an older check-in, or a level the
    // teacher has since changed) is kept as written rather than dropped.
    if (!parsed || parsed.level !== level) {
      tallyInto(other, value, name);
    } else if (parsed.level === 'energy') {
      tallyInto(faces, parsed.zone.id, name);
      points.push({ value: parsed.value, name });
    } else if (parsed.level !== 'complex') {
      tallyInto(faces, parsed.feeling.id, name);
    } else {
      for (const p of parsed.picks) tallyInto(primaries, p.primary, name);
      if (parsed.picks.length === 2) {
        tallyInto(blends, parsed.blend?.id ?? 'mixed', name);
      }
    }
  }

  const ordered = (keys: readonly string[], map: Map<string, string[]>) =>
    keys.map((key) => ({ key, names: map.get(key) ?? [] }));
  const byCount = (map: Map<string, string[]>) =>
    [...map.entries()]
      .map(([key, names]) => ({ key, names }))
      .sort(
        (a, b) => b.names.length - a.names.length || a.key.localeCompare(b.key),
      );

  return {
    faces:
      level === 'complex'
        ? []
        : level === 'energy'
          ? ordered(
              ENERGY_ZONES.map((z) => z.id),
              faces,
            )
          : ordered(
              FACES[level].map((f) => f.id),
              faces,
            ),
    primaries: level === 'complex' ? ordered(PRIMARY_IDS, primaries) : [],
    blends: byCount(blends),
    other: byCount(other),
    points: points.sort((a, b) => a.value - b.value),
    total: answers.length,
  };
};

/** A blend's display name from its tally key ("love" → "Love"). */
export const blendLabel = (key: string): LocalizedText =>
  key === 'mixed'
    ? MIXED_FEELINGS
    : ([...DYADS.values()].find((d) => d.id === key)?.label ?? { en: key });

/** The faces of a face level, for the pickers and the class view. */
export const facesFor = (level: 'simple' | 'advanced') => FACES[level];
