import type { Activity } from './types';

export const ACTIVITIES: Activity[] = [
  {
    id: 'act-connect-name-groove',
    phase: 'connectRegulate',
    title: {
      en: 'Name Groove Roll Call',
      es: 'Ronda de Nombres con Groove',
    },
    summary: {
      en: 'Each student states their name in rhythm over a shared groove; class echoes back on the downbeat.',
      es: 'Cada estudiante dice su nombre en ritmo sobre un groove compartido; la clase responde en el primer tiempo.',
    },
    minutes: 5,
    materials: ['metronome or drum loop'],
    cloRefs: ['clo-connect-belonging', 'clo-perform-pulse'],
    themeIds: ['theme-january'],
    source: 'canonical',
  },
  {
    id: 'act-connect-breath-4x4',
    phase: 'connectRegulate',
    title: {
      en: 'Box Breath (4x4)',
      es: 'Respiración Cuadrada (4x4)',
    },
    summary: {
      en: 'Silent 4-count inhale / hold / exhale / hold, cued by a soft ride cymbal on each corner.',
      es: 'Inhalar / sostener / exhalar / sostener en cuatro tiempos, marcado por un platillo suave en cada esquina.',
    },
    minutes: 3,
    materials: ['soft cymbal or hi-hat'],
    cloRefs: ['clo-connect-regulate'],
    themeIds: ['theme-january', 'theme-february', 'theme-march'],
    source: 'canonical',
  },
  {
    id: 'act-practice-call-response-blues',
    phase: 'groupPractice',
    title: {
      en: 'Blues Call & Response',
      es: 'Llamada y Respuesta en Blues',
    },
    summary: {
      en: 'Teacher calls a 4-bar blues phrase; students echo back individually then together — build to a group cycle.',
      es: 'El profesor toca una frase de blues de 4 compases; los estudiantes la repiten en solo y luego en grupo.',
    },
    minutes: 10,
    materials: ['piano or backing track', 'body percussion'],
    cloRefs: ['clo-perform-form', 'clo-connect-belonging'],
    themeIds: ['theme-january', 'theme-february'],
    source: 'canonical',
  },
  {
    id: 'act-practice-migration-map',
    phase: 'groupPractice',
    title: {
      en: 'Migration Sound Map',
      es: 'Mapa Sonoro de la Migración',
    },
    summary: {
      en: 'In small groups, students annotate a US map with cities and the genres that rose there — share what changed sonically at each stop.',
      es: 'En grupos pequeños, anotan un mapa con ciudades y los géneros que surgieron; comparten qué cambió sonoramente en cada parada.',
    },
    minutes: 12,
    materials: ['printed US map', 'listening playlist'],
    cloRefs: ['clo-respond-context', 'clo-connect-heritage'],
    themeIds: ['theme-february'],
    source: 'canonical',
  },
  {
    id: 'act-create-vision-cypher',
    phase: 'creativeProjects',
    title: {
      en: 'Vision Cypher',
      es: 'Cypher de Visión',
    },
    summary: {
      en: 'Students write 4 bars answering "who am I becoming this year?" and share over a shared beat.',
      es: 'Escriben 4 compases respondiendo "¿en quién me estoy convirtiendo este año?" y los comparten sobre un beat común.',
    },
    minutes: 15,
    materials: ['beat / backing track', 'lyric sheet'],
    cloRefs: ['clo-create-identity', 'clo-perform-flow'],
    themeIds: ['theme-january'],
    source: 'canonical',
  },
  {
    id: 'act-create-witness-poem',
    phase: 'creativeProjects',
    title: {
      en: 'Witness Poem',
      es: 'Poema Testigo',
    },
    summary: {
      en: 'Inspired by Billie Holiday\'s "Strange Fruit", students write a spare witness-style poem; set to sparse piano voicings.',
      es: 'Inspirados en "Strange Fruit" de Billie Holiday, escriben un poema testimonial; se acompaña con voicings escasos de piano.',
    },
    minutes: 20,
    materials: ['piano or keys', 'quiet listening space'],
    cloRefs: ['clo-create-restraint', 'clo-respond-context'],
    themeIds: ['theme-march'],
    source: 'canonical',
  },
  {
    id: 'act-share-cypher-showcase',
    phase: 'presentPerform',
    title: {
      en: 'Cypher Showcase',
      es: 'Muestra del Cypher',
    },
    summary: {
      en: 'Volunteers perform their 4 bars over the beat; class snaps on downbeats, no verbal feedback yet.',
      es: 'Voluntarios interpretan sus 4 compases; la clase chasquea los dedos en el primer tiempo, sin comentarios aún.',
    },
    minutes: 8,
    materials: ['mic or amplified space'],
    cloRefs: ['clo-perform-flow', 'clo-connect-belonging'],
    themeIds: ['theme-january'],
    source: 'canonical',
  },
  {
    id: 'act-share-lineage-lineup',
    phase: 'presentPerform',
    title: {
      en: 'Lineage Lineup',
      es: 'Fila de Linaje',
    },
    summary: {
      en: 'Students physically line up in the order of an artist genealogy they researched; one sentence each on who influenced whom.',
      es: 'Los estudiantes se alinean físicamente según la genealogía artística que investigaron; una frase cada uno sobre quién influyó en quién.',
    },
    minutes: 10,
    materials: ['artist research cards'],
    cloRefs: ['clo-respond-context', 'clo-connect-heritage'],
    themeIds: ['theme-february', 'theme-march'],
    source: 'canonical',
  },
  {
    id: 'act-reflect-3-2-1',
    phase: 'respondReflectReset',
    title: {
      en: '3-2-1 Exit',
      es: 'Salida 3-2-1',
    },
    summary: {
      en: 'Three things you noticed, two questions you have, one word for how you feel walking out.',
      es: 'Tres cosas que notaste, dos preguntas que tienes, una palabra sobre cómo te sientes al salir.',
    },
    minutes: 5,
    materials: ['exit slips or shared doc'],
    cloRefs: ['clo-respond-context', 'clo-connect-regulate'],
    themeIds: ['theme-january', 'theme-february', 'theme-march'],
    source: 'canonical',
  },
  {
    id: 'act-reflect-anthem-tag',
    phase: 'respondReflectReset',
    title: {
      en: 'Anthem Tag',
      es: 'Etiqueta del Himno',
    },
    summary: {
      en: 'Each student picks one word from the shared anthem that stayed with them; teacher gathers the words into a word cloud on the board.',
      es: 'Cada estudiante elige una palabra del himno compartido que le haya quedado; el profesor las junta en una nube de palabras.',
    },
    minutes: 5,
    materials: ['anthem playing softly', 'whiteboard or shared doc'],
    cloRefs: ['clo-respond-context'],
    themeIds: ['theme-january', 'theme-february', 'theme-march'],
    source: 'canonical',
  },
];
