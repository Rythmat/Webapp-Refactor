import type { LessonSeed } from './types';

/**
 * Lesson seeds — ready-to-remix Day skeletons. A teacher picks a seed, it
 * fills the five phases with title/prompt hints and a suggested activity
 * list; then the teacher edits from there. Full seed → Day expansion lives
 * with the (future) starter picker; this file just holds the data.
 */
export const LESSON_SEEDS: LessonSeed[] = [
  {
    id: 'seed-vision-dream-cypher',
    title: {
      en: 'Vision, Dream, Cypher',
      es: 'Visión, Sueño, Cypher',
    },
    themeId: 'theme-january',
    overview:
      'Students arrive with a name-groove, learn a blues call-and-response, then write four bars answering "who am I becoming this year?" and share in a class cypher. Reflect with an exit slip and an anthem tag.',
    cellHints: {
      connectRegulate: {
        en: 'Land in the room together — name groove, box breath, quick "how are you arriving?" pulse.',
        es: 'Aterrizar en la sala — groove de nombres, respiración, un pulso rápido de "¿cómo estoy llegando?".',
      },
      groupPractice: {
        en: 'Warm up call-and-response in the blues; get every voice heard once.',
        es: 'Calentar con llamada-y-respuesta en el blues; que cada voz se escuche al menos una vez.',
      },
      creativeProjects: {
        en: 'Write 4 bars — "who am I becoming this year?"',
        es: 'Escribir 4 compases — "¿en quién me estoy convirtiendo este año?"',
      },
      presentPerform: {
        en: 'Cypher over a shared beat. Snaps on downbeats, no comments yet.',
        es: 'Cypher sobre un beat compartido. Chasquidos en el primer tiempo, sin comentarios aún.',
      },
      respondReflectReset: {
        en: "3-2-1 exit slip; one word from today's anthem stays with you.",
        es: 'Salida 3-2-1; una palabra del himno de hoy se queda contigo.',
      },
    },
    suggestedActivityIds: [
      'act-connect-name-groove',
      'act-practice-call-response-blues',
      'act-create-vision-cypher',
      'act-share-cypher-showcase',
      'act-reflect-3-2-1',
    ],
    source: 'canonical',
  },
  {
    id: 'seed-great-migration-sound-map',
    title: {
      en: 'Great Migration Sound Map',
      es: 'Mapa Sonoro de la Gran Migración',
    },
    themeId: 'theme-february',
    overview:
      'Trace the sound of the Great Migration — Delta blues to Chicago to Detroit to Denver to hip hop. Students annotate a map, listen at each stop, and end with a lineage lineup connecting artists across generations.',
    cellHints: {
      connectRegulate: {
        en: 'Box breath under a slow shuffle groove.',
        es: 'Respiración cuadrada bajo un shuffle lento.',
      },
      groupPractice: {
        en: 'Small groups annotate a US map with genres by city.',
        es: 'Pequeños grupos anotan un mapa con géneros por ciudad.',
      },
      creativeProjects: {
        en: 'Pick one city + one artist; write a 3-sentence bio card.',
        es: 'Elegir una ciudad + un artista; escribir una ficha de tres frases.',
      },
      presentPerform: {
        en: 'Lineage Lineup — line up in influence order and read a sentence.',
        es: 'Fila de Linaje — alinearse por orden de influencia y leer una frase.',
      },
      respondReflectReset: {
        en: 'Anthem tag: one word from the anthem plays out the door.',
        es: 'Etiqueta del himno: una palabra del himno sale por la puerta.',
      },
    },
    suggestedActivityIds: [
      'act-connect-breath-4x4',
      'act-practice-migration-map',
      'act-share-lineage-lineup',
      'act-reflect-anthem-tag',
    ],
    source: 'canonical',
  },
  {
    id: 'seed-women-who-changed-the-sound',
    title: {
      en: 'Women Who Changed the Sound',
      es: 'Mujeres que Cambiaron el Sonido',
    },
    themeId: 'theme-march',
    overview:
      'Center women artists whose voices reshaped music. Class listens to Billie Holiday\'s "Strange Fruit" — students write a witness-style poem, then share in a low-lit space with sparse piano voicings underneath.',
    cellHints: {
      connectRegulate: {
        en: 'Silent breath — no groove yet, hold the room quiet.',
        es: 'Respiración en silencio — sin groove todavía, mantener la sala tranquila.',
      },
      groupPractice: {
        en: 'Guided listening — "Strange Fruit". What do you hear, what do you feel?',
        es: 'Escucha guiada — "Strange Fruit". ¿Qué escuchas, qué sientes?',
      },
      creativeProjects: {
        en: 'Write a witness-style poem — spare lines, no explanations.',
        es: 'Escribir un poema testimonial — líneas escasas, sin explicaciones.',
      },
      presentPerform: {
        en: 'Share in a low-lit space with sparse piano voicings.',
        es: 'Compartir en un espacio con poca luz y voicings escasos de piano.',
      },
      respondReflectReset: {
        en: '3-2-1 exit — hold the weight, no rush.',
        es: 'Salida 3-2-1 — sostener el peso, sin prisas.',
      },
    },
    suggestedActivityIds: [
      'act-connect-breath-4x4',
      'act-create-witness-poem',
      'act-share-cypher-showcase',
      'act-reflect-3-2-1',
    ],
    source: 'canonical',
  },
];
