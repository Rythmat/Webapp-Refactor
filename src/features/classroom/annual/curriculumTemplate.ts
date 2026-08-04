/**
 * Canonical Music Atlas annual curriculum — the tree a teacher can clone into
 * their classroom on first visit to the Annual Plan page.
 *
 * Structure: Year → Semester (Autumn/Spring) → Unit (monthly) → Day stubs.
 * 24 units × ~180 stubs total — enough to cover a full US school year of
 * ~180 instructional days once the calendar auto-distributes them across
 * school days.
 *
 * Every stub cites:
 *   - `songId` — snake_case id from `/src/curriculum/data/songs/` (~650 tracks).
 *     Used to surface a `/songs/<id>` link inside the Connect prompt.
 *   - `globeEventIds` — id(s) from `MUSIC_HISTORY` in `/src/components/atlas/
 *     data/events/`. Rendered as `module: 'globe'` LaunchTile(s) on the
 *     Connect cell — clicking one deep-links into `/atlas?event=<id>`.
 *
 * Themes are referenced by `themeId` — the Unit page resolves them at render
 * time through `useThemeBank().byId(...)`. Genre and location units use
 * their own themes added to `content/themes.ts`.
 */
import type { PhaseKey } from '../phases';
import type { LocalizedText, Semester } from '../types';

export interface DayStub {
  slug: string;
  label: string;
  phaseSeeds: Partial<Record<PhaseKey, LocalizedText>>;
  /** Snake_case Song id from `/src/curriculum/data/songs/`. */
  songId?: string;
  /** Globe event ids from MUSIC_HISTORY. */
  globeEventIds?: string[];
}

/** Discriminates units by their pedagogical lens. */
export type UnitKind = 'heritage' | 'genre' | 'location';

export interface UnitTemplate {
  slug: string;
  label: string;
  monthIndex: number;
  themeId: string;
  dateWindow?: { start: string; end: string };
  dayStubs: DayStub[];
  kind?: UnitKind;
  focusGenre?: string;
  focusLocation?: string;
  focusEra?: string;
}

export interface SemesterTemplate {
  semester: Semester;
  label: string;
  units: UnitTemplate[];
}

export interface AnnualPlanTemplate {
  id: string;
  label: string;
  autumn: SemesterTemplate;
  spring: SemesterTemplate;
}

/** Terse per-phase authoring helper. Each tuple is `[en, es]`. */
export const phaseSeeds = (
  connect: [string, string],
  practice: [string, string],
  create: [string, string],
  share: [string, string],
  reflect: [string, string],
): Partial<Record<PhaseKey, LocalizedText>> => ({
  connectRegulate: { en: connect[0], es: connect[1] },
  groupPractice: { en: practice[0], es: practice[1] },
  creativeProjects: { en: create[0], es: create[1] },
  presentPerform: { en: share[0], es: share[1] },
  respondReflectReset: { en: reflect[0], es: reflect[1] },
});

/** Bilingual sugar for one-off strings inside stubs. */
export const bi = (en: string, es: string): LocalizedText => ({ en, es });

// ============================================================================
// AUTUMN — HERITAGE UNITS (Aug – Dec)
// ============================================================================

const AUG_WELCOME: UnitTemplate = {
  slug: 'aug-welcome',
  label: 'Welcome & Class Culture',
  monthIndex: 8,
  themeId: 'theme-august',
  // School starts Aug 24 — anchor the first unit (and lesson Day 1) there
  // instead of the first weekday of August. Its 10 school days run to ~Sep 4.
  dateWindow: { start: '08-24', end: '09-04' },
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'aug-day-1',
      label: 'Day 1 — Sonic Introductions',
      songId: 'lovely_day',
      globeEventIds: ['evt-funk-la-1975-earth-wind-fire'],
      phaseSeeds: phaseSeeds(
        [
          'Class Playlist Shuffle. Bill Withers "Lovely Day" opens.',
          'Playlist de la clase. Bill Withers "Lovely Day" abre la sesión.',
        ],
        [
          'Turn & Talk — "What sound describes how you show up?"',
          'Habla y comparte — "¿Qué sonido te describe cuando entras?"',
        ],
        [
          'Personal sound-selfie in two sentences.',
          'Un "selfie sonoro" en dos oraciones.',
        ],
        ['One track, one sentence.', 'Una canción, una frase.'],
        [
          "What surprised you about someone else's sound?",
          '¿Qué te sorprendió del sonido de otra persona?',
        ],
      ),
    },
    {
      slug: 'aug-day-2',
      label: 'Day 2 — IMPACT Roles',
      songId: 'lean_on_me',
      globeEventIds: ['evt-soul-memphis-1962'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Bill Withers "Lean on Me". IMPACT framing.',
          'Foco Artístico — Bill Withers "Lean on Me". Marco IMPACT.',
        ],
        [
          'Introduce Ambassador / Performer / Producer roles.',
          'Presenta los roles Embajador / Intérprete / Productor.',
        ],
        [
          'Choose the role that matches today.',
          'Elige el rol que resuena hoy.',
        ],
        [
          'Which role are you drawn to and why?',
          '¿Qué rol te atrae y por qué?',
        ],
        [
          'What one skill do you want to build this year?',
          '¿Qué habilidad quieres desarrollar este año?',
        ],
      ),
    },
    {
      slug: 'aug-day-3',
      label: 'Day 3 — Class Norms as a Groove',
      songId: 'we_are_family',
      globeEventIds: ['evt-funk-nyc-1978-chic-le-freak'],
      phaseSeeds: phaseSeeds(
        [
          'Group listen — Sister Sledge "We Are Family".',
          'Escucha grupal — Sister Sledge "We Are Family".',
        ],
        [
          'Co-write class norms as a rhythmic call & response.',
          'Co-escribe las normas como llamada y respuesta rítmica.',
        ],
        [
          'Small groups turn norms into an 8-bar chant.',
          'En grupos pequeños, convierten las normas en un canto de 8 compases.',
        ],
        ['Perform for the room.', 'Interpreten para la clase.'],
        [
          'Which norm will be hardest? Which will be easiest?',
          '¿Qué norma será la más difícil? ¿Cuál la más fácil?',
        ],
      ),
    },
    {
      slug: 'aug-day-4',
      label: 'Day 4 — What is Music Atlas?',
      songId: 'stand_by_me',
      globeEventIds: ['evt-soul-memphis-1962'],
      phaseSeeds: phaseSeeds(
        [
          'Tour the four Atlas modules: Globe, Learn, Studio, Arcade.',
          'Recorrido de los cuatro módulos del Atlas: Globo, Aprender, Estudio, Arcade.',
        ],
        [
          'Each module in a mini demo — Globe first.',
          'Cada módulo en un mini demo — Globo primero.',
        ],
        [
          'Pick one module you want to explore today.',
          'Elige un módulo para explorar hoy.',
        ],
        [
          'Share what you found on the Globe.',
          'Comparte lo que encontraste en el Globo.',
        ],
        [
          "What does music let you say that words alone don't?",
          '¿Qué te permite decir la música que las palabras no?',
        ],
      ),
    },
    {
      slug: 'aug-day-5',
      label: 'Day 5 — Sound Journal Kickoff',
      songId: 'blackbird',
      globeEventIds: ['evt-jazz-billie-holiday-nyc-1939'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — The Beatles "Blackbird". A song about listening.',
          'Escucha grupal — The Beatles "Blackbird". Una canción sobre escuchar.',
        ],
        [
          'Start your Sound Journal — one page per week.',
          'Comienza tu Diario Sonoro — una página por semana.',
        ],
        [
          'Log the first sound you hear tomorrow morning.',
          'Registra el primer sonido que oigas mañana por la mañana.',
        ],
        ['Read one entry aloud.', 'Lee una entrada en voz alta.'],
        [
          'What do you notice you had been missing?',
          '¿Qué notas que habías estado ignorando?',
        ],
      ),
    },
    {
      slug: 'aug-day-6',
      label: 'Day 6 — Class Playlist Deep-Dive',
      songId: 'walking_on_sunshine',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'Class Playlist Shuffle — Katrina & the Waves "Walking on Sunshine".',
          'Playlist de la clase — Katrina & the Waves "Walking on Sunshine".',
        ],
        [
          'Turn & Talk about the "energy" of the track.',
          'Habla y comparte sobre la "energía" del tema.',
        ],
        [
          'Pick a favorite track and describe it in three adjectives.',
          'Elige una canción favorita y descríbela en tres adjetivos.',
        ],
        [
          'Read your three adjectives aloud.',
          'Lee tus tres adjetivos en voz alta.',
        ],
        [
          'What did the room learn about you through your picks?',
          '¿Qué aprendió el salón de ti por tus elecciones?',
        ],
      ),
    },
    {
      slug: 'aug-day-7',
      label: 'Day 7 — Studio Warm-Up',
      songId: 'happy',
      globeEventIds: ['evt-motown-detroit-1963'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Pharrell Williams "Happy".',
          'Foco Artístico — Pharrell Williams "Happy".',
        ],
        [
          'Open the Studio — tour the beat maker and mixer.',
          'Abre el Estudio — recorre el creador de beats y el mezclador.',
        ],
        [
          'Program a 2-bar joy loop.',
          'Programa un loop de alegría de 2 compases.',
        ],
        ['Playback in pairs.', 'Reproducción en parejas.'],
        [
          'What did opening the Studio unlock for you?',
          '¿Qué desbloqueó abrir el Estudio?',
        ],
      ),
    },
    {
      slug: 'aug-day-8',
      label: 'Day 8 — Turn & Talk Ensembles',
      songId: 'hey_soul_sister',
      globeEventIds: ['evt-funk-la-1975-earth-wind-fire'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Train "Hey, Soul Sister".',
          'Escucha grupal — Train "Hey, Soul Sister".',
        ],
        [
          'Small groups — invent a two-line class chant.',
          'Grupos pequeños — inventen un canto de dos líneas.',
        ],
        [
          'Add a body percussion layer.',
          'Añade una capa de percusión corporal.',
        ],
        ['Trade chants between groups.', 'Intercambien cantos entre grupos.'],
        [
          'Which group felt the most in sync?',
          '¿Qué grupo se sintió más sincronizado?',
        ],
      ),
    },
    {
      slug: 'aug-day-9',
      label: 'Day 9 — Group Sing-Along',
      songId: 'hey_jude',
      globeEventIds: ['evt-jazz-armstrong-hotfive-chicago-1925'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — The Beatles "Hey Jude" na-na-nas.',
          'Escucha grupal — los "na-na-na" de The Beatles "Hey Jude".',
        ],
        [
          'Learn the chorus melody in unison.',
          'Aprende la melodía del coro al unísono.',
        ],
        [
          'Layer harmony in thirds with a partner.',
          'Añade armonía en terceras con un compañero.',
        ],
        ['Full class sing.', 'Canto de toda la clase.'],
        [
          "What did singing together do that talking couldn't?",
          '¿Qué hizo cantar juntos que hablar no podía?',
        ],
      ),
    },
    {
      slug: 'aug-day-10',
      label: 'Day 10 — Semester Goal Setting',
      songId: 'dont_stop_believin',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Journey "Don\'t Stop Believin\'".',
          'Escucha grupal — Journey "Don\'t Stop Believin\'".',
        ],
        [
          'Write one musical goal and one class goal for the semester.',
          'Escribe una meta musical y una meta de clase.',
        ],
        [
          'Draft a two-line personal mission statement.',
          'Escribe una declaración de misión en dos líneas.',
        ],
        ['Post goals on the class wall.', 'Publica las metas en la pared.'],
        [
          'Whose goal challenged you to think bigger?',
          '¿Qué meta te retó a pensar más grande?',
        ],
      ),
    },
  ],
};

const SEP_HHM: UnitTemplate = {
  slug: 'sept-hhm',
  label: 'Hispanic Heritage Month',
  monthIndex: 9,
  themeId: 'theme-september',
  dateWindow: { start: '09-15', end: '10-15' },
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'sept-day-1',
      label: 'Day 1 — Selena "Como La Flor"',
      globeEventIds: ['evt-mariachi-mexicocity-1950'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Selena. Turn & Talk on the double meaning.',
          'Foco Artístico — Selena. Habla y comparte sobre el doble sentido.',
        ],
        ['Cumbia rhythm at the piano.', 'Ritmo de cumbia al piano.'],
        [
          'Write a two-line verse using an image from your life.',
          'Escribe un verso de dos líneas con una imagen de tu vida.',
        ],
        ['Read your line aloud.', 'Lee tu verso en voz alta.'],
        [
          'What did Selena carry across borders?',
          '¿Qué llevó Selena consigo al cruzar fronteras?',
        ],
      ),
    },
    {
      slug: 'sept-day-2',
      label: 'Day 2 — Cumbia Roots',
      songId: 'oye_como_va',
      globeEventIds: ['evt-cumbia-barranquilla-1962'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Tito Puente / Santana "Oye Como Va".',
          'Foco Artístico — Tito Puente / Santana "Oye Como Va".',
        ],
        [
          'Cumbia rhythm variations — Colombia to Mexico.',
          'Variaciones de cumbia — Colombia a México.',
        ],
        [
          'Group project — build a two-part cumbia beat.',
          'Proyecto grupal — construye un beat de cumbia en dos partes.',
        ],
        ['Perform in a round.', 'Interpreten en ronda.'],
        [
          'How does a rhythm travel between countries?',
          '¿Cómo viaja un ritmo entre países?',
        ],
      ),
    },
    {
      slug: 'sept-day-3',
      label: 'Day 3 — La Oreja de Van Gogh "Rosas"',
      globeEventIds: ['evt-latin-streaming-mexicocity-2023'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — La Oreja de Van Gogh "Rosas".',
          'Foco Artístico — La Oreja de Van Gogh "Rosas".',
        ],
        [
          'Identify instruments and the central metaphor.',
          'Identifica los instrumentos y la metáfora central.',
        ],
        [
          'Rewrite the chorus with a metaphor from your culture.',
          'Reescribe el coro con una metáfora de tu cultura.',
        ],
        ['Read your new chorus.', 'Lee tu coro nuevo.'],
        [
          'What does the word "rosas" mean to you now?',
          '¿Qué significa la palabra "rosas" para ti ahora?',
        ],
      ),
    },
    {
      slug: 'sept-day-4',
      label: 'Day 4 — Bad Bunny & Reggaetón Now',
      songId: 'despacito',
      globeEventIds: ['evt-reggaeton-san-juan-2004'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — modern reggaetón. Bad Bunny frames identity.',
          'Escucha grupal — reggaetón moderno. Bad Bunny enmarca identidad.',
        ],
        ['Break down the dembow rhythm.', 'Descompón el ritmo dembow.'],
        [
          'Draft a 4-bar reggaetón hook.',
          'Escribe un hook de reggaetón de 4 compases.',
        ],
        ['Peer feedback in pairs.', 'Retroalimentación en parejas.'],
        [
          'How does the genre carry Puerto Rican pride worldwide?',
          '¿Cómo lleva el género el orgullo puertorriqueño al mundo?',
        ],
      ),
    },
    {
      slug: 'sept-day-5',
      label: 'Day 5 — Bilingual Songwriting Studio',
      globeEventIds: ['evt-latin-streaming-mexicocity-2023'],
      phaseSeeds: phaseSeeds(
        [
          'Discuss songs that switch languages mid-verse.',
          'Conversen sobre canciones que cambian de idioma en el verso.',
        ],
        [
          'Study code-switching in Spanglish lyrics.',
          'Estudia el cambio de código en letras en Spanglish.',
        ],
        [
          'Write a two-line bilingual hook.',
          'Escribe un hook bilingüe de dos líneas.',
        ],
        [
          'Share and swap for peer edits.',
          'Comparte e intercambia para edición en parejas.',
        ],
        [
          'Which language carried which emotion?',
          '¿Qué idioma llevó qué emoción?',
        ],
      ),
    },
    {
      slug: 'sept-day-6',
      label: 'Day 6 — Bachata Roots — Dominican Voice',
      globeEventIds: [
        'evt-bachata-santodomingo-1962',
        'evt-bachata-santodomingo-1980',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Bachata — the Dominican romantic guitar tradition.',
          'Bachata — la tradición romántica de guitarra dominicana.',
        ],
        [
          'Feel the 4/4 syncopated guitar and güira.',
          'Siente el 4/4 sincopado de guitarra y güira.',
        ],
        [
          'Write a two-line bachata verse of longing.',
          'Escribe un verso de bachata de anhelo.',
        ],
        [
          'Read aloud with the pulse in mind.',
          'Lee en voz alta con el pulso en mente.',
        ],
        [
          'What did the countryside carry into the city?',
          '¿Qué llevó el campo a la ciudad?',
        ],
      ),
    },
    {
      slug: 'sept-day-7',
      label: 'Day 7 — Merengue & Dance Floors',
      globeEventIds: [
        'evt-merengue-santodomingo-1958',
        'evt-merengue-nyc-1985',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Merengue — the accordion, tambora, and güira drive.',
          'Merengue — el acordeón, la tambora y la güira empujan.',
        ],
        [
          'Program the merengue drum pattern.',
          'Programa el patrón de merengue.',
        ],
        [
          'Draft a two-bar merengue horn hook.',
          'Escribe un hook de metales de merengue de dos compases.',
        ],
        ['Perform as an ensemble.', 'Interpreten en ensamble.'],
        [
          'What did dance-floor tempo demand of the song?',
          '¿Qué exigió la pista al ritmo?',
        ],
      ),
    },
    {
      slug: 'sept-day-8',
      label: 'Day 8 — Rosalía & New Flamenco',
      globeEventIds: [
        'evt-rosalia-el-mal-querer-2018',
        'evt-rosalia-sanjuan-2018',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Rosalía — flamenco meets pop production.',
          'Rosalía — flamenco se cruza con la producción pop.',
        ],
        [
          'Study palmas + hand claps as pulse.',
          'Estudia las palmas como pulso.',
        ],
        [
          'Write a two-line hook with a flamenco cadence.',
          'Escribe un hook con cadencia flamenca.',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          'What did tradition let her break in the studio?',
          '¿Qué tradición la dejó romper en el estudio?',
        ],
      ),
    },
    {
      slug: 'sept-day-9',
      label: 'Day 9 — Selena Legacy',
      globeEventIds: ['evt-selena-amor-prohibido-1994'],
      phaseSeeds: phaseSeeds(
        [
          'Selena "Amor Prohibido" — the album that owned Tejano.',
          'Selena "Amor Prohibido" — el disco que reinó en el Tejano.',
        ],
        [
          'Study her mix of cumbia, pop, and mariachi.',
          'Estudia su mezcla de cumbia, pop y mariachi.',
        ],
        [
          'Write a two-line tribute to a woman you admire.',
          'Escribe un tributo a una mujer que admiras.',
        ],
        ['Read the line aloud.', 'Lee la línea en voz alta.'],
        [
          'What did her voice claim for Tejano?',
          '¿Qué reclamó su voz para el Tejano?',
        ],
      ),
    },
    {
      slug: 'sept-day-10',
      label: 'Day 10 — Bilingual Poetry & Nueva Trova',
      globeEventIds: ['evt-mercedes-sosa-tucuman-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Mercedes Sosa & the Nueva Canción — Latin protest through poetry.',
          'Mercedes Sosa y la Nueva Canción — protesta latina en poesía.',
        ],
        [
          'Study her phrasing, breath, and pauses.',
          'Estudia su fraseo, respiración y pausas.',
        ],
        [
          'Write a bilingual poem about home.',
          'Escribe un poema bilingüe sobre el hogar.',
        ],
        ['Read one stanza aloud.', 'Lee una estrofa en voz alta.'],
        [
          'What does poetry do that a chorus does not?',
          '¿Qué hace la poesía que un coro no?',
        ],
      ),
    },
  ],
};

const OCT_INDIGENOUS_DDLM: UnitTemplate = {
  slug: 'oct-indigenous-ddlm',
  label: "Indigenous Peoples' Day & Día de los Muertos",
  monthIndex: 10,
  themeId: 'theme-october',
  dateWindow: { start: '10-12', end: '11-02' },
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'oct-day-1',
      label: "Day 1 — Indigenous Peoples' Day",
      globeEventIds: ['evt-aboriginal-melbourne-1991'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Buffy Sainte-Marie or A Tribe Called Red.',
          'Foco Artístico — Buffy Sainte-Marie o A Tribe Called Red.',
        ],
        [
          'Listen for drum, voice, and sample layers.',
          'Escucha las capas de tambor, voz y muestras.',
        ],
        [
          'Choose an Indigenous-led track — write a two-sentence response.',
          'Elige una canción indígena — escribe una respuesta de dos oraciones.',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        [
          'Whose land are we making music on?',
          '¿En qué tierra estamos haciendo música?',
        ],
      ),
    },
    {
      slug: 'oct-day-2',
      label: 'Day 2 — Halloween Arc',
      songId: 'thriller',
      globeEventIds: ['evt-pop-losangeles-1982-michaeljackson'],
      phaseSeeds: phaseSeeds(
        [
          'Class Halloween Playlist Shuffle — Vincent Price to Doja Cat.',
          'Playlist de Halloween — Vincent Price a Doja Cat.',
        ],
        [
          'Group project — remix a spooky riff at the piano.',
          'Proyecto grupal — remix a un riff siniestro al piano.',
        ],
        ['Add sound design in the DAW.', 'Añade diseño sonoro en el DAW.'],
        ['Play back your riff.', 'Reproduce tu riff.'],
        [
          'What is scary in sound vs scary in story?',
          '¿Qué asusta en el sonido vs en la historia?',
        ],
      ),
    },
    {
      slug: 'oct-day-3',
      label: 'Day 3 — Día de los Muertos I',
      globeEventIds: ['evt-mariachi-mexicocity-1950'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Lila Downs "La Llorona".',
          'Foco Artístico — Lila Downs "La Llorona".',
        ],
        [
          'Identify pulse and lament structure.',
          'Identifica el pulso y la estructura del lamento.',
        ],
        [
          'Write a two-line ofrenda for someone to remember.',
          'Escribe una ofrenda de dos líneas para alguien que quieras recordar.',
        ],
        ['Read one line aloud.', 'Lee una línea en voz alta.'],
        [
          'How does a song hold a person past their life?',
          '¿Cómo sostiene una canción a una persona más allá de su vida?',
        ],
      ),
    },
    {
      slug: 'oct-day-4',
      label: 'Day 4 — Día de los Muertos II',
      globeEventIds: ['evt-mariachi-mexicocity-1950'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Chavela Vargas or Café Tacvba.',
          'Foco Artístico — Chavela Vargas o Café Tacvba.',
        ],
        [
          'In pairs, sketch a remembrance-song arrangement.',
          'En parejas, bocetea un arreglo de canción de recuerdo.',
        ],
        [
          'Record a voice-and-piano take in the Studio.',
          'Graba una toma de voz y piano en el Estudio.',
        ],
        [
          'Anonymous playback via the projector.',
          'Reproducción anónima por el proyector.',
        ],
        [
          'What did the room feel like after we listened?',
          '¿Cómo se sintió el salón tras escuchar?',
        ],
      ),
    },
    {
      slug: 'oct-day-5',
      label: 'Day 5 — Mardi Gras Indians & Diaspora Roots',
      globeEventIds: ['evt-diaspora-nola-mardi-gras-indians-1885'],
      phaseSeeds: phaseSeeds(
        [
          'Mardi Gras Indians — a New Orleans tradition of Afro-Indigenous alliance.',
          'Los "Mardi Gras Indians" — una tradición afroindígena de Nueva Orleans.',
        ],
        [
          'Listen for call-and-response and tambourine.',
          'Escucha la llamada-respuesta y la pandereta.',
        ],
        [
          'Write a two-line chant claiming belonging.',
          'Escribe un canto de dos líneas de pertenencia.',
        ],
        ['Perform in a circle.', 'Interpreten en círculo.'],
        [
          'What did those two lineages carry together?',
          '¿Qué llevaron juntos esos dos linajes?',
        ],
      ),
    },
    {
      slug: 'oct-day-6',
      label: 'Day 6 — Powwow Drum Study',
      globeEventIds: ['evt-aboriginal-melbourne-1991'],
      phaseSeeds: phaseSeeds(
        [
          'The Powwow drum — voices around one heartbeat.',
          'El tambor Powwow — voces alrededor de un latido.',
        ],
        ['Feel the steady four-count.', 'Siente el conteo de cuatro.'],
        [
          'Draft a two-line honor song in your language.',
          'Escribe una canción de honor de dos líneas en tu idioma.',
        ],
        ['Read in a circle.', 'Lee en círculo.'],
        [
          'What did centering the drum change?',
          '¿Qué cambió centrar el tambor?',
        ],
      ),
    },
    {
      slug: 'oct-day-7',
      label: 'Day 7 — Ofrenda Songwriting Studio',
      globeEventIds: ['evt-mariachi-mexicocity-1950'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Lila Downs or Café Tacvba ofrenda track.',
          'Escucha grupal — pista ofrenda de Lila Downs o Café Tacvba.',
        ],
        [
          'Sketch an ofrenda-song outline — verse, chorus, remembrance.',
          'Boceta una canción-ofrenda — verso, coro, recuerdo.',
        ],
        [
          'Draft the chorus with a name to remember.',
          'Escribe el coro con un nombre para recordar.',
        ],
        ['Peer share.', 'Comparte en parejas.'],
        [
          'What did naming do that memory alone did not?',
          '¿Qué hizo nombrar que solo recordar no?',
        ],
      ),
    },
    {
      slug: 'oct-day-8',
      label: 'Day 8 — Digital Community Altar',
      globeEventIds: ['evt-latin-streaming-mexicocity-2023'],
      phaseSeeds: phaseSeeds(
        [
          'Modern digital altars — songs and photos on shared feeds.',
          'Altares digitales — canciones y fotos en feeds compartidos.',
        ],
        [
          'Curate a class digital ofrenda playlist.',
          'Curen una playlist de ofrenda digital.',
        ],
        [
          'Add one song per student with a two-line reason.',
          'Añade una canción por estudiante con dos líneas de razón.',
        ],
        ['Class playback.', 'Reproducción.'],
        ['What is a playlist as an altar?', '¿Qué es una playlist como altar?'],
      ),
    },
    {
      slug: 'oct-day-9',
      label: 'Day 9 — Coco & the Family Song',
      globeEventIds: ['evt-mariachi-mexicocity-1950'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — the arc of "Remember Me" through Coco.',
          'Escucha grupal — el arco de "Remember Me" en Coco.',
        ],
        [
          'Study its chord movement and slow reveal.',
          'Estudia su movimiento armónico y su revelación lenta.',
        ],
        [
          'Write a two-line "please remember me" verse for family.',
          'Escribe un verso "por favor recuérdame" para la familia.',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        [
          'What did the film argue about forgetting?',
          '¿Qué argumentó la película sobre olvidar?',
        ],
      ),
    },
    {
      slug: 'oct-day-10',
      label: 'Day 10 — Contemporary Indigenous Artists',
      globeEventIds: [
        'evt-diaspora-nola-mardi-gras-indians-1885',
        'evt-aboriginal-melbourne-1991',
      ],
      phaseSeeds: phaseSeeds(
        [
          'A Tribe Called Red, Jeremy Dutcher, Buffy Sainte-Marie today.',
          'A Tribe Called Red, Jeremy Dutcher, Buffy Sainte-Marie hoy.',
        ],
        [
          'Study a modern Indigenous production choice.',
          'Estudia una decisión de producción indígena moderna.',
        ],
        ['Draft a two-line homage.', 'Escribe un homenaje.'],
        ['Class playback.', 'Reproducción.'],
        [
          'What did the modern artist carry forward?',
          '¿Qué llevó adelante el artista moderno?',
        ],
      ),
    },
  ],
};

const NOV_COMPASSION: UnitTemplate = {
  slug: 'nov-compassion',
  label: 'Compassion, Gratitude & Native American Heritage',
  monthIndex: 11,
  themeId: 'theme-november',
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'nov-day-1',
      label: 'Day 1 — Compassion Warm-Up',
      songId: 'lean_on_me',
      globeEventIds: ['evt-soul-memphis-1962'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Bill Withers "Lean On Me".',
          'Foco Artístico — Bill Withers "Lean On Me".',
        ],
        [
          'Turn & Talk about a time someone leaned on you.',
          'Habla y comparte sobre una vez que alguien se apoyó en ti.',
        ],
        ['Two-line thank-you lyric.', 'Dos líneas de agradecimiento.'],
        ['Peer read-back.', 'Lectura en parejas.'],
        [
          'What does compassion sound like in a chorus?',
          '¿Cómo suena la compasión en un coro?',
        ],
      ),
    },
    {
      slug: 'nov-day-2',
      label: 'Day 2 — Gratitude Groove',
      songId: 'as',
      globeEventIds: ['evt-funk-detroit-1972-stevie-wonder-superstition'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Stevie Wonder "As".',
          'Escucha grupal — Stevie Wonder "As".',
        ],
        [
          'Build a gratitude groove at the piano.',
          'Construye un groove de gratitud al piano.',
        ],
        [
          'In small groups, layer claps and one chord change.',
          'En grupos pequeños, añade palmas y un cambio de acorde.',
        ],
        ['Perform for the class.', 'Interpreten para la clase.'],
        [
          'Who came to mind while you played?',
          '¿En quién pensaste mientras tocabas?',
        ],
      ),
    },
    {
      slug: 'nov-day-3',
      label: 'Day 3 — Native American Heritage',
      globeEventIds: ['evt-aboriginal-melbourne-1991'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — John Trudell or Robbie Robertson.',
          'Foco Artístico — John Trudell o Robbie Robertson.',
        ],
        [
          'Discuss land, place, and voice.',
          'Conversen sobre tierra, lugar y voz.',
        ],
        [
          'Name the land where you make music — one sentence.',
          'Nombra la tierra donde haces música — una oración.',
        ],
        ['Read one sentence.', 'Lee una oración.'],
        [
          'How does naming land change how you listen?',
          '¿Cómo cambia nombrar la tierra tu forma de escuchar?',
        ],
      ),
    },
    {
      slug: 'nov-day-4',
      label: 'Day 4 — Sacred Sound & Ceremony',
      globeEventIds: ['evt-diaspora-nola-mardi-gras-indians-1885'],
      phaseSeeds: phaseSeeds(
        [
          'Study sacred song traditions — Powwow drum, Native flute.',
          'Estudia tradiciones sagradas — tambor Powwow, flauta nativa.',
        ],
        [
          'Compare pulse rates and breath phrasing.',
          'Compara pulsos y fraseo respiratorio.',
        ],
        [
          'Write a short intention-song without words.',
          'Escribe una canción-intención breve sin palabras.',
        ],
        [
          'Play it aloud, no explanation.',
          'Tócala en voz alta, sin explicación.',
        ],
        [
          'What did wordless sound carry?',
          '¿Qué llevó el sonido sin palabras?',
        ],
      ),
    },
    {
      slug: 'nov-day-5',
      label: 'Day 5 — Family Song Share',
      songId: 'thank_you_falettinme_be_mice_elf_again',
      globeEventIds: ['evt-funk-sf-1969-sly-stone-stand'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Sly & The Family Stone "Thank You".',
          'Escucha grupal — Sly & The Family Stone "Thank You".',
        ],
        [
          'Bring a song from a family member — describe it.',
          'Trae una canción de un familiar — descríbela.',
        ],
        [
          'Write two lines about that song.',
          'Escribe dos líneas sobre esa canción.',
        ],
        [
          'Share the song and the two lines.',
          'Comparte la canción y las dos líneas.',
        ],
        [
          "What did you learn about someone else's family through their song?",
          '¿Qué aprendiste de otra familia a través de su canción?',
        ],
      ),
    },
    {
      slug: 'nov-day-6',
      label: 'Day 6 — Reciprocity Circle',
      songId: 'as',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'Turn the room into a gratitude circle.',
          'Convierte el salón en un círculo de gratitud.',
        ],
        [
          'Turn & Talk about receiving vs. giving.',
          'Habla y comparte sobre recibir vs. dar.',
        ],
        [
          'Write a two-line thank-you addressed to a classmate.',
          'Escribe dos líneas de agradecimiento a un compañero.',
        ],
        [
          'Trade cards and read in silence.',
          'Intercambia tarjetas y lee en silencio.',
        ],
        [
          'What shifted between the giving and the receiving?',
          '¿Qué cambió entre dar y recibir?',
        ],
      ),
    },
    {
      slug: 'nov-day-7',
      label: 'Day 7 — Land Acknowledgment Song',
      globeEventIds: ['evt-aboriginal-melbourne-1991'],
      phaseSeeds: phaseSeeds(
        [
          'Study a musical land acknowledgment from Turtle Island.',
          'Estudia un reconocimiento de tierras musical de Turtle Island.',
        ],
        [
          'Draft a two-line acknowledgment for your city.',
          'Escribe un reconocimiento de dos líneas para tu ciudad.',
        ],
        [
          'Set it to a simple pentatonic melody.',
          'Ponlo sobre una melodía pentatónica simple.',
        ],
        ['Sing together.', 'Canten juntos.'],
        [
          'What did the melody help you say?',
          '¿Qué te ayudó a decir la melodía?',
        ],
      ),
    },
    {
      slug: 'nov-day-8',
      label: 'Day 8 — Community Choir',
      songId: 'higher_ground',
      globeEventIds: ['evt-gospel-jackson-1965'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Stevie Wonder "Higher Ground".',
          'Escucha grupal — Stevie Wonder "Higher Ground".',
        ],
        ['Rehearse a 3-part harmony chorus.', 'Ensaya un coro a tres partes.'],
        ['Add a bass anchor and hand claps.', 'Añade ancla de bajo y palmas.'],
        ['Perform for the room.', 'Interpreten para la clase.'],
        [
          'What lifted when the whole class sang?',
          '¿Qué se elevó cuando cantó toda la clase?',
        ],
      ),
    },
    {
      slug: 'nov-day-9',
      label: 'Day 9 — Family Songs Continued',
      songId: 'stand_by_me',
      globeEventIds: ['evt-soul-memphis-1962'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Ben E. King "Stand By Me".',
          'Escucha grupal — Ben E. King "Stand By Me".',
        ],
        [
          'Bring one song from a grandparent.',
          'Trae una canción de un abuelo.',
        ],
        [
          'Write two lines about the room your grandparent sang in.',
          'Escribe dos líneas sobre el salón donde cantó tu abuelo.',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        [
          "What memory did another family's song wake in you?",
          '¿Qué recuerdo despertó la canción de otra familia?',
        ],
      ),
    },
    {
      slug: 'nov-day-10',
      label: 'Day 10 — Compassion Studio Draft',
      globeEventIds: ['evt-motown-detroit-1963'],
      phaseSeeds: phaseSeeds(
        [
          'Warm-up — a class-favorite gratitude track.',
          'Calentamiento — una canción de gratitud favorita.',
        ],
        [
          'Studio time — draft a "compassion" 30-second track.',
          'Estudio — boceta una pista de "compasión" de 30 segundos.',
        ],
        [
          'Layer a soft pad, a beat, and a spoken word line.',
          'Añade un pad suave, un beat y una línea hablada.',
        ],
        ['Anonymous playback.', 'Reproducción anónima.'],
        [
          "What did the class recognize in each other's tracks?",
          '¿Qué se reconoció la clase en las pistas de los demás?',
        ],
      ),
    },
  ],
};

const DEC_REFLECTION: UnitTemplate = {
  slug: 'dec-reflection',
  label: 'Reflection & Winter Term Close',
  monthIndex: 12,
  themeId: 'theme-december',
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'dec-day-1',
      label: 'Day 1 — Semester Portrait',
      songId: 'what_a_wonderful_world',
      globeEventIds: ['evt-jazz-billie-holiday-nyc-1939'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Louis Armstrong "What a Wonderful World".',
          'Foco Artístico — Louis Armstrong "What a Wonderful World".',
        ],
        [
          'Journal — what changed in you since August?',
          'Diario — ¿qué cambió en ti desde agosto?',
        ],
        [
          'Choose the one song that describes this semester of you.',
          'Elige la canción que describe tu semestre.',
        ],
        [
          'Share the song and one sentence.',
          'Comparte la canción y una razón.',
        ],
        [
          'What are you carrying into the new year?',
          '¿Qué llevas contigo al año nuevo?',
        ],
      ),
    },
    {
      slug: 'dec-day-2',
      label: 'Day 2 — Winter Solstice Sound',
      globeEventIds: ['evt-folk-andorra-1990'],
      phaseSeeds: phaseSeeds(
        [
          'Solstice traditions across cultures — songs of light.',
          'Tradiciones del solsticio — canciones de luz.',
        ],
        [
          'Compare the sound of dark vs light in a track.',
          'Compara el sonido de oscuridad vs luz en una canción.',
        ],
        [
          'Compose a one-minute solstice loop.',
          'Compón un loop de solsticio de un minuto.',
        ],
        ['Play it back.', 'Reproduce.'],
        [
          'What did rest sound like on your loop?',
          '¿Cómo sonó el descanso en tu loop?',
        ],
      ),
    },
    {
      slug: 'dec-day-3',
      label: 'Day 3 — Home Songs',
      songId: 'home',
      globeEventIds: ['evt-folk-yaren-1968'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Edward Sharpe "Home".',
          'Escucha grupal — Edward Sharpe "Home".',
        ],
        [
          'Turn & Talk — what does home sound like?',
          'Habla y comparte — ¿cómo suena el hogar?',
        ],
        [
          'Two-line lyric about a place you go to rest.',
          'Dos líneas sobre un lugar donde descansas.',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        [
          "What sound would tell you you're home?",
          '¿Qué sonido te diría que estás en casa?',
        ],
      ),
    },
    {
      slug: 'dec-day-4',
      label: 'Day 4 — End-of-Term Studio Draft',
      globeEventIds: ['evt-funk-la-1975-earth-wind-fire'],
      phaseSeeds: phaseSeeds(
        [
          'Warm-up — a favorite class track.',
          'Calentamiento — una canción favorita.',
        ],
        [
          'Draft your first end-of-year Studio track.',
          'Escribe el primer borrador de tu pista final.',
        ],
        [
          'Add layers — beat, chord, hook.',
          'Añade capas — beat, acorde, hook.',
        ],
        ['Play the sketch.', 'Reproduce el boceto.'],
        ["What is one thing you'll polish?", '¿Qué vas a pulir?'],
      ),
    },
    {
      slug: 'dec-day-5',
      label: 'Day 5 — Winter Share Day',
      globeEventIds: ['evt-jazz-billie-holiday-nyc-1939'],
      phaseSeeds: phaseSeeds(
        [
          'Class-generated end-of-semester playlist.',
          'Playlist de fin de semestre creada por la clase.',
        ],
        ['Rehearse project drafts.', 'Ensaya los borradores de proyectos.'],
        ['Finish and export your project.', 'Termina y exporta tu proyecto.'],
        ['Community listen-back.', 'Escucha comunitaria.'],
        [
          'What did this class build together?',
          '¿Qué construyó esta clase junta?',
        ],
      ),
    },
    {
      slug: 'dec-day-6',
      label: 'Day 6 — Portfolio Journal',
      songId: 'blackbird',
      globeEventIds: ['evt-jazz-billie-holiday-nyc-1939'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Beatles "Blackbird" once more.',
          'Escucha grupal — Beatles "Blackbird" otra vez.',
        ],
        [
          'Curate your semester Sound Journal — pick 5 entries.',
          'Cura tu Diario Sonoro del semestre — elige 5 entradas.',
        ],
        [
          'Write a two-sentence "Why this one?" note per entry.',
          'Escribe una nota de dos oraciones por cada entrada.',
        ],
        ['Share one entry with the class.', 'Comparte una entrada.'],
        [
          'What does the shape of your semester listening say?',
          '¿Qué dice la forma de tu escucha del semestre?',
        ],
      ),
    },
    {
      slug: 'dec-day-7',
      label: 'Day 7 — Year in Listening Review',
      songId: 'what_a_wonderful_world',
      globeEventIds: ['evt-jazz-armstrong-hotfive-chicago-1925'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Louis Armstrong closes the semester.',
          'Escucha grupal — Louis Armstrong cierra el semestre.',
        ],
        [
          'Build a "Top 10 Songs of My Semester" list.',
          'Construye una lista "Top 10 del Semestre".',
        ],
        [
          'Sequence the list — what tells your story?',
          'Ordena la lista — ¿qué cuenta tu historia?',
        ],
        ['Share the top track.', 'Comparte la pista #1.'],
        [
          'What did you not know about yourself in August?',
          '¿Qué no sabías de ti en agosto?',
        ],
      ),
    },
    {
      slug: 'dec-day-8',
      label: 'Day 8 — Winter Share Rehearsal',
      globeEventIds: ['evt-motown-detroit-1963'],
      phaseSeeds: phaseSeeds(
        [
          'Warm up with a class-favorite groove.',
          'Calentamiento con un groove favorito.',
        ],
        [
          'Rehearse Share Day project running orders.',
          'Ensaya el orden del Share Day.',
        ],
        ['Do two full run-throughs.', 'Hagan dos ensayos completos.'],
        ['Peer feedback at stations.', 'Retroalimentación en estaciones.'],
        [
          'What still needs work before Share Day?',
          '¿Qué falta pulir antes del Share Day?',
        ],
      ),
    },
    {
      slug: 'dec-day-9',
      label: 'Day 9 — Class Anthem Draft',
      songId: 'we_are_family',
      globeEventIds: ['evt-funk-nyc-1978-chic-le-freak'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Sister Sledge "We Are Family".',
          'Escucha grupal — Sister Sledge "We Are Family".',
        ],
        [
          'Vote on a class-anthem chord loop.',
          'Voten un loop de acordes para el himno de clase.',
        ],
        ['Draft the chorus lyric together.', 'Escriban el coro juntos.'],
        ['Sing the draft.', 'Canten el borrador.'],
        [
          'What line will everyone remember in June?',
          '¿Qué línea recordará todo el mundo en junio?',
        ],
      ),
    },
    {
      slug: 'dec-day-10',
      label: 'Day 10 — Semester Close & Farewell',
      songId: 'lovely_day',
      globeEventIds: ['evt-funk-la-1975-earth-wind-fire'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Bill Withers closes.',
          'Escucha grupal — Bill Withers cierra.',
        ],
        [
          'Class-generated Winter Playlist.',
          'Playlist invernal generada por la clase.',
        ],
        [
          'One-sentence semester farewell in your Sound Journal.',
          'Una despedida de una oración en tu Diario Sonoro.',
        ],
        ['Circle share.', 'Comparte en círculo.'],
        ['What are you carrying into January?', '¿Qué llevas a enero?'],
      ),
    },
  ],
};

// ============================================================================
// AUTUMN — GENRE UNITS (Sep – Dec)
// ============================================================================

const SEP_LATIN: UnitTemplate = {
  slug: 'sept-latin-music',
  label: 'Latin Music',
  monthIndex: 9,
  themeId: 'theme-latin',
  kind: 'genre',
  focusGenre: 'Latin',
  focusEra: '1950 – today',
  dayStubs: [
    {
      slug: 'latin-day-1',
      label: 'Day 1 — Son Cubano Roots',
      globeEventIds: ['evt-salsa-nyc-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Origin of son cubano in eastern Cuba.',
          'Origen del son cubano en el oriente de Cuba.',
        ],
        ['Feel the clave (3-2) at the piano.', 'Siente la clave 3-2 al piano.'],
        ['Write a 4-bar montuno.', 'Escribe un montuno de 4 compases.'],
        ['Play in pairs.', 'Toca en parejas.'],
        ['What did the clave anchor for you?', '¿Qué ancló la clave para ti?'],
      ),
    },
    {
      slug: 'latin-day-2',
      label: 'Day 2 — Fania Records & the New York Salsa Boom',
      songId: 'oye_como_va',
      globeEventIds: ['evt-salsa-nyc-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Fania Records — Cuban roots meet NYC swing.',
          'Fania Records — raíces cubanas se cruzan con el swing de NY.',
        ],
        [
          'Study the clave-conga-piano-bass core.',
          'Estudia el núcleo clave-conga-piano-bajo.',
        ],
        [
          'Small groups — arrange a 16-bar salsa vamp.',
          'En grupos, arregla un vamp de salsa de 16 compases.',
        ],
        ['Perform live.', 'Interpreten en vivo.'],
        [
          'How did NYC change the sound of Cuba?',
          '¿Cómo cambió NYC el sonido de Cuba?',
        ],
      ),
    },
    {
      slug: 'latin-day-3',
      label: 'Day 3 — Cumbia Across the Americas',
      globeEventIds: [
        'evt-cumbia-barranquilla-1962',
        'evt-cumbia-monterrey-1990',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Cumbia — Colombia, Mexico, Argentina, Peru.',
          'Cumbia — Colombia, México, Argentina, Perú.',
        ],
        [
          'Compare the basic groove across three regions.',
          'Compara el groove básico en tres regiones.',
        ],
        [
          'Group project — sketch your own cumbia variation.',
          'Proyecto grupal — boceta tu variación de cumbia.',
        ],
        ['Cross-group swap and remix.', 'Intercambio y remix entre grupos.'],
        ["Which region's cumbia surprised you?", '¿Qué cumbia te sorprendió?'],
      ),
    },
    {
      slug: 'latin-day-4',
      label: 'Day 4 — Mariachi Foundations',
      globeEventIds: ['evt-mariachi-mexicocity-1950'],
      phaseSeeds: phaseSeeds(
        [
          'Mariachi ensemble — violin, vihuela, guitarrón, trumpet.',
          'Ensamble mariachi — violín, vihuela, guitarrón, trompeta.',
        ],
        ['Learn the golpe strum.', 'Aprende el rasgueo del golpe.'],
        [
          'In pairs — write a two-line mariachi verse.',
          'En parejas — escribe un verso mariachi de dos líneas.',
        ],
        ['Serenade the room.', 'Serenata al salón.'],
        [
          'What did the trumpets do at the peak?',
          '¿Qué hicieron las trompetas en el clímax?',
        ],
      ),
    },
    {
      slug: 'latin-day-5',
      label: 'Day 5 — Reggaetón & Dembow',
      songId: 'despacito',
      globeEventIds: [
        'evt-reggaeton-underground-sanjuan-1993',
        'evt-reggaeton-san-juan-2004',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Reggaetón born in Puerto Rico from dembow riddim.',
          'El reggaetón nace en Puerto Rico del ritmo dembow.',
        ],
        ['Program the dembow drum pattern.', 'Programa el patrón dembow.'],
        [
          'Draft a 4-bar reggaetón hook.',
          'Escribe un hook de reggaetón de 4 compases.',
        ],
        ['Class playback.', 'Reproducción de clase.'],
        [
          'What made reggaetón travel globally?',
          '¿Qué hizo que el reggaetón viajara al mundo?',
        ],
      ),
    },
    {
      slug: 'latin-day-6',
      label: 'Day 6 — Latin Trap & Streaming Era',
      globeEventIds: [
        'evt-latin-trap-medellin-2005',
        'evt-latin-urban-medellin-2017',
        'evt-latin-streaming-mexicocity-2023',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Bad Bunny, Karol G, Rosalía — the streaming-era shift.',
          'Bad Bunny, Karol G, Rosalía — el giro de la era streaming.',
        ],
        [
          'Compare tempo, 808 bass, and vocal texture.',
          'Compara tempo, bajo 808, y textura vocal.',
        ],
        [
          'Sample a trap beat and write a hook.',
          'Samplea un beat de trap y escribe un hook.',
        ],
        ['Share in pairs.', 'Comparte en parejas.'],
        [
          "What does streaming reward that radio didn't?",
          '¿Qué premia el streaming que la radio no?',
        ],
      ),
    },
    {
      slug: 'latin-day-7',
      label: 'Day 7 — Bolero & Ballad Tradition',
      globeEventIds: ['evt-mariachi-mexicocity-1950'],
      phaseSeeds: phaseSeeds(
        [
          'Bolero — the pan-Latin love ballad tradition.',
          'Bolero — la balada de amor panlatina.',
        ],
        [
          'Learn a bolero rubato at the piano.',
          'Aprende un bolero rubato al piano.',
        ],
        [
          'Write a two-line bolero opening.',
          'Escribe una apertura de bolero de dos líneas.',
        ],
        ['Perform with piano accompaniment.', 'Interpreta con piano.'],
        [
          'What let the singer breathe in a bolero?',
          '¿Qué dejó respirar al cantante en el bolero?',
        ],
      ),
    },
    {
      slug: 'latin-day-8',
      label: 'Day 8 — Latin Music Studio Draft',
      globeEventIds: ['evt-latin-streaming-mexicocity-2023'],
      phaseSeeds: phaseSeeds(
        [
          'Group listen — a class-selected Latin track.',
          'Escucha grupal — canción latina elegida por la clase.',
        ],
        [
          'Studio time — sketch a Latin-flavored track.',
          'Estudio — boceta una pista de sabor latino.',
        ],
        [
          'Add clave and layered percussion.',
          'Añade clave y percusión en capas.',
        ],
        ['Class playback.', 'Reproducción de clase.'],
        [
          'Which Latin tradition shaped your sketch most?',
          '¿Qué tradición latina moldeó más tu boceto?',
        ],
      ),
    },
    {
      slug: 'latin-day-9',
      label: 'Day 9 — Salsa Romántica & Bolero Ballad',
      songId: 'vivir_mi_vida',
      globeEventIds: ['evt-salsa-romantica-nyc-1987'],
      phaseSeeds: phaseSeeds(
        [
          "Marc Anthony, Luis Enrique — salsa's tender era.",
          'Marc Anthony, Luis Enrique — la era tierna de la salsa.',
        ],
        [
          'Feel the ballad tempo over clave.',
          'Siente el tempo de balada sobre clave.',
        ],
        [
          'Draft a two-line salsa-ballad opening.',
          'Escribe una apertura de balada-salsa.',
        ],
        ['Perform at the piano.', 'Interpreta al piano.'],
        [
          'What did the ballad let salsa say?',
          '¿Qué le dejó decir la balada a la salsa?',
        ],
      ),
    },
    {
      slug: 'latin-day-10',
      label: 'Day 10 — Latin Trap Now',
      globeEventIds: [
        'evt-latin-trap-medellin-2005',
        'evt-bad-bunny-sanjuan-2020',
        'evt-karol-g-manana-2023',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Bad Bunny, Karol G — Latin trap defines the streaming era.',
          'Bad Bunny, Karol G — el trap latino define la era streaming.',
        ],
        [
          'Program a 4-bar 808-driven trap beat.',
          'Programa un beat trap de 4 compases con 808.',
        ],
        [
          'Write a bilingual hook over the beat.',
          'Escribe un hook bilingüe sobre el beat.',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          "What did Latin trap prove that reggaetón didn't?",
          '¿Qué demostró el trap latino que el reggaetón no?',
        ],
      ),
    },
  ],
};

const OCT_BLUES: UnitTemplate = {
  slug: 'oct-blues-roots',
  label: 'Blues Roots',
  monthIndex: 10,
  themeId: 'theme-blues',
  kind: 'genre',
  focusGenre: 'Blues',
  focusEra: '1903 – 1970',
  dayStubs: [
    {
      slug: 'blues-day-1',
      label: 'Day 1 — Field Hollers to the Delta',
      globeEventIds: ['evt-blues-clarksdale-1903', 'evt-handy-memphis-1912'],
      phaseSeeds: phaseSeeds(
        [
          'W.C. Handy hears the blues at a Mississippi station.',
          'W.C. Handy escucha el blues en una estación de Mississippi.',
        ],
        ['Listen for the pentatonic bend.', 'Escucha el bend pentatónico.'],
        [
          'Write a one-line "moan" over a I chord.',
          'Escribe una línea de "gemido" sobre un acorde I.',
        ],
        ['Sing it out.', 'Cántalo.'],
        [
          "What did the Delta let you hear that a stage doesn't?",
          '¿Qué te dejó oír el Delta que un escenario no?',
        ],
      ),
    },
    {
      slug: 'blues-day-2',
      label: 'Day 2 — 12-Bar Blues Form',
      songId: 'aint_no_sunshine',
      globeEventIds: ['evt-blues-clarksdale-1929-patton'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Bill Withers "Ain\'t No Sunshine".',
          'Foco Artístico — Bill Withers "Ain\'t No Sunshine".',
        ],
        [
          '12-bar blues at the piano — I, IV, V.',
          'Blues de 12 compases al piano — I, IV, V.',
        ],
        [
          'Write a two-verse blues about your week.',
          'Escribe un blues de dos versos sobre tu semana.',
        ],
        ['Perform in pairs.', 'Interpreten en parejas.'],
        [
          "What did the form let you say that free verse didn't?",
          '¿Qué te dejó decir la forma que el verso libre no?',
        ],
      ),
    },
    {
      slug: 'blues-day-3',
      label: 'Day 3 — Bessie Smith & the Classic Blues Women',
      globeEventIds: [
        'evt-blues-nyc-1923-bessie',
        'evt-blues-atlanta-1923-rainey',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Bessie Smith, Ma Rainey — the queens of the classic blues era.',
          'Bessie Smith, Ma Rainey — reinas del blues clásico.',
        ],
        [
          'Feel the blues vamp with a walking bass.',
          'Siente el vamp de blues con bajo caminante.',
        ],
        [
          'Write two lines of a "declaration" blues.',
          'Escribe dos líneas de un blues de "declaración".',
        ],
        ['Read aloud with attitude.', 'Lee en voz alta con actitud.'],
        [
          "Who's been left out of the blues canon and why?",
          '¿Quién quedó fuera del canon del blues y por qué?',
        ],
      ),
    },
    {
      slug: 'blues-day-4',
      label: 'Day 4 — Chicago Electric Blues',
      globeEventIds: [
        'evt-blues-chicago-1952-walter',
        'evt-blues-chicago-1965-bking',
      ],
      phaseSeeds: phaseSeeds(
        [
          'The Great Migration — Delta to Chicago electric.',
          'La Gran Migración — del Delta al Chicago eléctrico.',
        ],
        [
          'Study the amplified I-IV-V shuffle.',
          'Estudia el shuffle amplificado I-IV-V.',
        ],
        [
          'Group project — build a Chicago shuffle.',
          'Proyecto grupal — construye un shuffle de Chicago.',
        ],
        ["Perform amp'd up.", 'Interpreten amplificados.'],
        [
          'What did electricity give the blues?',
          '¿Qué le dio la electricidad al blues?',
        ],
      ),
    },
    {
      slug: 'blues-day-5',
      label: 'Day 5 — Blues Meets Rock',
      songId: 'sweet_home_alabama',
      globeEventIds: ['evt-blues-la-1968-taj'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — trace a rock riff back to a blues lick.',
          'Escucha grupal — rastrea un riff de rock hasta un blues.',
        ],
        [
          'A/B compare — blues original vs. rock cover.',
          'Compara A/B — original de blues vs. cover de rock.',
        ],
        [
          'Write a two-line rock hook rooted in a blues bend.',
          'Escribe un hook de rock enraizado en un blues bend.',
        ],
        ['Peer swap.', 'Intercambio en parejas.'],
        [
          'Where did the blues stop and rock begin?',
          '¿Dónde terminó el blues y empezó el rock?',
        ],
      ),
    },
    {
      slug: 'blues-day-6',
      label: 'Day 6 — Solo Improvisation',
      globeEventIds: ['evt-blues-chicago-1968-buddy'],
      phaseSeeds: phaseSeeds(
        [
          'Study the blues scale (pentatonic + blue note).',
          'Estudia la escala de blues (pentatónica + nota azul).',
        ],
        [
          'Solo over a 12-bar in pairs.',
          'Solea sobre un 12 compases en parejas.',
        ],
        ['Record your solo take.', 'Graba tu toma de solo.'],
        ['Trade tracks with a partner.', 'Intercambia tomas con un compañero.'],
        [
          'Where did the story of your solo take you?',
          '¿A dónde te llevó la historia de tu solo?',
        ],
      ),
    },
    {
      slug: 'blues-day-7',
      label: 'Day 7 — Blues Storytelling',
      songId: 'aint_no_sunshine',
      globeEventIds: ['evt-blues-memphis-1929-minnie'],
      phaseSeeds: phaseSeeds(
        [
          'Memphis Minnie — solo guitar and voice, unshakable narrative.',
          'Memphis Minnie — guitarra y voz solistas, narrativa inquebrantable.',
        ],
        ['Study AAB rhyme structure.', 'Estudia la estructura de rima AAB.'],
        [
          'Write a three-line AAB blues about a real day.',
          'Escribe un blues AAB sobre un día real.',
        ],
        [
          'Read aloud without music first.',
          'Lee en voz alta primero sin música.',
        ],
        [
          'What is the power of just the story?',
          '¿Cuál es el poder de solo la historia?',
        ],
      ),
    },
    {
      slug: 'blues-day-8',
      label: 'Day 8 — Blues Legacy Panel',
      globeEventIds: [
        'evt-blues-clarksdale-1903',
        'evt-blues-chicago-1965-bking',
        'evt-diaspora-memphis-stax-soul-1967',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Class panel — the blues family tree.',
          'Panel de clase — el árbol genealógico del blues.',
        ],
        [
          'Groups research one genre descendant of blues.',
          'Grupos investigan un descendiente del blues.',
        ],
        [
          'Present findings in a 90-second reel.',
          'Presenta hallazgos en un reel de 90 segundos.',
        ],
        ['Class Q&A.', 'Preguntas y respuestas.'],
        [
          'What did we learn about the reach of the blues?',
          '¿Qué aprendimos del alcance del blues?',
        ],
      ),
    },
    {
      slug: 'blues-day-9',
      label: 'Day 9 — Delta Blues Women',
      globeEventIds: [
        'evt-blues-atlanta-1923-rainey',
        'evt-blues-nyc-1923-bessie',
        'evt-blues-memphis-1929-minnie',
      ],
      phaseSeeds: phaseSeeds(
        [
          "Ma Rainey, Bessie, Memphis Minnie — the Delta's traveling queens.",
          'Ma Rainey, Bessie, Memphis Minnie — reinas viajeras del Delta.',
        ],
        [
          'Study three declarative blues verses.',
          'Estudia tres versos declarativos.',
        ],
        [
          'Write a two-line "I said what I said" blues.',
          'Escribe un blues de "dije lo que dije".',
        ],
        ['Read with grit.', 'Lee con firmeza.'],
        [
          'Who did the men leave out of the story?',
          '¿A quién dejaron fuera los hombres?',
        ],
      ),
    },
    {
      slug: 'blues-day-10',
      label: 'Day 10 — Electric Chicago Deep Dive',
      globeEventIds: [
        'evt-blues-chicago-1956-wolf',
        'evt-blues-chicago-1961-etta',
        'evt-blues-chicago-1966-koko',
      ],
      phaseSeeds: phaseSeeds(
        [
          "Howlin' Wolf, Etta James, Koko Taylor — Chicago electric.",
          "Howlin' Wolf, Etta James, Koko Taylor — Chicago eléctrico.",
        ],
        [
          'Study amplified vocal presence.',
          'Estudia la presencia vocal amplificada.',
        ],
        [
          'Draft an electric blues hook.',
          'Escribe un hook de blues eléctrico.',
        ],
        ["Perform amp'd.", 'Interpreta amplificado.'],
        [
          'What did the amp let the singer do?',
          '¿Qué le dejó hacer el amplificador al cantante?',
        ],
      ),
    },
  ],
};

const NOV_JAZZ: UnitTemplate = {
  slug: 'nov-jazz-foundations',
  label: 'Jazz Foundations',
  monthIndex: 11,
  themeId: 'theme-jazz',
  kind: 'genre',
  focusGenre: 'Jazz',
  focusEra: '1890 – today',
  dayStubs: [
    {
      slug: 'jazz-day-1',
      label: 'Day 1 — Congo Square & Origins',
      globeEventIds: [
        'evt-jazz-congo-square-nola-1819',
        'evt-jazz-origins-nola-1890',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Congo Square drums — the ground zero of Afro-American music.',
          'La plaza del Congo — el punto cero de la música afroamericana.',
        ],
        ['Feel the syncopated pulse.', 'Siente el pulso sincopado.'],
        [
          'Draft a two-bar syncopation.',
          'Escribe una síncopa de dos compases.',
        ],
        ['Layer with a partner.', 'Superpón con un compañero.'],
        [
          'What did that ground carry into every genre after?',
          '¿Qué llevó ese terreno a cada género después?',
        ],
      ),
    },
    {
      slug: 'jazz-day-2',
      label: 'Day 2 — Louis Armstrong',
      songId: 'what_a_wonderful_world',
      globeEventIds: ['evt-jazz-armstrong-hotfive-chicago-1925'],
      phaseSeeds: phaseSeeds(
        [
          'Louis Armstrong — the birth of the jazz soloist.',
          'Louis Armstrong — el nacimiento del solista de jazz.',
        ],
        ['Listen for the swing eighth-note.', 'Escucha las corcheas de swing.'],
        [
          'Improvise 4 bars over a I-VI-II-V.',
          'Improvisa 4 compases sobre un I-VI-II-V.',
        ],
        ['Solo in pairs.', 'Solea en parejas.'],
        [
          'What did Armstrong give every soloist after?',
          '¿Qué le dio Armstrong a cada solista después?',
        ],
      ),
    },
    {
      slug: 'jazz-day-3',
      label: 'Day 3 — Ellington at the Cotton Club',
      globeEventIds: ['evt-jazz-ellington-cotton-club-1927'],
      phaseSeeds: phaseSeeds(
        [
          "Duke Ellington — the composer's orchestra.",
          'Duke Ellington — la orquesta del compositor.',
        ],
        ['Study his voicing tricks.', 'Estudia sus trucos de voicing.'],
        [
          'Arrange a two-part horn line.',
          'Arregla una línea de metales a dos partes.',
        ],
        ['Play through with the class.', 'Toca con la clase.'],
        [
          'What did Ellington argue about "jazz" as a name?',
          '¿Qué discutía Ellington sobre "jazz" como nombre?',
        ],
      ),
    },
    {
      slug: 'jazz-day-4',
      label: 'Day 4 — Bebop Revolution',
      globeEventIds: ['evt-bebop-nyc-1945', 'evt-jazz-parker-savoy-nyc-1945'],
      phaseSeeds: phaseSeeds(
        [
          'Bird & Diz — bebop breaks the dance floor.',
          'Bird y Diz — el bebop rompe la pista de baile.',
        ],
        [
          'Study a bebop line vocabulary.',
          'Estudia vocabulario de líneas bebop.',
        ],
        [
          'Write a 4-bar bebop head.',
          'Escribe una cabeza bebop de 4 compases.',
        ],
        [
          'Trade fours with a partner.',
          'Intercambia cuatros con un compañero.',
        ],
        [
          'What did bebop demand of the listener?',
          '¿Qué le exigió el bebop al oyente?',
        ],
      ),
    },
    {
      slug: 'jazz-day-5',
      label: 'Day 5 — Miles Davis "Kind of Blue"',
      globeEventIds: ['evt-jazz-miles-kind-of-blue-nyc-1959'],
      phaseSeeds: phaseSeeds(
        [
          'Modal jazz — Miles opens up harmonic space.',
          'Jazz modal — Miles abre el espacio armónico.',
        ],
        ['Practice a Dorian solo.', 'Practica un solo dórico.'],
        ['Record a one-chorus improv.', 'Graba una improvisación de un coro.'],
        ['Peer listen.', 'Escucha entre parejas.'],
        [
          'What space did modal jazz open?',
          '¿Qué espacio abrió el jazz modal?',
        ],
      ),
    },
    {
      slug: 'jazz-day-6',
      label: 'Day 6 — Coltrane "A Love Supreme"',
      globeEventIds: ['evt-jazz-coltrane-love-supreme-1965'],
      phaseSeeds: phaseSeeds(
        ['Coltrane — spiritual jazz.', 'Coltrane — jazz espiritual.'],
        [
          'Study the four-movement structure.',
          'Estudia la estructura de cuatro movimientos.',
        ],
        [
          'Compose a two-bar theme built on a mantra.',
          'Compón un tema de dos compases sobre un mantra.',
        ],
        ['Play the mantra in a round.', 'Toca el mantra en ronda.'],
        ['What did devotion sound like?', '¿Cómo sonó la devoción?'],
      ),
    },
    {
      slug: 'jazz-day-7',
      label: 'Day 7 — Women in Jazz History',
      globeEventIds: [
        'evt-jazz-ella-fitzgerald-songbooks-la-1956',
        'evt-jazz-mary-lou-williams-nyc-1945',
        'evt-jazz-melba-liston-nyc-1958',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Ella, Mary Lou Williams, Melba Liston, Terri Lyne Carrington.',
          'Ella, Mary Lou Williams, Melba Liston, Terri Lyne Carrington.',
        ],
        [
          'Trade transcriptions of a favorite solo.',
          'Intercambia transcripciones de un solo favorito.',
        ],
        ['Perform a phrase together.', 'Toca una frase juntas.'],
        ['Play in a small ensemble.', 'Toca en ensamble pequeño.'],
        [
          'Whose voice was missing from your first jazz class?',
          '¿Qué voz faltó en tu primera clase de jazz?',
        ],
      ),
    },
    {
      slug: 'jazz-day-8',
      label: 'Day 8 — Contemporary Jazz Today',
      globeEventIds: [
        'evt-jazz-kamasi-washington-the-epic-la-2015',
        'evt-jazz-esperanza-spalding-portland-2016',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Kamasi Washington & Esperanza Spalding — jazz right now.',
          'Kamasi Washington y Esperanza Spalding — jazz ahora.',
        ],
        [
          'Compare their approach to groove and space.',
          'Compara su enfoque de groove y espacio.',
        ],
        [
          'Draft a modern jazz sketch in the Studio.',
          'Boceta jazz moderno en el Estudio.',
        ],
        ['Playback session.', 'Sesión de reproducción.'],
        [
          'What did this generation add to the tradition?',
          '¿Qué añadió esta generación a la tradición?',
        ],
      ),
    },
    {
      slug: 'jazz-day-9',
      label: 'Day 9 — Bossa Nova & Latin Jazz',
      globeEventIds: [
        'evt-joao-gilberto-bossanova-1958',
        'evt-jazz-stan-getz-bossa-nova-nyc-1964',
        'evt-bossanova-rio-1962',
      ],
      phaseSeeds: phaseSeeds(
        [
          'João Gilberto & Stan Getz — Rio meets New York.',
          'João Gilberto y Stan Getz — Río se cruza con Nueva York.',
        ],
        [
          "Feel the bossa's soft syncopated guitar.",
          'Siente la guitarra suave y sincopada del bossa.',
        ],
        [
          'Write a two-line bossa lyric of quiet longing.',
          'Escribe un verso bossa de anhelo callado.',
        ],
        ['Perform on nylon-string.', 'Interpreta en guitarra clásica.'],
        [
          'What did quiet let the melody say?',
          '¿Qué le dejó decir la quietud a la melodía?',
        ],
      ),
    },
    {
      slug: 'jazz-day-10',
      label: 'Day 10 — Free Jazz & the Outer Reaches',
      globeEventIds: ['evt-jazz-ornette-coleman-shape-nyc-1959'],
      phaseSeeds: phaseSeeds(
        [
          'Ornette Coleman — jazz leaves the changes.',
          'Ornette Coleman — el jazz abandona los acordes.',
        ],
        [
          'Study collective improvisation.',
          'Estudia la improvisación colectiva.',
        ],
        [
          'Two-minute free-improv in trios.',
          'Improvisación libre de dos minutos en tríos.',
        ],
        ['Play with no rehearsal.', 'Toca sin ensayo.'],
        [
          'What did leaving the changes let you say?',
          '¿Qué te dejó decir abandonar los cambios?',
        ],
      ),
    },
  ],
};

const DEC_GOSPEL: UnitTemplate = {
  slug: 'dec-gospel-spirituals',
  label: 'Gospel & Spirituals',
  monthIndex: 12,
  themeId: 'theme-gospel',
  kind: 'genre',
  focusGenre: 'Gospel',
  focusEra: '1800s – today',
  dayStubs: [
    {
      slug: 'gospel-day-1',
      label: 'Day 1 — Spirituals — the Oldest American Songs',
      globeEventIds: ['evt-diaspora-nola-congo-1819'],
      phaseSeeds: phaseSeeds(
        [
          'Spirituals — songs of hope, code, and community.',
          'Espirituales — canciones de esperanza, código, y comunidad.',
        ],
        [
          'Sing "Wade in the Water" in unison.',
          'Canta "Wade in the Water" al unísono.',
        ],
        ['Feel the pentatonic melody.', 'Siente la melodía pentatónica.'],
        [
          "Share where you've heard it echoed.",
          'Comparte dónde has escuchado su eco.',
        ],
        [
          "What did those songs carry that words alone couldn't?",
          '¿Qué llevaron esas canciones que las palabras no?',
        ],
      ),
    },
    {
      slug: 'gospel-day-2',
      label: 'Day 2 — Thomas A. Dorsey & the Birth of Gospel',
      globeEventIds: ['evt-gospel-jackson-1965'],
      phaseSeeds: phaseSeeds(
        [
          'Dorsey brought blues into the church — the birth of gospel.',
          'Dorsey trajo el blues a la iglesia — nace el gospel.',
        ],
        ['Learn a I-IV-V gospel walk.', 'Aprende un walk gospel I-IV-V.'],
        [
          'Write a two-line testimony verse.',
          'Escribe dos líneas de testimonio.',
        ],
        ['Sing in a call & response.', 'Canta llamada y respuesta.'],
        [
          'What did the blues bring to worship?',
          '¿Qué trajo el blues al culto?',
        ],
      ),
    },
    {
      slug: 'gospel-day-3',
      label: 'Day 3 — Mahalia Jackson',
      globeEventIds: ['evt-gospel-jackson-1965'],
      phaseSeeds: phaseSeeds(
        [
          'Mahalia — the queen of gospel, voice of the movement.',
          'Mahalia — la reina del gospel, voz del movimiento.',
        ],
        [
          'Study her breath control and vibrato.',
          'Estudia su control de respiración y vibrato.',
        ],
        [
          'Sing along with a Mahalia phrase.',
          'Canta con una frase de Mahalia.',
        ],
        ['Perform in a small circle.', 'Interpreta en un círculo pequeño.'],
        [
          'What did her voice make possible for civil rights?',
          '¿Qué hizo posible su voz para los derechos civiles?',
        ],
      ),
    },
    {
      slug: 'gospel-day-4',
      label: 'Day 4 — Aretha Franklin — Gospel-to-Soul',
      songId: 'respect',
      globeEventIds: ['evt-diaspora-memphis-stax-soul-1967'],
      phaseSeeds: phaseSeeds(
        ['Aretha crosses gospel into soul.', 'Aretha cruza gospel al soul.'],
        [
          'Feel the gospel-to-secular shift.',
          'Siente el cambio gospel-secular.',
        ],
        [
          'Rewrite a gospel phrase as a soul lyric.',
          'Reescribe una frase gospel como letra soul.',
        ],
        ['Share.', 'Comparte.'],
        [
          'What survived the crossing? What changed?',
          '¿Qué sobrevivió al cruce? ¿Qué cambió?',
        ],
      ),
    },
    {
      slug: 'gospel-day-5',
      label: 'Day 5 — Kirk Franklin & Modern Gospel',
      globeEventIds: ['evt-hiphop-chicago-2000-common'],
      phaseSeeds: phaseSeeds(
        [
          'Kirk Franklin — gospel meets hip-hop and R&B.',
          'Kirk Franklin — gospel se cruza con hip-hop y R&B.',
        ],
        [
          'Program a modern gospel groove.',
          'Programa un groove gospel moderno.',
        ],
        [
          'Write a two-bar praise hook.',
          'Escribe un hook de alabanza de dos compases.',
        ],
        ['Class playback.', 'Reproducción de clase.'],
        [
          'Where do you hear gospel echoes today?',
          '¿Dónde escuchas ecos del gospel hoy?',
        ],
      ),
    },
    {
      slug: 'gospel-day-6',
      label: 'Day 6 — Choir Arrangement',
      globeEventIds: ['evt-gospel-jackson-1965'],
      phaseSeeds: phaseSeeds(
        [
          'Study a 3-part choir arrangement.',
          'Estudia un arreglo coral a tres voces.',
        ],
        ['Assign parts and rehearse.', 'Asigna voces y ensaya.'],
        ['Add a bass anchor.', 'Añade un ancla de bajo.'],
        ['Perform for the class.', 'Interpreten para la clase.'],
        [
          'What is the difference between hearing and being lifted?',
          '¿Cuál es la diferencia entre oír y ser elevado?',
        ],
      ),
    },
    {
      slug: 'gospel-day-7',
      label: 'Day 7 — Song of Testimony',
      songId: 'ill_be_there',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — testimony traditions across gospel.',
          'Escucha grupal — tradiciones de testimonio.',
        ],
        [
          'Write a two-line personal testimony.',
          'Escribe dos líneas de testimonio personal.',
        ],
        [
          'Set it to a simple chord walk.',
          'Ponlo sobre un walk de acordes simple.',
        ],
        ['Perform in pairs.', 'Interpreta en parejas.'],
        [
          'What is the courage in testifying?',
          '¿Cuál es la valentía en testificar?',
        ],
      ),
    },
    {
      slug: 'gospel-day-8',
      label: 'Day 8 — Gospel Studio Project',
      globeEventIds: ['evt-diaspora-memphis-stax-soul-1967'],
      phaseSeeds: phaseSeeds(
        [
          "Group listen — Sam Cooke's gospel-to-pop crossover.",
          'Escucha grupal — el cruce de Sam Cooke de gospel a pop.',
        ],
        [
          'Studio time — build a modern gospel-tinged track.',
          'Estudio — construye una pista con matiz gospel moderno.',
        ],
        ['Layer a choir sample.', 'Agrega una muestra de coro.'],
        ['Class playback.', 'Reproducción.'],
        [
          'What did the gospel harmonic language give your track?',
          '¿Qué te dio el lenguaje armónico del gospel?',
        ],
      ),
    },
    {
      slug: 'gospel-day-9',
      label: 'Day 9 — Contemporary Christian & the Big Choir',
      globeEventIds: ['evt-gospel-jackson-1965'],
      phaseSeeds: phaseSeeds(
        [
          'Modern gospel choirs — Kirk Franklin to Tasha Cobbs.',
          'Coros gospel modernos — de Kirk Franklin a Tasha Cobbs.',
        ],
        [
          'Study a 5-part choir voicing.',
          'Estudia un voicing coral a 5 partes.',
        ],
        [
          'Assign voices — rehearse a 16-bar praise chorus.',
          'Asigna voces — ensaya un coro de alabanza de 16 compases.',
        ],
        ['Perform in circle.', 'Interpreta en círculo.'],
        [
          'What lifted when the choir landed together?',
          '¿Qué se elevó cuando el coro cayó junto?',
        ],
      ),
    },
    {
      slug: 'gospel-day-10',
      label: 'Day 10 — Community Choir Showcase',
      globeEventIds: [
        'evt-diaspora-chicago-gospel-1932',
        'evt-gospel-jackson-1965',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Community-choir tradition — from Chicago 1932 to today.',
          'Tradición del coro comunitario — de Chicago 1932 a hoy.',
        ],
        [
          'Rehearse the choir arrangement from Day 6.',
          'Ensaya el arreglo coral del Día 6.',
        ],
        [
          'Record a full ensemble take in the Studio.',
          'Graben una toma completa en el Estudio.',
        ],
        ['Playback for feedback.', 'Reproducción para retroalimentación.'],
        [
          "What did the recorded version reveal that the live one didn't?",
          '¿Qué reveló la grabación que la versión en vivo no?',
        ],
      ),
    },
  ],
};

// ============================================================================
// AUTUMN — LOCATION UNITS (Oct – Nov)
// ============================================================================

const OCT_NEW_ORLEANS: UnitTemplate = {
  slug: 'oct-new-orleans',
  label: 'New Orleans — Cradle of Jazz',
  monthIndex: 10,
  themeId: 'theme-new-orleans',
  kind: 'location',
  focusLocation: 'New Orleans, LA',
  focusEra: '1819 – today',
  dayStubs: [
    {
      slug: 'nola-day-1',
      label: 'Day 1 — Congo Square',
      globeEventIds: [
        'evt-jazz-congo-square-nola-1819',
        'evt-diaspora-nola-congo-1819',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Congo Square — where enslaved people drummed on Sundays.',
          'La plaza del Congo — donde los esclavizados tocaban tambores los domingos.',
        ],
        ['Learn a bamboula rhythm.', 'Aprende un ritmo bamboula.'],
        [
          'Draft a two-bar polyrhythm.',
          'Escribe una polirritmia de dos compases.',
        ],
        ['Layer with the class.', 'Superpón con la clase.'],
        [
          'What was preserved and what was lost?',
          '¿Qué se preservó y qué se perdió?',
        ],
      ),
    },
    {
      slug: 'nola-day-2',
      label: 'Day 2 — Second Line & Brass Bands',
      globeEventIds: ['evt-jazz-nola-1923'],
      phaseSeeds: phaseSeeds(
        [
          'The second-line parade — grief, joy, community.',
          'La segunda línea — duelo, alegría, comunidad.',
        ],
        [
          'Feel the bass drum + snare backbeat.',
          'Siente el bombo + tarola en contratiempo.',
        ],
        [
          'Draft a 4-bar brass hook.',
          'Escribe un hook de metales de 4 compases.',
        ],
        ['March in a circle.', 'Marcha en círculo.'],
        [
          'What is a parade that carries both?',
          '¿Cómo es un desfile que lleva ambos?',
        ],
      ),
    },
    {
      slug: 'nola-day-3',
      label: 'Day 3 — Louis Armstrong Grows Up',
      songId: 'what_a_wonderful_world',
      globeEventIds: ['evt-jazz-armstrong-hotfive-chicago-1925'],
      phaseSeeds: phaseSeeds(
        [
          "Louis Armstrong — from the Waifs' Home to the world.",
          "Louis Armstrong — del Waifs' Home al mundo.",
        ],
        [
          'Study his early Hot Five improv.',
          'Estudia su improvisación temprana con Hot Five.',
        ],
        [
          'Improvise 4 bars in his style.',
          'Improvisa 4 compases en su estilo.',
        ],
        ['Trade solos.', 'Intercambia solos.'],
        [
          'What did NOLA give the young Louis?',
          '¿Qué le dio Nueva Orleans al joven Louis?',
        ],
      ),
    },
    {
      slug: 'nola-day-4',
      label: 'Day 4 — Jelly Roll Morton — the First Composer',
      globeEventIds: ['evt-jazz-jelly-roll-morton-chicago-1926'],
      phaseSeeds: phaseSeeds(
        [
          'Jelly Roll — the "inventor" of jazz composition.',
          'Jelly Roll — el "inventor" de la composición jazz.',
        ],
        ['Study "King Porter Stomp".', 'Estudia "King Porter Stomp".'],
        ['Draft a written jazz motif.', 'Escribe un motivo de jazz.'],
        ['Play it as a class.', 'Tócalo como clase.'],
        [
          'What did notation do for jazz?',
          '¿Qué hizo la notación por el jazz?',
        ],
      ),
    },
    {
      slug: 'nola-day-5',
      label: 'Day 5 — Fats Domino & New Orleans R&B',
      globeEventIds: ['evt-blues-nola-1968'],
      phaseSeeds: phaseSeeds(
        [
          "Fats Domino — the piano triplets that seeded rock 'n' roll.",
          "Fats Domino — los tresillos de piano que sembraron el rock 'n' roll.",
        ],
        ['Feel the triplet groove.', 'Siente el groove de tresillos.'],
        [
          'Write a two-bar NOLA R&B piano riff.',
          'Escribe un riff de piano R&B de dos compases.',
        ],
        ['Play together.', 'Toquen juntos.'],
        [
          'What did the piano become in the city?',
          '¿En qué se convirtió el piano en la ciudad?',
        ],
      ),
    },
    {
      slug: 'nola-day-6',
      label: 'Day 6 — Professor Longhair & the Piano Kings',
      globeEventIds: ['evt-blues-nola-1968'],
      phaseSeeds: phaseSeeds(
        [
          "Study Professor Longhair's rumba-blues.",
          'Estudia el rumba-blues de Professor Longhair.',
        ],
        [
          'Learn a NOLA left-hand pattern.',
          'Aprende un patrón de mano izquierda de NOLA.',
        ],
        ['Improvise 4 bars over it.', 'Improvisa 4 compases encima.'],
        ['Peer share.', 'Comparte con un compañero.'],
        [
          'How did the Caribbean pulse land in NOLA piano?',
          '¿Cómo aterrizó el pulso caribeño en el piano de NOLA?',
        ],
      ),
    },
    {
      slug: 'nola-day-7',
      label: 'Day 7 — The Meters & the Funk',
      globeEventIds: [
        'evt-meters-neworleans-1969',
        'evt-funk-neworleans-1974-meters-rejuvenation',
      ],
      phaseSeeds: phaseSeeds(
        [
          "The Meters — funk's NOLA architects.",
          'The Meters — los arquitectos NOLA del funk.',
        ],
        [
          'Program "Cissy Strut" style groove.',
          'Programa un groove estilo "Cissy Strut".',
        ],
        ['Layer syncopated guitar.', 'Superpón guitarra sincopada.'],
        ['Play as an ensemble.', 'Toquen como ensamble.'],
        [
          'What did the Meters bake into the DNA of funk?',
          '¿Qué imprimieron los Meters en el ADN del funk?',
        ],
      ),
    },
    {
      slug: 'nola-day-8',
      label: 'Day 8 — Mardi Gras Indians',
      globeEventIds: ['evt-diaspora-nola-mardi-gras-indians-1885'],
      phaseSeeds: phaseSeeds(
        [
          'The Mardi Gras Indian tradition — Afro-Indigenous alliance.',
          'La tradición de los Mardi Gras Indians — alianza afroindígena.',
        ],
        [
          'Feel the tambourine + chant call-and-response.',
          'Siente la pandereta + llamada-respuesta cantada.',
        ],
        [
          'Write a two-line chant of pride.',
          'Escribe un canto de orgullo de dos líneas.',
        ],
        ['Perform in a circle.', 'Interpreta en círculo.'],
        [
          'What did both lineages carry together?',
          '¿Qué llevaron juntos los dos linajes?',
        ],
      ),
    },
    {
      slug: 'nola-day-9',
      label: 'Day 9 — Zydeco & Louisiana Creole',
      globeEventIds: ['evt-acadian-moncton-1994'],
      phaseSeeds: phaseSeeds(
        [
          'Zydeco — accordion & washboard on the bayou.',
          'Zydeco — acordeón y tabla de lavar en el pantano.',
        ],
        ['Feel the 2/4 zydeco groove.', 'Siente el groove zydeco 2/4.'],
        [
          'Draft a two-bar zydeco riff.',
          'Escribe un riff zydeco de dos compases.',
        ],
        ['Play in a duo.', 'Toca en dúo.'],
        [
          'What sound did the bayou make room for?',
          '¿Qué sonido dejó entrar el pantano?',
        ],
      ),
    },
    {
      slug: 'nola-day-10',
      label: 'Day 10 — Bounce & New Orleans Hip Hop',
      globeEventIds: ['evt-hiphop-neworleans-2008-lilwayne'],
      phaseSeeds: phaseSeeds(
        [
          'NOLA Bounce — Lil Wayne, Cash Money legacy.',
          'NOLA Bounce — Lil Wayne, legado de Cash Money.',
        ],
        ['Program a bounce beat.', 'Programa un beat de bounce.'],
        ['Write an 8-bar hook.', 'Escribe un hook de 8 compases.'],
        ['Class playback.', 'Reproducción.'],
        [
          'How does bounce echo the second line?',
          '¿Cómo hace eco el bounce a la segunda línea?',
        ],
      ),
    },
  ],
};

const NOV_MEMPHIS: UnitTemplate = {
  slug: 'nov-memphis',
  label: "Memphis — Blues, Soul, Rock 'n' Roll",
  monthIndex: 11,
  themeId: 'theme-memphis',
  kind: 'location',
  focusLocation: 'Memphis, TN',
  focusEra: '1912 – 1975',
  dayStubs: [
    {
      slug: 'mem-day-1',
      label: 'Day 1 — W.C. Handy & Beale Street',
      globeEventIds: ['evt-handy-memphis-1912'],
      phaseSeeds: phaseSeeds(
        [
          'W.C. Handy — the "father of the blues" on Beale.',
          'W.C. Handy — el "padre del blues" en Beale.',
        ],
        [
          'Study his 12-bar publishing hits.',
          'Estudia sus 12 compases publicados.',
        ],
        [
          'Write a two-bar Beale Street riff.',
          'Escribe un riff de dos compases de Beale.',
        ],
        ['Play together.', 'Toquen juntos.'],
        [
          'Why did Beale Street matter to the whole country?',
          '¿Por qué importó Beale al país entero?',
        ],
      ),
    },
    {
      slug: 'mem-day-2',
      label: 'Day 2 — Memphis Minnie',
      globeEventIds: ['evt-blues-memphis-1929-minnie'],
      phaseSeeds: phaseSeeds(
        [
          'Memphis Minnie — solo guitar, sharp lyrics.',
          'Memphis Minnie — guitarra sola, letras filosas.',
        ],
        [
          'Learn a Delta guitar figure.',
          'Aprende una figura de guitarra Delta.',
        ],
        ['Write an AAB blues verse.', 'Escribe un verso AAB.'],
        ['Read aloud.', 'Lee en voz alta.'],
        ['Whose voice was Minnie holding?', '¿Qué voz llevaba Minnie?'],
      ),
    },
    {
      slug: 'mem-day-3',
      label: 'Day 3 — Sun Records',
      globeEventIds: ['evt-elvis-memphis-1954'],
      phaseSeeds: phaseSeeds(
        [
          'Sun Records — where black and white sounds met.',
          'Sun Records — donde se cruzaron los sonidos negros y blancos.',
        ],
        ['Study a Sun-era slapback echo.', 'Estudia el slapback echo de Sun.'],
        ['Write a two-line rockabilly hook.', 'Escribe un hook rockabilly.'],
        ['Play through.', 'Toquen.'],
        ['What did the studio choose to hear?', '¿Qué eligió oír el estudio?'],
      ),
    },
    {
      slug: 'mem-day-4',
      label: 'Day 4 — Elvis in Memphis',
      globeEventIds: ['evt-elvis-memphis-1954'],
      phaseSeeds: phaseSeeds(
        [
          'Elvis — the crossover kid of the South.',
          'Elvis — el chico cruce del Sur.',
        ],
        [
          'A/B "That\'s All Right" — Elvis vs. Arthur Crudup original.',
          'Compara "That\'s All Right" — Elvis vs. original de Arthur Crudup.',
        ],
        [
          'Write a two-line rock-blues hybrid hook.',
          'Escribe un hook rock-blues de dos líneas.',
        ],
        ['Share.', 'Comparte.'],
        [
          "What did Elvis carry that wasn't his to keep?",
          '¿Qué llevó Elvis que no era suyo?',
        ],
      ),
    },
    {
      slug: 'mem-day-5',
      label: 'Day 5 — Stax Records',
      songId: 'sittin_on_the_dock_of_the_bay',
      globeEventIds: [
        'evt-diaspora-memphis-stax-soul-1967',
        'evt-otis-redding-memphis-1965',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Stax — Booker T. & the MGs, Sam & Dave, Otis.',
          'Stax — Booker T. & the MGs, Sam & Dave, Otis.',
        ],
        ['Study the Stax horn stab.', 'Estudia el "stab" de metales Stax.'],
        [
          'Group project — arrange a horn line.',
          'Grupo — arregla una línea de metales.',
        ],
        ['Perform live.', 'Interpreten en vivo.'],
        [
          "What did Stax build that Motown didn't?",
          '¿Qué construyó Stax que Motown no?',
        ],
      ),
    },
    {
      slug: 'mem-day-6',
      label: 'Day 6 — Otis Redding',
      songId: 'sittin_on_the_dock_of_the_bay',
      globeEventIds: ['evt-otis-redding-memphis-1965'],
      phaseSeeds: phaseSeeds(
        [
          'Otis — the deepest soul voice from Georgia to Memphis.',
          'Otis — la voz de soul más profunda de Georgia a Memphis.',
        ],
        ['Feel his slow-build phrasing.', 'Siente su fraseo en crescendo.'],
        ['Write two lines about waiting.', 'Escribe dos líneas sobre esperar.'],
        ['Read with the melody.', 'Lee con la melodía.'],
        [
          'What did his voice do at the crest?',
          '¿Qué hizo su voz en el clímax?',
        ],
      ),
    },
    {
      slug: 'mem-day-7',
      label: 'Day 7 — Al Green & Hi Records',
      globeEventIds: ['evt-al-green-memphis-1972'],
      phaseSeeds: phaseSeeds(
        [
          'Al Green — the smoothest Memphis soul.',
          'Al Green — el soul más suave de Memphis.',
        ],
        [
          'Study the tight Willie Mitchell arrangement.',
          'Estudia el arreglo de Willie Mitchell.',
        ],
        [
          'Write a two-bar Memphis groove.',
          'Escribe un groove de dos compases.',
        ],
        ['Play in duos.', 'Tocar en dúos.'],
        ['What did restraint teach you?', '¿Qué te enseñó la contención?'],
      ),
    },
    {
      slug: 'mem-day-8',
      label: 'Day 8 — Isaac Hayes & the Shaft Score',
      globeEventIds: ['evt-media-memphis-1971-shaft'],
      phaseSeeds: phaseSeeds(
        [
          'Isaac Hayes — the Shaft theme changes cinema.',
          'Isaac Hayes — el tema de Shaft cambia el cine.',
        ],
        [
          'Study the wah-wah guitar and hi-hat pattern.',
          'Estudia el wah-wah y el patrón de hi-hat.',
        ],
        ['Program a cinematic hook.', 'Programa un hook cinematográfico.'],
        ['Class playback.', 'Reproducción.'],
        [
          'What did his sound teach filmmakers?',
          '¿Qué le enseñó su sonido a los cineastas?',
        ],
      ),
    },
    {
      slug: 'mem-day-9',
      label: 'Day 9 — Aretha Records in Muscle Shoals / Memphis',
      songId: 'respect',
      globeEventIds: ['evt-diaspora-memphis-stax-soul-1967'],
      phaseSeeds: phaseSeeds(
        [
          'Aretha — sessions that stitched Detroit to Memphis.',
          'Aretha — sesiones que cosieron Detroit a Memphis.',
        ],
        [
          'Study her keyboard-driven confidence.',
          'Estudia su confianza pianística.',
        ],
        [
          'Write a two-line demand-song.',
          'Escribe dos líneas de canción de demanda.',
        ],
        ['Read with attitude.', 'Lee con actitud.'],
        [
          "What did the South give Aretha's voice?",
          '¿Qué le dio el Sur a la voz de Aretha?',
        ],
      ),
    },
    {
      slug: 'mem-day-10',
      label: 'Day 10 — Booker T. & the MGs',
      globeEventIds: ['evt-diaspora-memphis-stax-soul-1967'],
      phaseSeeds: phaseSeeds(
        [
          'The house band that changed everything.',
          'La banda de la casa que cambió todo.',
        ],
        [
          'Program the "Green Onions" groove.',
          'Programa el groove de "Green Onions".',
        ],
        [
          'Layer organ, bass, drums, guitar.',
          'Superpón órgano, bajo, batería, guitarra.',
        ],
        ['Perform as a quartet.', 'Interpreta en cuarteto.'],
        [
          "What did they do that AI can't?",
          '¿Qué hicieron que la IA no puede?',
        ],
      ),
    },
  ],
};

// ============================================================================
// SPRING — HERITAGE UNITS (Jan – May)
// ============================================================================

const JAN_IDENTITY: UnitTemplate = {
  slug: 'jan-identity',
  label: 'Identity, Vision & Dreams',
  monthIndex: 1,
  themeId: 'theme-january',
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'jan-day-1',
      label: 'Day 1 — MLK & The Dream',
      globeEventIds: [
        'evt-jazz-nina-simone-mississippi-goddam-1964',
        'evt-soul-memphis-1962',
      ],
      phaseSeeds: phaseSeeds(
        [
          'MLK "I Have a Dream" with Sam Cooke "A Change Is Gonna Come".',
          'MLK "I Have a Dream" con Sam Cooke "A Change Is Gonna Come".',
        ],
        [
          'Identify melodic phrasing in speech and song.',
          'Identifica el fraseo en el discurso y la canción.',
        ],
        [
          'Write two lines answering "what change is coming for you?"',
          'Escribe dos líneas sobre "¿qué cambio se acerca para ti?"',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        [
          'How does a dream become a plan?',
          '¿Cómo un sueño se convierte en un plan?',
        ],
      ),
    },
    {
      slug: 'jan-day-2',
      label: 'Day 2 — Vision Board in Sound',
      globeEventIds: ['evt-hiphop-compton-2012-kendricklamar'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Kendrick Lamar "i".',
          'Escucha grupal — Kendrick Lamar "i".',
        ],
        [
          'Build a personal sound palette in the Studio.',
          'Construye una paleta sonora en el Estudio.',
        ],
        [
          '30-second vision-board track.',
          'Pista de tablero de visión de 30 segundos.',
        ],
        ['Playback with one intention.', 'Reproducción con una intención.'],
        ['What does your future self sound like?', '¿Cómo suena tu yo futuro?'],
      ),
    },
    {
      slug: 'jan-day-3',
      label: 'Day 3 — Blues as Structure',
      songId: 'aint_no_sunshine',
      globeEventIds: ['evt-blues-clarksdale-1903'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Bill Withers "Ain\'t No Sunshine".',
          'Foco Artístico — Bill Withers "Ain\'t No Sunshine".',
        ],
        ['12-bar blues at the piano.', 'Blues de 12 compases al piano.'],
        [
          'Write a two-verse blues about your January.',
          'Escribe un blues sobre tu enero.',
        ],
        ['Perform in pairs.', 'Interpreten en parejas.'],
        [
          'What did the blues form let you say that free form did not?',
          '¿Qué te dejó decir la forma que la forma libre no?',
        ],
      ),
    },
    {
      slug: 'jan-day-4',
      label: 'Day 4 — Mentors in Music',
      songId: 'lean_on_me',
      globeEventIds: ['evt-soul-memphis-1962'],
      phaseSeeds: phaseSeeds(
        [
          'Study lineages — who mentored whom.',
          'Estudia linajes — quién fue mentor de quién.',
        ],
        [
          'Pick a mentor and a mentee in music history.',
          'Elige un mentor y su mentee.',
        ],
        [
          'Write a two-line thank-you to a mentor.',
          'Escribe dos líneas de agradecimiento a un mentor.',
        ],
        ['Share.', 'Comparte.'],
        ['Who do you owe your ears to?', '¿A quién le debes tus oídos?'],
      ),
    },
    {
      slug: 'jan-day-5',
      label: 'Day 5 — Personal Anthem Draft',
      globeEventIds: ['evt-hiphop-nyc-1979'],
      phaseSeeds: phaseSeeds(
        [
          'Draft your own personal anthem — 30 seconds.',
          'Escribe tu propio himno personal — 30 segundos.',
        ],
        [
          'Choose one hook that feels true.',
          'Elige un hook que sea verdadero.',
        ],
        ['Layer in the Studio.', 'Superpón en el Estudio.'],
        ['Peer swap.', 'Intercambio.'],
        ['What did you claim in your anthem?', '¿Qué reclamaste en tu himno?'],
      ),
    },
    {
      slug: 'jan-day-6',
      label: 'Day 6 — Mixtape Building',
      globeEventIds: ['evt-hiphop-nyc-1973', 'evt-hiphop-nyc-1984'],
      phaseSeeds: phaseSeeds(
        [
          "Mixtape lineage — from Kool Herc's pause tapes to Datpiff.",
          'Linaje de mixtape — de las cintas de Kool Herc a Datpiff.',
        ],
        [
          'Study transitions and sequencing.',
          'Estudia transiciones y secuencia.',
        ],
        [
          'Build a 5-track "who am I becoming" mixtape.',
          'Construye una mixtape de 5 pistas "quién estoy siendo".',
        ],
        [
          'Trade mixtapes with a partner.',
          'Intercambia mixtapes con un compañero.',
        ],
        [
          "Where did your partner's sequencing surprise you?",
          '¿Dónde te sorprendió la secuencia de tu compañero?',
        ],
      ),
    },
    {
      slug: 'jan-day-7',
      label: 'Day 7 — Self-Portrait Sound Collage',
      globeEventIds: ['evt-hiphop-compton-2012-kendricklamar'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Kendrick Lamar sound-portrait moments.',
          'Escucha grupal — momentos de retrato sonoro de Kendrick.',
        ],
        [
          'Layer three field recordings + one melody.',
          'Superpón tres grabaciones de campo + una melodía.',
        ],
        [
          'Compose a 45-second sound self-portrait.',
          'Compón un autorretrato sonoro de 45 segundos.',
        ],
        ['Anonymous class playback.', 'Reproducción anónima.'],
        ['Whose portrait did you recognize?', '¿Qué retrato reconociste?'],
      ),
    },
    {
      slug: 'jan-day-8',
      label: 'Day 8 — Personal Manifesto',
      globeEventIds: ['evt-hiphop-longisland-1988-publicenemy'],
      phaseSeeds: phaseSeeds(
        [
          "Study Public Enemy's manifesto voice.",
          'Estudia la voz de manifiesto de Public Enemy.',
        ],
        [
          'Draft your own three-line manifesto.',
          'Escribe tu propio manifiesto de tres líneas.',
        ],
        ['Set it over a spare beat.', 'Ponlo sobre un beat mínimo.'],
        ['Perform with conviction.', 'Interpreta con convicción.'],
        [
          'What did stating it out loud make real?',
          '¿Qué se volvió real al decirlo en voz alta?',
        ],
      ),
    },
    {
      slug: 'jan-day-9',
      label: 'Day 9 — Naming Ceremony',
      songId: 'i_feel_the_earth_move',
      globeEventIds: ['evt-carole-king-la-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Carole King "I Feel the Earth Move".',
          'Escucha grupal — Carole King "I Feel the Earth Move".',
        ],
        [
          'Turn & Talk — what would you name yourself?',
          'Habla y comparte — ¿cómo te nombrarías?',
        ],
        [
          'Write two lines claiming a new name for the year.',
          'Escribe dos líneas reclamando un nuevo nombre para el año.',
        ],
        ['Read the name aloud.', 'Lee el nombre en voz alta.'],
        ['What does the name make possible?', '¿Qué hace posible el nombre?'],
      ),
    },
    {
      slug: 'jan-day-10',
      label: 'Day 10 — Vision Board Playback',
      globeEventIds: ['evt-hiphop-chicago-2004-kanyewest'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Kanye "College Dropout" reset stories.',
          'Escucha grupal — Kanye "College Dropout" historias de reinicio.',
        ],
        [
          'Return to your vision-board Studio track.',
          'Regresa a tu pista de tablero de visión.',
        ],
        [
          'Add one instrument that names your future self.',
          'Añade un instrumento que nombre tu yo futuro.',
        ],
        ['Class playback.', 'Reproducción.'],
        ['What did the added layer say?', '¿Qué dijo la capa añadida?'],
      ),
    },
  ],
};

const FEB_BLACK_HISTORY: UnitTemplate = {
  slug: 'feb-black-history',
  label: 'Black History Month',
  monthIndex: 2,
  themeId: 'theme-february',
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'feb-day-1',
      label: 'Day 1 — The Black National Anthem',
      globeEventIds: ['evt-gospel-jackson-1965'],
      phaseSeeds: phaseSeeds(
        [
          '"Lift Every Voice and Sing" — history + listen.',
          '"Lift Every Voice and Sing" — historia + escucha.',
        ],
        ['Sing along with piano support.', 'Canta acompañado del piano.'],
        [
          'Write a couplet naming what you would lift.',
          'Escribe un pareado nombrando qué levantarías.',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        [
          'What does it feel like to sing a song written for you before you were born?',
          '¿Qué se siente cantar una canción escrita para ti antes de nacer?',
        ],
      ),
    },
    {
      slug: 'feb-day-2',
      label: 'Day 2 — Great Migration Sound Map',
      globeEventIds: [
        'evt-blues-clarksdale-1903',
        'evt-blues-chicago-1952-walter',
        'evt-diaspora-memphis-stax-soul-1967',
        'evt-motown-detroit-1963',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Map + song pairing — Delta to Chicago, Harlem, Detroit.',
          'Mapa + canciones — del Delta a Chicago, Harlem, Detroit.',
        ],
        [
          'Trace the sound migration on the classroom map.',
          'Traza la migración sonora en el mapa.',
        ],
        [
          'Assign each group a city; produce a 30-second homage.',
          'Cada grupo recibe una ciudad; produzcan un homenaje de 30 segundos.',
        ],
        ['City-by-city playback.', 'Reproducción ciudad por ciudad.'],
        [
          'How did geography change the sound?',
          '¿Cómo la geografía cambió el sonido?',
        ],
      ),
    },
    {
      slug: 'feb-day-3',
      label: 'Day 3 — Ambassador Project — Nina Simone',
      globeEventIds: ['evt-jazz-nina-simone-mississippi-goddam-1964'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Nina Simone "Mississippi Goddam".',
          'Foco Artístico — Nina Simone "Mississippi Goddam".',
        ],
        [
          'Analyze her use of tempo, phrasing, and silence.',
          'Analiza su tempo, fraseo y silencio.',
        ],
        [
          'Write a protest verse in your own voice.',
          'Escribe un verso de protesta con tu voz.',
        ],
        ['Peer read.', 'Lectura en parejas.'],
        [
          'What is the difference between anger and witness?',
          '¿Cuál es la diferencia entre rabia y testimonio?',
        ],
      ),
    },
    {
      slug: 'feb-day-4',
      label: 'Day 4 — A Tribe Called Quest Sample Study',
      globeEventIds: ['evt-hiphop-queens-1991-tribecalledquest'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — A Tribe Called Quest "Can I Kick It?"',
          'Foco Artístico — A Tribe Called Quest "Can I Kick It?"',
        ],
        [
          'In the Studio, identify the sample source (Lou Reed).',
          'En el Estudio, identifica la muestra (Lou Reed).',
        ],
        [
          'Sample a public-domain track and build a 4-bar loop.',
          'Samplea una canción y construye un loop.',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          'What responsibility does a producer have to the source?',
          '¿Qué responsabilidad tiene el productor con la fuente?',
        ],
      ),
    },
    {
      slug: 'feb-day-5',
      label: 'Day 5 — Beyoncé & The Modern Anthem',
      songId: 'crazy_in_love',
      globeEventIds: ['evt-pop-houston-2016-beyonce'],
      phaseSeeds: phaseSeeds(
        [
          'Beyoncé — the arc of a modern Black anthem.',
          'Beyoncé — el arco de un himno negro moderno.',
        ],
        [
          'Study her call-and-response phrasing.',
          'Estudia su fraseo de llamada-respuesta.',
        ],
        [
          'Write a two-line anthemic hook.',
          'Escribe un hook de himno de dos líneas.',
        ],
        ['Peer share.', 'Comparte.'],
        [
          "What is an anthem doing that a hit isn't?",
          '¿Qué hace un himno que un hit no?',
        ],
      ),
    },
    {
      slug: 'feb-day-6',
      label: 'Day 6 — Jazz Women — Ella & Nina',
      globeEventIds: [
        'evt-jazz-ella-fitzgerald-songbooks-la-1956',
        'evt-jazz-nina-simone-mississippi-goddam-1964',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Ella Fitzgerald & Nina Simone — two lineages of Black jazz women.',
          'Ella Fitzgerald y Nina Simone — dos linajes de mujeres del jazz negras.',
        ],
        [
          'Compare vibrato, phrasing, and message.',
          'Compara vibrato, fraseo y mensaje.',
        ],
        [
          'Write a two-line homage to each.',
          'Escribe un homenaje de dos líneas a cada una.',
        ],
        ['Read aloud with intention.', 'Lee con intención.'],
        [
          'What did each of them make possible for the next generation?',
          '¿Qué hizo posible cada una para la siguiente generación?',
        ],
      ),
    },
    {
      slug: 'feb-day-7',
      label: 'Day 7 — Hip-Hop History Panel',
      globeEventIds: [
        'evt-hiphop-nyc-1973',
        'evt-hiphop-nyc-1984',
        'evt-hiphop-longisland-1988-publicenemy',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Group panel — 1973 to today, five landmark tracks.',
          'Panel de grupo — de 1973 a hoy, cinco pistas clave.',
        ],
        ['Assign each group one era.', 'Asigna una era a cada grupo.'],
        [
          'Present a 60-second era summary with sample.',
          'Presenta un resumen de la era en 60 segundos con muestra.',
        ],
        ['Class Q&A.', 'Preguntas y respuestas.'],
        ['What surprised you about the arc?', '¿Qué te sorprendió del arco?'],
      ),
    },
    {
      slug: 'feb-day-8',
      label: 'Day 8 — R&B Queens',
      songId: 'crazy_in_love',
      globeEventIds: [
        'evt-pop-newark-1985-whitneyhouston',
        'evt-pop-nyc-1990-mariahcarey',
        'evt-pop-houston-2016-beyonce',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Whitney, Mariah, Beyoncé — three eras of R&B command.',
          'Whitney, Mariah, Beyoncé — tres eras de mando en el R&B.',
        ],
        [
          'Study runs, ad-libs, and melisma.',
          'Estudia runs, ad-libs y melisma.',
        ],
        [
          'Write a two-line hook with a "queen" cadence.',
          'Escribe un hook con cadencia de "reina".',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          'What did the crown cost each of them?',
          '¿Qué le costó la corona a cada una?',
        ],
      ),
    },
    {
      slug: 'feb-day-9',
      label: 'Day 9 — Southern Soul & the Stax Legacy',
      songId: 'sittin_on_the_dock_of_the_bay',
      globeEventIds: [
        'evt-diaspora-memphis-stax-soul-1967',
        'evt-otis-redding-memphis-1965',
        'evt-southern-soul-memphis-1965',
      ],
      phaseSeeds: phaseSeeds(
        [
          "Southern soul — Stax's alternative universe to Motown.",
          'El soul del Sur — el universo alterno de Stax al de Motown.',
        ],
        [
          'Study the horn arrangement + house-band tightness.',
          'Estudia el arreglo de metales + la banda de la casa.',
        ],
        ['Draft a two-bar Stax-style hook.', 'Escribe un hook estilo Stax.'],
        ['Perform live.', 'Interpreten en vivo.'],
        [
          "What did the South argue that the North didn't hear?",
          '¿Qué argumentó el Sur que el Norte no oyó?',
        ],
      ),
    },
    {
      slug: 'feb-day-10',
      label: 'Day 10 — Black Legacy Studio Showcase',
      globeEventIds: [
        'evt-motown-detroit-1963',
        'evt-marvin-gaye-detroit-1971',
        'evt-diaspora-memphis-stax-soul-1967',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Class-selected legacy track.',
          'Pista de legado elegida por la clase.',
        ],
        [
          'Studio time — a track that stitches 2+ Black lineages.',
          'Estudio — pista que cose 2+ linajes negros.',
        ],
        [
          'Include a soul chord walk AND a hip-hop drum program.',
          'Incluye un walk de soul Y un programa de tambor hip-hop.',
        ],
        ['Class showcase.', 'Muestra.'],
        [
          'What did tracing the lineage teach you to hear?',
          '¿Qué te enseñó trazar el linaje a escuchar?',
        ],
      ),
    },
  ],
};

const MAR_WOMENS_HISTORY: UnitTemplate = {
  slug: 'mar-womens-history',
  label: "Women's History Month",
  monthIndex: 3,
  themeId: 'theme-march',
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'mar-day-1',
      label: 'Day 1 — Billie Holiday "Strange Fruit"',
      globeEventIds: ['evt-jazz-billie-holiday-nyc-1939'],
      phaseSeeds: phaseSeeds(
        [
          'Historical framing + Artist Spotlight.',
          'Contexto histórico + Foco Artístico.',
        ],
        [
          'Notice restraint, silence, and dynamics.',
          'Nota la contención, el silencio y la dinámica.',
        ],
        [
          'One line describing a witness moment in your life.',
          'Una línea sobre un momento de testigo en tu vida.',
        ],
        ['One line, one breath.', 'Una línea, una respiración.'],
        ['What did silence do in this song?', '¿Qué hizo el silencio?'],
      ),
    },
    {
      slug: 'mar-day-2',
      label: 'Day 2 — Missy Elliott Producer Study',
      globeEventIds: ['evt-hiphop-portsmouth-1997-missyelliott'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Missy Elliott "Get Ur Freak On".',
          'Foco Artístico — Missy Elliott "Get Ur Freak On".',
        ],
        [
          'In the Studio, map the beat structure.',
          'En el Estudio, mapea la estructura del beat.',
        ],
        [
          '4-bar loop reusing one of her rhythmic ideas.',
          'Loop de 4 compases con una de sus ideas rítmicas.',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          'What did Missy invent that everyone else copied?',
          '¿Qué inventó Missy que todos copiaron?',
        ],
      ),
    },
    {
      slug: 'mar-day-3',
      label: 'Day 3 — H.E.R. or Lauryn Hill',
      globeEventIds: ['evt-hiphop-brooklyn-1996-jayz'],
      phaseSeeds: phaseSeeds(
        [
          'Student choice of Artist Spotlight.',
          'Foco Artístico a elección de la clase.',
        ],
        ['Turn & Talk on lineage.', 'Habla y comparte sobre linaje.'],
        ['Write a two-line tribute.', 'Escribe un tributo de dos líneas.'],
        ['Read aloud.', 'Lee en voz alta.'],
        ['Whose voice raised you?', '¿Qué voz te crió?'],
      ),
    },
    {
      slug: 'mar-day-4',
      label: "Day 4 — Tina Turner & Ike's Complicated Legacy",
      globeEventIds: ['evt-pop-london-1984-tinaturner'],
      phaseSeeds: phaseSeeds(
        [
          'Tina — power, survival, transformation.',
          'Tina — poder, supervivencia, transformación.',
        ],
        ['Study her breath control.', 'Estudia su control respiratorio.'],
        [
          'Write two lines about becoming your own name.',
          'Escribe dos líneas sobre volver a ser tu propio nombre.',
        ],
        ['Read.', 'Lee.'],
        [
          'What did she reclaim in the second act?',
          '¿Qué reclamó en el segundo acto?',
        ],
      ),
    },
    {
      slug: 'mar-day-5',
      label: 'Day 5 — Dolly Parton — Song Craft',
      songId: 'jolene',
      globeEventIds: ['evt-pop-nashville-1977-dollyparton'],
      phaseSeeds: phaseSeeds(
        [
          'Dolly — the master craftsman of songwriting.',
          'Dolly — la maestra del oficio.',
        ],
        [
          'Study "Jolene" — how does the song build tension?',
          'Estudia "Jolene" — ¿cómo construye la tensión?',
        ],
        [
          'Write a two-verse story-song.',
          'Escribe una canción-historia de dos versos.',
        ],
        ['Read the story.', 'Lee la historia.'],
        [
          'What made Dolly a bridge across cultures?',
          '¿Qué hizo de Dolly un puente cultural?',
        ],
      ),
    },
    {
      slug: 'mar-day-6',
      label: 'Day 6 — Producer Study — Sylvia Robinson',
      globeEventIds: ['evt-hiphop-nyc-1979'],
      phaseSeeds: phaseSeeds(
        [
          'Sylvia Robinson — the woman who released "Rapper\'s Delight".',
          'Sylvia Robinson — la mujer que lanzó "Rapper\'s Delight".',
        ],
        [
          'Study her production ear and label instincts.',
          'Estudia su oído productor y su instinto de sello.',
        ],
        [
          'Chop a public-domain groove into a 4-bar loop.',
          'Corta un groove de dominio público en un loop de 4 compases.',
        ],
        ['Peer share.', 'Comparte.'],
        [
          'What did she hear that everyone else missed?',
          '¿Qué escuchó ella que los demás perdieron?',
        ],
      ),
    },
    {
      slug: 'mar-day-7',
      label: 'Day 7 — Songwriter Craft — Carole King',
      songId: 'i_feel_the_earth_move',
      globeEventIds: ['evt-carole-king-la-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Carole King "Tapestry" — the songwriter takes the mic.',
          'Carole King "Tapestry" — la compositora toma el micro.',
        ],
        [
          'Study her piano-and-voice arrangements.',
          'Estudia sus arreglos de piano y voz.',
        ],
        [
          'Draft a two-verse story-song at the piano.',
          'Escribe una canción-historia en dos versos al piano.',
        ],
        ['Perform for the room.', 'Interpreta para el salón.'],
        [
          'What did stepping out from behind the pen cost her?',
          '¿Qué le costó salir de detrás de la pluma?',
        ],
      ),
    },
    {
      slug: 'mar-day-8',
      label: 'Day 8 — Activism Voices — Joan Baez & Nina Simone',
      globeEventIds: [
        'evt-joan-baez-newport-1959',
        'evt-jazz-nina-simone-mississippi-goddam-1964',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Joan Baez + Nina Simone — folk & jazz on the front line.',
          'Joan Baez + Nina Simone — folk y jazz en el frente.',
        ],
        [
          'Study a protest lyric from each.',
          'Estudia una letra de protesta de cada una.',
        ],
        ['Write a two-line witness verse.', 'Escribe un verso testigo.'],
        [
          'Read into a spare accompaniment.',
          'Lee sobre un acompañamiento mínimo.',
        ],
        [
          'Whose voice did each of them speak for?',
          '¿Por qué voz habló cada una?',
        ],
      ),
    },
    {
      slug: 'mar-day-9',
      label: 'Day 9 — Contemporary Spotlight — SZA & Solange',
      globeEventIds: [
        'evt-neosoul-maplewood-2017-sza',
        'evt-neosoul-houston-2016-solange',
      ],
      phaseSeeds: phaseSeeds(
        [
          'SZA "CTRL" and Solange "A Seat at the Table" — R&B redefined.',
          'SZA "CTRL" y Solange "A Seat at the Table" — R&B redefinido.',
        ],
        [
          'Study their spoken-word interludes.',
          'Estudia sus interludios hablados.',
        ],
        [
          'Write a two-line interlude in your own voice.',
          'Escribe un interludio de dos líneas con tu voz.',
        ],
        ['Peer read.', 'Lectura en parejas.'],
        [
          "What space did they claim that wasn't offered?",
          '¿Qué espacio reclamaron que no se les ofreció?',
        ],
      ),
    },
    {
      slug: 'mar-day-10',
      label: "Day 10 — Class Women's Playlist",
      globeEventIds: [
        'evt-jazz-billie-holiday-nyc-1939',
        'evt-pop-london-2011-adele',
        'evt-alanis-morissette-la-1995',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Class-generated playlist — one woman per student.',
          'Playlist de clase — una mujer por estudiante.',
        ],
        [
          'Sequence for storytelling — not just favorites.',
          'Ordena para contar una historia — no solo favoritos.',
        ],
        [
          'Write a one-line liner note per pick.',
          'Escribe una línea de notas por elección.',
        ],
        [
          'Read notes as songs play.',
          'Lee las notas mientras suenan las canciones.',
        ],
        [
          'Whose pick did the class not know?',
          '¿Qué elección no conocía la clase?',
        ],
      ),
    },
  ],
};

const APR_PROTEST: UnitTemplate = {
  slug: 'apr-protest',
  label: 'Voices of Protest & Global Spring',
  monthIndex: 4,
  themeId: 'theme-april',
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'apr-day-1',
      label: 'Day 1 — Marvin Gaye "What\'s Going On"',
      songId: 'whats_going_on',
      globeEventIds: ['evt-marvin-gaye-detroit-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Historical framing + full listen.',
          'Contexto histórico + escucha completa.',
        ],
        [
          'Identify the layered vocals and horns.',
          'Identifica las voces en capas y los metales.',
        ],
        [
          'Write a two-line "what\'s going on" for today.',
          'Escribe dos líneas de "qué está pasando" para hoy.',
        ],
        ['Peer read.', 'Lectura en parejas.'],
        [
          'What does love sound like as protest?',
          '¿Cómo suena el amor como protesta?',
        ],
      ),
    },
    {
      slug: 'apr-day-2',
      label: 'Day 2 — Fela Kuti & Global Protest',
      globeEventIds: ['evt-afrobeat-lagos-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Artist Spotlight — Fela Kuti "Zombie".',
          'Foco Artístico — Fela Kuti "Zombie".',
        ],
        ['Break down Afrobeat rhythm.', 'Descompón el ritmo Afrobeat.'],
        [
          'Group project — 8-bar Afrobeat groove.',
          'Proyecto — groove Afrobeat de 8 compases.',
        ],
        ['Perform.', 'Interpreten.'],
        [
          'How does groove itself become a protest?',
          '¿Cómo el groove se vuelve protesta?',
        ],
      ),
    },
    {
      slug: 'apr-day-3',
      label: 'Day 3 — Earth Day Soundwalk',
      globeEventIds: ['evt-folk-yaren-1968'],
      phaseSeeds: phaseSeeds(
        ['Field-recording listen.', 'Escucha de grabaciones de campo.'],
        [
          'Take a soundwalk and log 5 sounds.',
          'Realiza una caminata sonora, registra 5 sonidos.',
        ],
        [
          'Compose a 30-second sound collage.',
          'Compón un collage sonoro de 30 segundos.',
        ],
        ['Play back.', 'Reproduce.'],
        [
          'What did your ears learn to notice?',
          '¿Qué aprendieron tus oídos a notar?',
        ],
      ),
    },
    {
      slug: 'apr-day-4',
      label: 'Day 4 — Rage Against the Machine',
      globeEventIds: ['evt-hiphop-la-1991-cypresshill'],
      phaseSeeds: phaseSeeds(
        [
          'RATM — funk-metal-rap fusion for the streets.',
          'RATM — fusión funk-metal-rap para la calle.',
        ],
        [
          "Study Tom Morello's guitar effects.",
          'Estudia los efectos de guitarra de Tom Morello.',
        ],
        [
          'Write a two-line rallying cry.',
          'Escribe un grito de convocatoria de dos líneas.',
        ],
        ['Peer read.', 'Lectura en parejas.'],
        [
          'What is a protest song obliged to do?',
          '¿A qué está obligada una canción de protesta?',
        ],
      ),
    },
    {
      slug: 'apr-day-5',
      label: 'Day 5 — Global Spring Anthem',
      globeEventIds: ['evt-afrobeats-lagos-2020-wizkid'],
      phaseSeeds: phaseSeeds(
        [
          'A protest song from another country in this century.',
          'Una canción de protesta de otro país en este siglo.',
        ],
        [
          'Compare its structure to a U.S. anthem.',
          'Compara su estructura con un himno estadounidense.',
        ],
        [
          'Draft a global-solidarity hook.',
          'Escribe un hook de solidaridad global.',
        ],
        ['Class playback.', 'Reproducción.'],
        ['What travels? What stays?', '¿Qué viaja? ¿Qué se queda?'],
      ),
    },
    {
      slug: 'apr-day-6',
      label: 'Day 6 — Nueva Canción — Mercedes Sosa',
      globeEventIds: ['evt-mercedes-sosa-tucuman-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Mercedes Sosa & the Nueva Canción — Latin protest through poetry.',
          'Mercedes Sosa y la Nueva Canción — protesta latina en poesía.',
        ],
        [
          'Study her breath phrasing and dramatic stillness.',
          'Estudia su respiración y su quietud dramática.',
        ],
        [
          'Write a two-line witness verse in your language.',
          'Escribe un verso testigo en tu idioma.',
        ],
        ['Read into the silence.', 'Lee en el silencio.'],
        ['What did the silence carry?', '¿Qué llevó el silencio?'],
      ),
    },
    {
      slug: 'apr-day-7',
      label: 'Day 7 — Anti-Apartheid Anthem',
      globeEventIds: [
        'evt-jazz-johannesburg-1968-masekela',
        'evt-mbaqanga-johannesburg-1964-mahotella',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Hugh Masekela + Miriam Makeba — South African freedom songs.',
          'Hugh Masekela y Miriam Makeba — canciones de libertad sudafricanas.',
        ],
        ['Study the marabi + jazz mix.', 'Estudia la mezcla marabi + jazz.'],
        ['Draft a two-line freedom hook.', 'Escribe un hook de libertad.'],
        ['Sing together.', 'Canten juntos.'],
        [
          'What did the exile change about the song?',
          '¿Qué cambió el exilio en la canción?',
        ],
      ),
    },
    {
      slug: 'apr-day-8',
      label: 'Day 8 — US Labor & the Folk Tradition',
      globeEventIds: [
        'evt-phil-ochs-protest-nyc-1964',
        'evt-bob-dylan-freewheelin-nyc-1963',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Phil Ochs + Bob Dylan — union halls and the folk mic.',
          'Phil Ochs + Bob Dylan — salas sindicales y el micro folk.',
        ],
        [
          'Study a topical songwriting structure.',
          'Estudia una estructura de composición temática.',
        ],
        [
          'Write a two-line labor-witness verse.',
          'Escribe un verso de testimonio laboral.',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        [
          'What is a song obligated to workers doing?',
          '¿Qué hace una canción con obligación hacia los trabajadores?',
        ],
      ),
    },
    {
      slug: 'apr-day-9',
      label: 'Day 9 — Climate & the Youth Voice',
      globeEventIds: ['evt-folk-yaren-1968'],
      phaseSeeds: phaseSeeds(
        [
          'Youth climate movements as musical organizing.',
          'Los movimientos juveniles del clima como organización musical.',
        ],
        [
          'Study a Global South protest ballad.',
          'Estudia una balada de protesta del Sur Global.',
        ],
        [
          'Draft a two-line climate anthem.',
          'Escribe un himno climático de dos líneas.',
        ],
        ['Peer share.', 'Comparte.'],
        [
          'What did the song ask you to do this week?',
          '¿Qué te pidió hacer la canción esta semana?',
        ],
      ),
    },
    {
      slug: 'apr-day-10',
      label: 'Day 10 — Reggae as Protest',
      songId: 'is_this_love',
      globeEventIds: [
        'evt-reggae-kingston-1978-marley',
        'evt-reggae-kingston-1977-tosh',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Marley & Tosh — the one-drop pulse as resistance.',
          'Marley y Tosh — el pulso one-drop como resistencia.',
        ],
        [
          'Study the political vocabulary in the chorus.',
          'Estudia el vocabulario político en el coro.',
        ],
        [
          'Draft a two-line resistance hook.',
          'Escribe un hook de resistencia.',
        ],
        ['Sing in a small circle.', 'Canta en círculo pequeño.'],
        [
          'What did the beat let the singer say?',
          '¿Qué le dejó decir el ritmo al cantante?',
        ],
      ),
    },
  ],
};

const MAY_MOTHERS_DAY: UnitTemplate = {
  slug: 'may-mothers-day',
  label: "Mother's Day & End-of-Year Share",
  monthIndex: 5,
  themeId: 'theme-may',
  kind: 'heritage',
  dayStubs: [
    {
      slug: 'may-day-1',
      label: 'Day 1 — Songs for the Ones Who Raised Us',
      songId: 'isnt_she_lovely',
      globeEventIds: ['evt-funk-detroit-1972-stevie-wonder-superstition'],
      phaseSeeds: phaseSeeds(
        [
          'Class-shared playlist of "songs for the ones who raised us".',
          'Playlist compartida de "canciones para quienes nos criaron".',
        ],
        ['Turn & Talk.', 'Habla y comparte.'],
        [
          'Write one letter-in-a-lyric to someone who raised you.',
          'Escribe una carta-en-letra a alguien que te crió.',
        ],
        ['Read one line.', 'Lee una línea.'],
        ['What did you always want to say?', '¿Qué siempre quisiste decir?'],
      ),
    },
    {
      slug: 'may-day-2',
      label: 'Day 2 — End-of-Year Project Rehearsal',
      globeEventIds: ['evt-jazz-billie-holiday-nyc-1939'],
      phaseSeeds: phaseSeeds(
        [
          'Warm-up with a class favorite.',
          'Calentamiento con una canción favorita.',
        ],
        ['Rehearse final projects.', 'Ensaya proyectos finales.'],
        ['Final touches on your export.', 'Ajustes finales para exportar.'],
        ['Peer feedback in stations.', 'Retroalimentación en estaciones.'],
        [
          'What do you want the audience to feel?',
          '¿Qué quieres que sienta el público?',
        ],
      ),
    },
    {
      slug: 'may-day-3',
      label: 'Day 3 — Share Day',
      songId: 'we_are_family',
      globeEventIds: ['evt-funk-nyc-1978-chic-le-freak'],
      phaseSeeds: phaseSeeds(
        ['Open the room.', 'Abre el salón.'],
        ['Set up performance stations.', 'Monta estaciones de presentación.'],
        ['One last take.', 'Una última toma.'],
        [
          'Full-class share-out — Ambassadors, Performers, Producers.',
          'Presentación completa — Embajadores, Intérpretes, Productores.',
        ],
        [
          'What is the legacy this class is leaving behind?',
          '¿Qué legado deja esta clase?',
        ],
      ),
    },
    {
      slug: 'may-day-4',
      label: 'Day 4 — Legacy & Lineage',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'Study three artists who name their mentors.',
          'Estudia tres artistas que nombran a sus mentores.',
        ],
        [
          'Trace your own three-artist lineage.',
          'Traza tu propia línea de tres artistas.',
        ],
        [
          "Write two lines naming what you'll carry.",
          'Escribe dos líneas sobre lo que llevarás.',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        ['Whose story lives in your voice?', '¿Qué historia vive en tu voz?'],
      ),
    },
    {
      slug: 'may-day-5',
      label: 'Day 5 — Class Anthem Recording',
      globeEventIds: ['evt-motown-detroit-1963'],
      phaseSeeds: phaseSeeds(
        [
          'Vote on a class anthem for the yearbook.',
          'Vota un himno de clase para el anuario.',
        ],
        ['Arrange it for the whole class.', 'Arréglalo para toda la clase.'],
        ['Record together in the Studio.', 'Graben juntos en el Estudio.'],
        ['Full-class listen.', 'Escucha completa.'],
        [
          'What did we build that will outlast the year?',
          '¿Qué construimos que durará más que el año?',
        ],
      ),
    },
    {
      slug: 'may-day-6',
      label: 'Day 6 — Legacy Song for a Loved One',
      songId: 'thank_you_falettinme_be_mice_elf_again',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Sly & the Family Stone "Thank You".',
          'Escucha grupal — Sly & the Family Stone "Thank You".',
        ],
        [
          'Choose a loved one to honor.',
          'Elige una persona amada a quien honrar.',
        ],
        [
          'Write a two-verse legacy song at the piano.',
          'Escribe una canción-legado en dos versos al piano.',
        ],
        ['Read the verses aloud.', 'Lee los versos.'],
        [
          'What did naming them out loud change?',
          '¿Qué cambió nombrarlos en voz alta?',
        ],
      ),
    },
    {
      slug: 'may-day-7',
      label: 'Day 7 — Class Anthem Recording',
      songId: 'we_are_family',
      globeEventIds: ['evt-funk-nyc-1978-chic-le-freak'],
      phaseSeeds: phaseSeeds(
        [
          'Warm up with the class-favorite chorus.',
          'Calentamiento con el coro favorito.',
        ],
        [
          'Arrange the class anthem for full ensemble.',
          'Arregla el himno para ensamble completo.',
        ],
        [
          'Record a full-class take in the Studio.',
          'Graben una toma con toda la clase.',
        ],
        ['Playback for feedback.', 'Reproducción para retroalimentación.'],
        [
          'What did the class hear that surprised it?',
          '¿Qué escuchó la clase que la sorprendió?',
        ],
      ),
    },
    {
      slug: 'may-day-8',
      label: 'Day 8 — Senior Share Rehearsal',
      songId: 'lovely_day',
      globeEventIds: ['evt-funk-la-1975-earth-wind-fire'],
      phaseSeeds: phaseSeeds(
        [
          'Warm up with Bill Withers "Lovely Day".',
          'Calentamiento con Bill Withers "Lovely Day".',
        ],
        [
          'Two full run-throughs of every senior project.',
          'Dos ensayos completos de cada proyecto de senior.',
        ],
        ['Timekeeping and transitions.', 'Manejo de tiempos y transiciones.'],
        ['Peer coaching at stations.', 'Coaching entre pares en estaciones.'],
        ['What still needs one more take?', '¿Qué necesita una toma más?'],
      ),
    },
    {
      slug: 'may-day-9',
      label: 'Day 9 — Portfolio Curation',
      songId: 'stand_by_me',
      globeEventIds: ['evt-soul-memphis-1962'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Ben E. King "Stand By Me".',
          'Escucha grupal — Ben E. King "Stand By Me".',
        ],
        [
          'Curate five best works for your Music Atlas portfolio.',
          'Cura tus cinco mejores obras para tu portafolio Music Atlas.',
        ],
        [
          'Write a one-line reflection per work.',
          'Escribe una reflexión de una línea por obra.',
        ],
        [
          'Peer swap for one round of feedback.',
          'Intercambio en parejas para una ronda de comentarios.',
        ],
        [
          'Which work says the most about the year?',
          '¿Qué obra dice más del año?',
        ],
      ),
    },
    {
      slug: 'may-day-10',
      label: 'Day 10 — Yearbook Recording & Farewell',
      songId: 'coming_home',
      globeEventIds: ['evt-motown-detroit-1963'],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — Diddy / Skylar Grey "Coming Home".',
          'Escucha grupal — Diddy / Skylar Grey "Coming Home".',
        ],
        ['Record a class-wide yearbook chant.', 'Graben un canto de anuario.'],
        [
          'One-line farewell in your Sound Journal.',
          'Una despedida de una línea en tu Diario Sonoro.',
        ],
        ['Circle share.', 'Comparte en círculo.'],
        [
          "What is the sound you'll carry into the summer?",
          '¿Cuál es el sonido que llevarás al verano?',
        ],
      ),
    },
  ],
};

// ============================================================================
// SPRING — GENRE UNITS (Jan – May)
// ============================================================================

const JAN_HIPHOP: UnitTemplate = {
  slug: 'jan-hiphop-culture',
  label: 'Hip Hop Culture',
  monthIndex: 1,
  themeId: 'theme-hiphop',
  kind: 'genre',
  focusGenre: 'Hip Hop',
  focusEra: '1973 – today',
  dayStubs: [
    {
      slug: 'hiphop-day-1',
      label: 'Day 1 — Sedgwick Avenue 1973',
      globeEventIds: ['evt-hiphop-nyc-1973'],
      phaseSeeds: phaseSeeds(
        [
          "DJ Kool Herc's block party — hip-hop's creation moment.",
          'La fiesta de DJ Kool Herc — el momento de creación del hip-hop.',
        ],
        [
          'Feel the "breakbeat" that started it.',
          'Siente el breakbeat que lo inició.',
        ],
        [
          'Draft a two-bar break loop.',
          'Escribe un loop de break de dos compases.',
        ],
        ['Play as an ensemble.', 'Interpreten en ensamble.'],
        [
          'What made a block party a genre?',
          '¿Qué hizo que una fiesta se convirtiera en género?',
        ],
      ),
    },
    {
      slug: 'hiphop-day-2',
      label: 'Day 2 — Run-DMC & the Golden Age Begins',
      globeEventIds: ['evt-hiphop-nyc-1984'],
      phaseSeeds: phaseSeeds(
        [
          'Run-DMC — the moment hip-hop went national.',
          'Run-DMC — el momento en que el hip-hop se volvió nacional.',
        ],
        [
          'Study the 808 kick + snare pattern.',
          'Estudia el patrón 808 kick + snare.',
        ],
        [
          'Write a 4-line rhyme in Run-DMC cadence.',
          'Escribe una rima de 4 líneas en cadencia Run-DMC.',
        ],
        ['Perform in pairs.', 'Interpreta en parejas.'],
        [
          'What did Adidas and album covers give the genre?',
          '¿Qué le dieron Adidas y las portadas al género?',
        ],
      ),
    },
    {
      slug: 'hiphop-day-3',
      label: 'Day 3 — Public Enemy & Political Rap',
      globeEventIds: ['evt-hiphop-longisland-1988-publicenemy'],
      phaseSeeds: phaseSeeds(
        [
          "Public Enemy — the Bomb Squad's wall of sound.",
          'Public Enemy — el muro de sonido de Bomb Squad.',
        ],
        [
          'Study noise, layering, and message.',
          'Estudia ruido, capas y mensaje.',
        ],
        [
          'Write a 4-line political rhyme.',
          'Escribe 4 líneas de rap político.',
        ],
        ['Peer edit.', 'Edición en parejas.'],
        ['What was the sound of urgency?', '¿Cómo sonó la urgencia?'],
      ),
    },
    {
      slug: 'hiphop-day-4',
      label: 'Day 4 — Nas, Illmatic & the New York Novel',
      globeEventIds: ['evt-hiphop-queens-1994-nas'],
      phaseSeeds: phaseSeeds(
        [
          'Nas — a Queensbridge kid writes the great American novel in rhyme.',
          'Nas — un chico de Queensbridge escribe la novela americana en rima.',
        ],
        [
          'Study his interior monologue lines.',
          'Estudia sus líneas de monólogo interior.',
        ],
        [
          'Write a 4-line window-view verse.',
          'Escribe un verso de 4 líneas desde una ventana.',
        ],
        ['Read aloud.', 'Lee en voz alta.'],
        ['What did Illmatic prove?', '¿Qué probó Illmatic?'],
      ),
    },
    {
      slug: 'hiphop-day-5',
      label: 'Day 5 — Outkast & the South',
      globeEventIds: ['evt-hiphop-atlanta-1998-outkast'],
      phaseSeeds: phaseSeeds(
        [
          "Outkast — Atlanta rewires hip-hop's map.",
          'Outkast — Atlanta rehace el mapa del hip-hop.',
        ],
        [
          "Study 3000's guitar-funk fusion.",
          'Estudia la fusión guitarra-funk de 3000.',
        ],
        [
          'Write a hook that blends genres.',
          'Escribe un hook que mezcle géneros.',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          'What does the South demand you feel?',
          '¿Qué exige el Sur que sientas?',
        ],
      ),
    },
    {
      slug: 'hiphop-day-6',
      label: 'Day 6 — Kendrick Lamar',
      globeEventIds: ['evt-hiphop-compton-2012-kendricklamar'],
      phaseSeeds: phaseSeeds(
        [
          'Kendrick — the concept album returns to hip-hop.',
          'Kendrick — el álbum conceptual regresa al hip-hop.',
        ],
        [
          'Study "Alright" — its 4-bar structure.',
          'Estudia "Alright" — su estructura de 4 compases.',
        ],
        [
          'Write 4 lines that could be chanted.',
          'Escribe 4 líneas para cantar.',
        ],
        ['Class chant.', 'Canto colectivo.'],
        [
          'Why did the streets pick "Alright"?',
          '¿Por qué la calle eligió "Alright"?',
        ],
      ),
    },
    {
      slug: 'hiphop-day-7',
      label: 'Day 7 — Women in Hip-Hop',
      globeEventIds: [
        'evt-hiphop-portsmouth-1997-missyelliott',
        'evt-hiphop-brooklyn-1996-lilkim',
        'evt-hiphop-houston-2020-megtheestallion',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Missy, Lil Kim, Megan Thee Stallion — command and craft.',
          'Missy, Lil Kim, Megan Thee Stallion — mando y oficio.',
        ],
        [
          "Study three eras of women's hip-hop.",
          'Estudia tres eras del hip-hop de mujeres.',
        ],
        ['Write a two-line boast.', 'Escribe un pareado presuntuoso.'],
        ['Perform with attitude.', 'Interpreta con actitud.'],
        ['Whose lineage was already there?', '¿Qué linaje ya estaba allí?'],
      ),
    },
    {
      slug: 'hiphop-day-8',
      label: "Day 8 — Producer's Studio Session",
      globeEventIds: ['evt-hiphop-chicago-2004-kanyewest'],
      phaseSeeds: phaseSeeds(
        [
          'Kanye "College Dropout" — soul samples chopped up.',
          'Kanye "College Dropout" — muestras de soul recortadas.',
        ],
        [
          'Chop a public-domain sample in the Studio.',
          'Recorta una muestra de dominio público en el Estudio.',
        ],
        [
          'Build a 4-bar loop with a hook.',
          'Construye un loop de 4 compases con hook.',
        ],
        ['Peer share.', 'Comparte.'],
        [
          'What did chopping change about listening?',
          '¿Qué cambió el chopping en la escucha?',
        ],
      ),
    },
    {
      slug: 'hiphop-day-9',
      label: 'Day 9 — The Trap Era',
      globeEventIds: [
        'evt-hiphop-atlanta-2003',
        'evt-hiphop-houston-2018-travisscott',
      ],
      phaseSeeds: phaseSeeds(
        [
          "Atlanta trap redefines hip-hop's center of gravity.",
          'El trap de Atlanta redefine el centro de gravedad del hip-hop.',
        ],
        [
          'Study the 808 sub-bass + hi-hat triplets.',
          'Estudia el sub-bajo 808 + tresillos de hi-hat.',
        ],
        ['Program a 4-bar trap beat.', 'Programa un beat trap de 4 compases.'],
        ['Write a 4-line flow over it.', 'Escribe 4 líneas sobre el beat.'],
        [
          'What did the South demand the industry finally hear?',
          '¿Qué exigió el Sur que la industria finalmente oyera?',
        ],
      ),
    },
    {
      slug: 'hiphop-day-10',
      label: 'Day 10 — Global Hip-Hop',
      globeEventIds: [
        'evt-hiphop-dakar-1991',
        'evt-hiphop-london-2021-littlesimz',
        'evt-hiphop-paris-1990',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Positive Black Soul (Dakar), Little Simz (London), IAM (Marseille).',
          'Positive Black Soul (Dakar), Little Simz (Londres), IAM (Marsella).',
        ],
        [
          'Compare cadences across three languages.',
          'Compara cadencias en tres idiomas.',
        ],
        [
          'Write a 4-line multilingual verse.',
          'Escribe un verso multilingüe de 4 líneas.',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          'What travels when the language changes?',
          '¿Qué viaja cuando cambia el idioma?',
        ],
      ),
    },
  ],
};

const FEB_RNB_SOUL: UnitTemplate = {
  slug: 'feb-rnb-soul-funk',
  label: 'R&B / Soul / Funk',
  monthIndex: 2,
  themeId: 'theme-rnb-soul-funk',
  kind: 'genre',
  focusGenre: 'R&B / Soul / Funk',
  focusEra: '1954 – today',
  dayStubs: [
    {
      slug: 'rnb-day-1',
      label: 'Day 1 — Ray Charles Invents Soul',
      globeEventIds: ['evt-soul-memphis-1962'],
      phaseSeeds: phaseSeeds(
        [
          'Ray — gospel piano meets secular blues.',
          'Ray — piano gospel se cruza con blues secular.',
        ],
        [
          'Study "I Got a Woman" chord walk.',
          'Estudia el walk de acordes de "I Got a Woman".',
        ],
        [
          'Write a two-bar secular gospel hook.',
          'Escribe un hook gospel secular de dos compases.',
        ],
        ['Perform.', 'Interpreta.'],
        [
          'What did Ray teach every soul singer after?',
          '¿Qué enseñó Ray a cada cantante de soul después?',
        ],
      ),
    },
    {
      slug: 'rnb-day-2',
      label: 'Day 2 — Aretha Franklin — Respect',
      songId: 'respect',
      globeEventIds: ['evt-diaspora-memphis-stax-soul-1967'],
      phaseSeeds: phaseSeeds(
        [
          'Aretha reclaims Otis\'s "Respect".',
          'Aretha reclama "Respect" de Otis.',
        ],
        ['A/B the two versions.', 'Compara las dos versiones.'],
        [
          'Write a two-line demand hook.',
          'Escribe un hook de demanda de dos líneas.',
        ],
        ['Sing together.', 'Canten juntas.'],
        [
          'What is a demand vs. a request in song?',
          '¿Cuál es la diferencia entre demanda y pedido en la canción?',
        ],
      ),
    },
    {
      slug: 'rnb-day-3',
      label: 'Day 3 — James Brown Invents Funk',
      globeEventIds: [
        'evt-funk-nyc-1963-james-brown-apollo',
        'evt-funk-macon-1965-james-brown-papas',
      ],
      phaseSeeds: phaseSeeds(
        ['JB — "One" as the downbeat.', 'JB — el "uno" como downbeat.'],
        [
          'Study the horn stab + guitar chicken-scratch.',
          'Estudia el stab de metales + rasgueo scratch.',
        ],
        [
          'Group project — 4-bar JB groove.',
          'Grupo — groove JB de 4 compases.',
        ],
        ['Perform live.', 'Interpreten en vivo.'],
        ['What did "on the one" change?', '¿Qué cambió tocar "en el uno"?'],
      ),
    },
    {
      slug: 'rnb-day-4',
      label: 'Day 4 — Sly & the Family Stone',
      songId: 'thank_you_falettinme_be_mice_elf_again',
      globeEventIds: ['evt-funk-sf-1969-sly-stone-stand'],
      phaseSeeds: phaseSeeds(
        [
          'Sly — desegregated band, radical funk.',
          'Sly — banda desegregada, funk radical.',
        ],
        ['Study his fuzz-bass pulse.', 'Estudia su pulso de bajo fuzz.'],
        ['Program a 4-bar Sly-style groove.', 'Programa un groove estilo Sly.'],
        ['Class playback.', 'Reproducción.'],
        [
          'What did the band configuration signal?',
          '¿Qué señalaba la configuración de la banda?',
        ],
      ),
    },
    {
      slug: 'rnb-day-5',
      label: 'Day 5 — Parliament-Funkadelic',
      globeEventIds: [
        'evt-funk-la-1975-parliament-mothership',
        'evt-funk-detroit-1982-george-clinton-solo',
      ],
      phaseSeeds: phaseSeeds(
        [
          'P-Funk — the mothership descends.',
          'P-Funk — la nave nodriza desciende.',
        ],
        ['Study the deep pocket bass.', 'Estudia el bajo en el bolsillo.'],
        ['Draft a psychedelic funk hook.', 'Escribe un hook funk psicodélico.'],
        ['Perform.', 'Interpreta.'],
        [
          'What did P-Funk imagine the future to be?',
          '¿Cómo imaginó P-Funk el futuro?',
        ],
      ),
    },
    {
      slug: 'rnb-day-6',
      label: 'Day 6 — Earth, Wind & Fire',
      songId: 'september',
      globeEventIds: ['evt-funk-la-1975-earth-wind-fire'],
      phaseSeeds: phaseSeeds(
        [
          'EWF — orchestral funk with kalimba.',
          'EWF — funk orquestal con kalimba.',
        ],
        [
          'Study the horn arrangement of "September".',
          'Estudia el arreglo de metales de "September".',
        ],
        [
          'Group project — arrange your own horn line.',
          'Arreglen su propia línea de metales.',
        ],
        ['Perform.', 'Interpreten.'],
        [
          'What did EWF make possible for pop-funk?',
          '¿Qué hizo posible EWF para el pop-funk?',
        ],
      ),
    },
    {
      slug: 'rnb-day-7',
      label: "Day 7 — Neo-Soul & D'Angelo",
      globeEventIds: ['evt-neosoul-nola-2019-luckydaye'],
      phaseSeeds: phaseSeeds(
        [
          "D'Angelo & the neo-soul return to Sunday-morning R&B.",
          "D'Angelo y el retorno neo-soul al R&B dominical.",
        ],
        [
          'Study the pocket-behind-the-beat feel.',
          'Estudia la sensación por detrás del beat.',
        ],
        [
          'Write two lines with a lazy backbeat.',
          'Escribe dos líneas con backbeat perezoso.',
        ],
        ['Peer read.', 'Lectura en parejas.'],
        [
          'What did neo-soul recover from before?',
          '¿Qué recuperó el neo-soul de antes?',
        ],
      ),
    },
    {
      slug: 'rnb-day-8',
      label: 'Day 8 — R&B Today — Solange, SZA',
      globeEventIds: ['evt-pop-losangeles-2019-billieeilish'],
      phaseSeeds: phaseSeeds(
        [
          'Solange, SZA — 21st-century R&B.',
          'Solange, SZA — R&B del siglo 21.',
        ],
        [
          "Study SZA's reverbed texture.",
          'Estudia la textura reverberada de SZA.',
        ],
        [
          'Draft an R&B-adjacent Studio sketch.',
          'Boceta una pista adyacente al R&B.',
        ],
        ['Class playback.', 'Reproducción.'],
        ['What is R&B carrying today?', '¿Qué lleva el R&B hoy?'],
      ),
    },
    {
      slug: 'rnb-day-9',
      label: 'Day 9 — Motown vs. Stax — The Sound War',
      songId: 'ill_be_there',
      globeEventIds: [
        'evt-motown-detroit-1963',
        'evt-diaspora-memphis-stax-soul-1967',
      ],
      phaseSeeds: phaseSeeds(
        [
          "Two houses, two sounds — Detroit's polish vs. Memphis's grit.",
          'Dos casas, dos sonidos — el pulido de Detroit vs. la aspereza de Memphis.',
        ],
        [
          'A/B a Temptations track against a Sam & Dave track.',
          'Compara A/B una pista de Temptations con una de Sam & Dave.',
        ],
        [
          'Draft a two-bar hook in each style.',
          'Escribe un hook de dos compases en cada estilo.',
        ],
        ['Peer share both.', 'Comparte ambos.'],
        [
          'Which house did your ear pick and why?',
          '¿Qué casa eligió tu oído y por qué?',
        ],
      ),
    },
    {
      slug: 'rnb-day-10',
      label: 'Day 10 — Neo-Soul Continues — Lauryn Hill & SZA',
      globeEventIds: [
        'evt-neosoul-southorange-1998-laurynhill',
        'evt-neosoul-maplewood-2017-sza',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Lauryn Hill "Miseducation" to SZA "CTRL" — two decades apart.',
          'Lauryn Hill "Miseducation" a SZA "CTRL" — dos décadas de distancia.',
        ],
        [
          'Study their spoken interlude choices.',
          'Estudia sus interludios hablados.',
        ],
        [
          'Write a two-line personal interlude.',
          'Escribe un interludio personal.',
        ],
        ['Class playback.', 'Reproducción.'],
        ['What lineage did SZA claim?', '¿Qué linaje reclamó SZA?'],
      ),
    },
  ],
};

const MAR_ROCK: UnitTemplate = {
  slug: 'mar-rock-to-punk',
  label: "Rock 'n' Roll to Punk",
  monthIndex: 3,
  themeId: 'theme-rock',
  kind: 'genre',
  focusGenre: 'Rock',
  focusEra: '1954 – 1980',
  dayStubs: [
    {
      slug: 'rock-day-1',
      label: 'Day 1 — Sister Rosetta Tharpe — the True First',
      globeEventIds: ['evt-gospel-jackson-1965'],
      phaseSeeds: phaseSeeds(
        [
          'Sister Rosetta Tharpe — the guitarist who inspired Elvis + Chuck.',
          'Sister Rosetta Tharpe — la guitarrista que inspiró a Elvis y Chuck.',
        ],
        [
          'Study her lead guitar phrasing.',
          'Estudia su fraseo de guitarra líder.',
        ],
        ['Draft a two-bar riff.', 'Escribe un riff de dos compases.'],
        ['Play it aloud.', 'Tócalo.'],
        [
          'Why did history hide her name?',
          '¿Por qué la historia ocultó su nombre?',
        ],
      ),
    },
    {
      slug: 'rock-day-2',
      label: 'Day 2 — Chuck Berry & Little Richard',
      globeEventIds: ['evt-elvis-memphis-1954'],
      phaseSeeds: phaseSeeds(
        [
          "Chuck's duck walk, Little Richard's piano scream.",
          'El duck walk de Chuck, el grito al piano de Little Richard.',
        ],
        ['Study a Chuck Berry lick.', 'Estudia un lick de Chuck Berry.'],
        [
          "Write a two-line rock 'n' roll narrative.",
          "Escribe dos líneas de narrativa rock 'n' roll.",
        ],
        ['Perform with attitude.', 'Interpreta con actitud.'],
        ["What did rock 'n' roll build?", "¿Qué construyó el rock 'n' roll?"],
      ),
    },
    {
      slug: 'rock-day-3',
      label: 'Day 3 — The British Invasion',
      songId: 'hey_jude',
      globeEventIds: ['evt-pop-london-1987-georgemichael'],
      phaseSeeds: phaseSeeds(
        [
          'The Beatles pay tribute — and steal from — Chuck Berry.',
          'Los Beatles rinden tributo — y toman de — Chuck Berry.',
        ],
        [
          'Study the Beatles guitar tones.',
          'Estudia los tonos de guitarra Beatle.',
        ],
        [
          'Write a two-line British Invasion hook.',
          'Escribe un hook de Invasión Británica.',
        ],
        ['Sing along.', 'Canten.'],
        ['What did the export do?', '¿Qué hizo la exportación?'],
      ),
    },
    {
      slug: 'rock-day-4',
      label: 'Day 4 — Jimi Hendrix Reinvents the Guitar',
      globeEventIds: ['evt-funk-la-1975-earth-wind-fire'],
      phaseSeeds: phaseSeeds(
        [
          'Hendrix — fuzz, feedback, whammy bar as vocabulary.',
          'Hendrix — fuzz, feedback, whammy como vocabulario.',
        ],
        ['Study a Hendrix double-stop.', 'Estudia un double-stop de Hendrix.'],
        [
          'Draft a two-bar improvisation.',
          'Boceta una improvisación de dos compases.',
        ],
        ['Play through.', 'Toquen.'],
        ['What did he prove was possible?', '¿Qué demostró que era posible?'],
      ),
    },
    {
      slug: 'rock-day-5',
      label: 'Day 5 — Led Zeppelin — Heavy Blues',
      songId: 'whole_lotta_love',
      globeEventIds: ['evt-blues-chicago-1965-bking'],
      phaseSeeds: phaseSeeds(
        [
          'Zeppelin — English boys borrow the American blues.',
          'Zeppelin — chicos ingleses toman prestado el blues americano.',
        ],
        [
          "Study Page's riff construction.",
          'Estudia la construcción de riffs de Page.',
        ],
        ['Write a heavy blues-rock hook.', 'Escribe un hook heavy blues-rock.'],
        ['Play with the amp cranked.', 'Toquen con el amp arriba.'],
        ['What do we owe to whom?', '¿Qué le debemos a quién?'],
      ),
    },
    {
      slug: 'rock-day-6',
      label: 'Day 6 — Bowie — Rock as Persona',
      globeEventIds: ['evt-pop-london-1973-eltonjohn'],
      phaseSeeds: phaseSeeds(
        [
          'Bowie invents personas for every album.',
          'Bowie inventa personas para cada disco.',
        ],
        ['Study the Ziggy Stardust arc.', 'Estudia el arco de Ziggy Stardust.'],
        [
          'Design a persona and a two-line intro song.',
          'Diseña una persona y una canción de intro de dos líneas.',
        ],
        ['Perform the persona.', 'Interpreta el personaje.'],
        [
          'What does a persona free you to say?',
          '¿Qué te libera decir un personaje?',
        ],
      ),
    },
    {
      slug: 'rock-day-7',
      label: 'Day 7 — Patti Smith & Punk',
      globeEventIds: ['evt-pop-nyc-1984-madonna'],
      phaseSeeds: phaseSeeds(
        [
          'Patti Smith — poetry as three-chord fire.',
          'Patti Smith — poesía como fuego de tres acordes.',
        ],
        ['Study "Gloria" build.', 'Estudia la construcción de "Gloria".'],
        [
          'Write a two-line punk chant.',
          'Escribe un canto punk de dos líneas.',
        ],
        ['Read fiercely.', 'Lee con fuerza.'],
        [
          'What did the poet bring to the mic?',
          '¿Qué trajo la poeta al micro?',
        ],
      ),
    },
    {
      slug: 'rock-day-8',
      label: 'Day 8 — Nirvana — Grunge Cleans House',
      songId: 'smells_like_teen_spirit',
      globeEventIds: ['evt-hiphop-la-1991-cypresshill'],
      phaseSeeds: phaseSeeds(
        [
          'Nirvana — grunge reboots rock.',
          'Nirvana — grunge reinicia el rock.',
        ],
        [
          'Study the quiet-loud-quiet structure.',
          'Estudia la estructura suave-fuerte-suave.',
        ],
        [
          'Draft a two-bar grunge dynamic.',
          'Escribe una dinámica grunge de dos compases.',
        ],
        ['Perform loud.', 'Interpreta fuerte.'],
        ['What did grunge rip out?', '¿Qué arrancó el grunge?'],
      ),
    },
    {
      slug: 'rock-day-9',
      label: 'Day 9 — Punk Poets — Patti & the Ramones',
      globeEventIds: ['evt-patti-smith-nyc-1975', 'evt-blondie-nyc-1978'],
      phaseSeeds: phaseSeeds(
        [
          'CBGB 1975 — Patti Smith, Ramones, Blondie share a stage.',
          'CBGB 1975 — Patti Smith, Ramones, Blondie comparten escenario.',
        ],
        [
          'Study 3-chord songs with sharp lyrics.',
          'Estudia canciones de 3 acordes con letras filosas.',
        ],
        ['Write a two-line punk chant.', 'Escribe un canto punk.'],
        ['Perform loud and fast.', 'Interpreta fuerte y rápido.'],
        [
          'What did the New York downtown demand?',
          '¿Qué exigió el centro de Nueva York?',
        ],
      ),
    },
    {
      slug: 'rock-day-10',
      label: 'Day 10 — Grunge Legacy — from Nirvana to Arctic Monkeys',
      songId: 'smells_like_teen_spirit',
      globeEventIds: ['evt-arctic-monkeys-sheffield-2006'],
      phaseSeeds: phaseSeeds(
        [
          "Grunge influence — Sheffield's Arctic Monkeys inherit the DNA.",
          'La influencia grunge — los Arctic Monkeys de Sheffield heredan el ADN.',
        ],
        [
          'A/B "Teen Spirit" vs. "I Bet You Look Good on the Dancefloor".',
          'A/B "Teen Spirit" vs. "I Bet You Look Good on the Dancefloor".',
        ],
        [
          'Write a two-line dynamic-shift hook.',
          'Escribe un hook de cambio dinámico.',
        ],
        ['Perform loud-soft-loud.', 'Interpreta fuerte-suave-fuerte.'],
        [
          'What did the next generation inherit?',
          '¿Qué heredó la siguiente generación?',
        ],
      ),
    },
  ],
};

const APR_REGGAE_AFROBEAT: UnitTemplate = {
  slug: 'apr-reggae-afrobeat',
  label: 'Reggae & Afrobeat',
  monthIndex: 4,
  themeId: 'theme-reggae-afrobeat',
  kind: 'genre',
  focusGenre: 'Reggae / Afrobeat',
  focusEra: '1960 – today',
  dayStubs: [
    {
      slug: 'reggae-day-1',
      label: 'Day 1 — Ska to Rocksteady',
      globeEventIds: ['evt-reggae-kingston-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Ska in 1960s Kingston — celebrating independence.',
          'Ska en Kingston 1960 — celebrando independencia.',
        ],
        ['Feel the up-strum.', 'Siente el up-strum.'],
        [
          'Draft a two-bar ska riff.',
          'Escribe un riff de ska de dos compases.',
        ],
        ['Play together.', 'Tocar juntos.'],
        ['What did independence sound like?', '¿Cómo sonó la independencia?'],
      ),
    },
    {
      slug: 'reggae-day-2',
      label: 'Day 2 — Bob Marley & the Wailers',
      songId: 'three_little_birds',
      globeEventIds: ['evt-reggae-kingston-1978-marley'],
      phaseSeeds: phaseSeeds(
        [
          'Marley — reggae becomes global.',
          'Marley — el reggae se vuelve global.',
        ],
        ['Study the one-drop drum pattern.', 'Estudia el patrón one-drop.'],
        [
          'Draft a two-bar reggae hook.',
          'Escribe un hook reggae de dos compases.',
        ],
        ['Sing along.', 'Canten.'],
        ['What message rode on the pulse?', '¿Qué mensaje viajó en el pulso?'],
      ),
    },
    {
      slug: 'reggae-day-3',
      label: 'Day 3 — Peter Tosh & the Militant Voice',
      globeEventIds: ['evt-reggae-kingston-1977-tosh'],
      phaseSeeds: phaseSeeds(
        [
          'Tosh — sharper edge, same lineage.',
          'Tosh — un filo más agudo, mismo linaje.',
        ],
        ['Study his guitar tone.', 'Estudia su tono de guitarra.'],
        ['Write a two-line demand.', 'Escribe una demanda de dos líneas.'],
        ['Read out loud.', 'Lee en voz alta.'],
        ['What did the movement demand?', '¿Qué exigió el movimiento?'],
      ),
    },
    {
      slug: 'reggae-day-4',
      label: 'Day 4 — Lee Perry & Dub Science',
      globeEventIds: [
        'evt-dub-kingston-1972-tubby',
        'evt-dub-kingston-1976-pablo',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Dub — the mixing board becomes the instrument.',
          'Dub — la mesa de mezclas se vuelve instrumento.',
        ],
        ['Study a dub effect chain.', 'Estudia una cadena de efectos dub.'],
        [
          'Remix a class track through delay + reverb.',
          'Remix a un track con delay + reverb.',
        ],
        ['Playback.', 'Reproducción.'],
        [
          'What is subtraction as a creative act?',
          '¿Qué es la resta como acto creativo?',
        ],
      ),
    },
    {
      slug: 'reggae-day-5',
      label: 'Day 5 — Dancehall Rises',
      globeEventIds: [
        'evt-dancehall-kingston-1975',
        'evt-dancehall-kingston-1985',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Dancehall — digital riddims take the yard.',
          'Dancehall — los riddims digitales toman el patio.',
        ],
        ['Program a dancehall pattern.', 'Programa un patrón dancehall.'],
        [
          'Write a two-line rider hook.',
          'Escribe un hook rider de dos líneas.',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          'What did the yard demand of the beat?',
          '¿Qué exigió el patio del beat?',
        ],
      ),
    },
    {
      slug: 'reggae-day-6',
      label: 'Day 6 — Fela Kuti & Afrobeat',
      globeEventIds: ['evt-afrobeat-lagos-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Fela — political afrobeat, marathon songs.',
          'Fela — afrobeat político, canciones maratón.',
        ],
        [
          'Study the interlocking guitar/percussion.',
          'Estudia el entretejido guitarra/percusión.',
        ],
        ['Draft an Afrobeat groove.', 'Boceta un groove Afrobeat.'],
        ['Perform in ensemble.', 'Interpreten en ensamble.'],
        [
          'What did marathon-long songs argue?',
          '¿Qué argumentaban las canciones maratón?',
        ],
      ),
    },
    {
      slug: 'reggae-day-7',
      label: 'Day 7 — Afrobeats — Wizkid, Burna Boy, Tems',
      globeEventIds: [
        'evt-afrobeats-lagos-2020-wizkid',
        'evt-afrobeats-portharcourt-2019-burna',
        'evt-afrobeats-lagos-2021-tems',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Afrobeats (with an s) — the modern Nigerian wave.',
          'Afrobeats (con s) — la ola nigeriana moderna.',
        ],
        ['Study the log-drum bass.', 'Estudia el bajo log-drum.'],
        ['Program an Afrobeats groove.', 'Programa un groove Afrobeats.'],
        ['Peer share.', 'Comparte.'],
        [
          'What does the export change about the source?',
          '¿Qué cambia la exportación en la fuente?',
        ],
      ),
    },
    {
      slug: 'reggae-day-8',
      label: 'Day 8 — Cross-Continental Studio',
      globeEventIds: [
        'evt-reggae-kingston-1978-marley',
        'evt-afrobeat-lagos-1971',
        'evt-afrobeats-lagos-2020-wizkid',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Class listen — a track that bridges reggae + afrobeats.',
          'Escucha grupal — una pista que puentea reggae y afrobeats.',
        ],
        [
          'Studio time — build a bridge track.',
          'Estudio — construye una pista puente.',
        ],
        [
          'Include a one-drop AND an afrobeat pattern.',
          'Incluye un one-drop Y un patrón afrobeat.',
        ],
        ['Class showcase.', 'Muestra.'],
        ['What travels the ocean and back?', '¿Qué cruza el océano y vuelve?'],
      ),
    },
    {
      slug: 'reggae-day-9',
      label: 'Day 9 — Modern Afrobeats Collaborations',
      globeEventIds: [
        'evt-afrobeats-lagos-2019-davido',
        'evt-burna-boy-lagos-2020',
        'evt-afrobeats-lagos-2021-tems',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Davido, Burna Boy, Tems — global Afrobeats collaborations.',
          'Davido, Burna Boy, Tems — colaboraciones globales de Afrobeats.',
        ],
        [
          'Study a US-Afrobeats crossover track.',
          'Estudia una pista de cruce US-Afrobeats.',
        ],
        ['Program a log-drum bass loop.', 'Programa un loop de bajo log-drum.'],
        ['Peer share the loop.', 'Comparte el loop.'],
        [
          'What did the collaboration change on both sides?',
          '¿Qué cambió la colaboración en ambos lados?',
        ],
      ),
    },
    {
      slug: 'reggae-day-10',
      label: 'Day 10 — Kingston Revival',
      songId: 'is_this_love',
      globeEventIds: [
        'evt-reggae-kingston-2017-chronixx',
        'evt-reggae-kingston-2018-protoje',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Chronixx, Protoje — the reggae revival keeps the one-drop alive.',
          'Chronixx, Protoje — el revival mantiene vivo el one-drop.',
        ],
        [
          'Study modern reggae production with hip-hop touches.',
          'Estudia producción reggae moderna con toques hip-hop.',
        ],
        ['Draft a revival-style hook.', 'Escribe un hook de revival.'],
        ['Class playback.', 'Reproducción.'],
        [
          'What is being revived — and what is being invented?',
          '¿Qué se revive y qué se inventa?',
        ],
      ),
    },
  ],
};

const MAY_COUNTRY: UnitTemplate = {
  slug: 'may-country-americana',
  label: 'Country & Americana',
  monthIndex: 5,
  themeId: 'theme-country',
  kind: 'genre',
  focusGenre: 'Country',
  focusEra: '1927 – today',
  dayStubs: [
    {
      slug: 'country-day-1',
      label: 'Day 1 — The Bristol Sessions',
      globeEventIds: ['evt-country-bristol-1927'],
      phaseSeeds: phaseSeeds(
        [
          'Bristol 1927 — the "Big Bang of Country Music".',
          'Bristol 1927 — el "Big Bang de la música country".',
        ],
        [
          'Study the Carter Family strum.',
          'Estudia el rasgueo de la Familia Carter.',
        ],
        ['Draft a two-line pastoral verse.', 'Escribe dos líneas pastorales.'],
        ['Read aloud.', 'Lee en voz alta.'],
        ['What is a "folk archive"?', '¿Qué es un "archivo folk"?'],
      ),
    },
    {
      slug: 'country-day-2',
      label: 'Day 2 — The Grand Ole Opry',
      globeEventIds: ['evt-grand-ole-opry-nashville-1925'],
      phaseSeeds: phaseSeeds(
        [
          "The Opry — Nashville becomes country's home.",
          'El Opry — Nashville se vuelve la capital del country.',
        ],
        ['Study a Hank Williams break.', 'Estudia un break de Hank Williams.'],
        [
          'Write a lonesome two-line verse.',
          'Escribe un verso solitario de dos líneas.',
        ],
        ['Perform.', 'Interpreta.'],
        ['What does lonesome sound like?', '¿Cómo suena "lonesome"?'],
      ),
    },
    {
      slug: 'country-day-3',
      label: 'Day 3 — Johnny Cash at Folsom',
      songId: 'ring_of_fire',
      globeEventIds: ['evt-grand-ole-opry-nashville-1925'],
      phaseSeeds: phaseSeeds(
        [
          'Cash — the man in black plays for the incarcerated.',
          'Cash — el hombre de negro toca para los encarcelados.',
        ],
        [
          'Study "Ring of Fire" horn charts.',
          'Estudia las trompetas de "Ring of Fire".',
        ],
        [
          'Write a two-line outlaw ballad.',
          'Escribe una balada de fuera de la ley.',
        ],
        ['Read.', 'Lee.'],
        [
          'What did the audience of the prison teach him?',
          '¿Qué le enseñó el público de la prisión?',
        ],
      ),
    },
    {
      slug: 'country-day-4',
      label: 'Day 4 — Dolly Parton',
      songId: 'jolene',
      globeEventIds: ['evt-pop-nashville-1977-dollyparton'],
      phaseSeeds: phaseSeeds(
        [
          'Dolly — the storyteller and empire.',
          'Dolly — la narradora y el imperio.',
        ],
        [
          'Study her tension-building in "Jolene".',
          'Estudia la tensión en "Jolene".',
        ],
        ['Write a two-verse story-song.', 'Escribe una canción-historia.'],
        ['Read.', 'Lee.'],
        [
          'What did Dolly write across audiences?',
          '¿A qué públicos habló Dolly?',
        ],
      ),
    },
    {
      slug: 'country-day-5',
      label: 'Day 5 — Emmylou Harris & Gillian Welch',
      globeEventIds: [
        'evt-emmylou-harris-wrecking-ball-nashville-1995',
        'evt-gillian-welch-revival-nashville-1996',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Americana renewal in Nashville.',
          'Renovación americana en Nashville.',
        ],
        ['Study close-harmony singing.', 'Estudia la armonía cercana.'],
        ['Write a two-line duet.', 'Escribe un dueto de dos líneas.'],
        ['Sing in pairs.', 'Canten en parejas.'],
        [
          'What does "Americana" argue against?',
          '¿Contra qué argumenta "Americana"?',
        ],
      ),
    },
    {
      slug: 'country-day-6',
      label: 'Day 6 — Lucinda Williams',
      globeEventIds: ['evt-lucinda-williams-car-wheels-nashville-1998'],
      phaseSeeds: phaseSeeds(
        [
          'Lucinda — the poet of the American road.',
          'Lucinda — la poeta del camino americano.',
        ],
        [
          'Study "Car Wheels on a Gravel Road" imagery.',
          'Estudia las imágenes de "Car Wheels on a Gravel Road".',
        ],
        [
          'Write two lines of a road song.',
          'Escribe dos líneas de una canción de camino.',
        ],
        ['Read aloud.', 'Lee.'],
        [
          'What did the road teach you to notice?',
          '¿Qué te enseñó el camino a notar?',
        ],
      ),
    },
    {
      slug: 'country-day-7',
      label: 'Day 7 — Kacey Musgraves & Modern Country',
      globeEventIds: ['evt-pop-nashville-2008-taylorswift'],
      phaseSeeds: phaseSeeds(
        [
          'Musgraves — country wrapped in synths.',
          'Musgraves — country envuelto en sintetizadores.',
        ],
        ['Study the vocal double-tracking.', 'Estudia el doblaje vocal.'],
        ['Draft a country-pop hook.', 'Escribe un hook country-pop.'],
        ['Peer share.', 'Comparte.'],
        [
          'Where is the border of country today?',
          '¿Dónde está la frontera del country hoy?',
        ],
      ),
    },
    {
      slug: 'country-day-8',
      label: 'Day 8 — Country & Race — the Reckoning',
      globeEventIds: ['evt-country-bristol-1927'],
      phaseSeeds: phaseSeeds(
        [
          'Rhiannon Giddens — reclaiming Black country roots.',
          'Rhiannon Giddens — reclamando raíces negras del country.',
        ],
        [
          'Study early Black string-band music.',
          'Estudia música temprana de string band negra.',
        ],
        [
          'Write a two-line reclaiming verse.',
          'Escribe dos líneas reclamando.',
        ],
        ['Read.', 'Lee.'],
        [
          'What history got hidden from the Grand Ole Opry?',
          '¿Qué historia se ocultó al Opry?',
        ],
      ),
    },
    {
      slug: 'country-day-9',
      label: 'Day 9 — Outlaw Country',
      songId: 'the_gambler',
      globeEventIds: ['evt-grand-ole-opry-nashville-1925'],
      phaseSeeds: phaseSeeds(
        [
          'Willie, Waylon, Kris — the outlaws leave Nashville and come back.',
          'Willie, Waylon, Kris — los "outlaws" se van de Nashville y regresan.',
        ],
        [
          'Study outlaw phrasing and character.',
          'Estudia el fraseo y el personaje "outlaw".',
        ],
        [
          'Write a two-verse story ballad.',
          'Escribe una balada narrativa de dos versos.',
        ],
        ['Read the story.', 'Lee la historia.'],
        [
          'What did the outlaws refuse to sell?',
          '¿Qué se negaron a vender los outlaws?',
        ],
      ),
    },
    {
      slug: 'country-day-10',
      label: 'Day 10 — Modern Americana',
      songId: 'wagon_wheel',
      globeEventIds: [
        'evt-jason-isbell-southeastern-nashville-2013',
        'evt-lucinda-williams-car-wheels-nashville-1998',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Jason Isbell, Lucinda Williams, Old Crow Medicine Show — Americana today.',
          'Jason Isbell, Lucinda Williams, Old Crow Medicine Show — Americana hoy.',
        ],
        [
          'Study confessional lyric writing.',
          'Estudia la escritura confesional.',
        ],
        [
          'Write a two-line confessional verse.',
          'Escribe un verso confesional.',
        ],
        ['Perform to the class.', 'Interpreta para la clase.'],
        [
          'What did Americana refuse to sanitize?',
          '¿Qué se negó a sanear Americana?',
        ],
      ),
    },
  ],
};

const MAY_ELECTRONIC: UnitTemplate = {
  slug: 'may-electronic-music',
  label: 'Electronic Music',
  monthIndex: 5,
  themeId: 'theme-electronic',
  kind: 'genre',
  focusGenre: 'Electronic',
  focusEra: '1970 – today',
  dayStubs: [
    {
      slug: 'edm-day-1',
      label: 'Day 1 — Kraftwerk & the Machine',
      globeEventIds: ['evt-electronic-dusseldorf-1979'],
      phaseSeeds: phaseSeeds(
        [
          'Kraftwerk — Düsseldorf builds the future.',
          'Kraftwerk — Düsseldorf construye el futuro.',
        ],
        ['Feel the sequenced arpeggio.', 'Siente el arpegio secuenciado.'],
        [
          'Program a 4-bar synth loop.',
          'Programa un loop de sintetizador de 4 compases.',
        ],
        ['Peer share.', 'Comparte.'],
        [
          'What did they hear the future would need?',
          '¿Qué escucharon que necesitaría el futuro?',
        ],
      ),
    },
    {
      slug: 'edm-day-2',
      label: 'Day 2 — Chicago House',
      globeEventIds: ['evt-house-chicago-1984'],
      phaseSeeds: phaseSeeds(
        [
          'Chicago house — Frankie Knuckles at the Warehouse.',
          'La casa de Chicago — Frankie Knuckles en el Warehouse.',
        ],
        [
          'Program a 4/4 house beat with claps.',
          'Programa un house 4/4 con palmas.',
        ],
        ['Add a bassline.', 'Agrega bajo.'],
        ['Play on the floor.', 'Tocar en la pista.'],
        ['What did the dance floor demand?', '¿Qué exigió la pista?'],
      ),
    },
    {
      slug: 'edm-day-3',
      label: 'Day 3 — Detroit Techno',
      globeEventIds: ['evt-motown-detroit-1963'],
      phaseSeeds: phaseSeeds(
        [
          'Juan Atkins, Derrick May — Detroit techno rises.',
          'Juan Atkins, Derrick May — nace el techno de Detroit.',
        ],
        ['Study the machine-funk pulse.', 'Estudia el pulso machine-funk.'],
        [
          'Program a 4-bar techno loop.',
          'Programa un loop techno de 4 compases.',
        ],
        ['Peer share.', 'Comparte.'],
        [
          'What did the post-industrial city do to the beat?',
          '¿Qué le hizo la ciudad postindustrial al beat?',
        ],
      ),
    },
    {
      slug: 'edm-day-4',
      label: 'Day 4 — Acid House & Ibiza',
      globeEventIds: [
        'evt-acid-house-london-1986',
        'evt-electronic-ibiza-1988',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Acid house — the 303 squelches its way to euphoria.',
          'Acid house — el 303 chirría hacia la euforia.',
        ],
        ['Program a 303-style acid line.', 'Programa una línea acid.'],
        ['Draft a 4-bar acid pattern.', 'Escribe un patrón acid.'],
        ['Peer swap.', 'Intercambio.'],
        [
          'What did the machine give the human dancer?',
          '¿Qué le dio la máquina al bailarín?',
        ],
      ),
    },
    {
      slug: 'edm-day-5',
      label: 'Day 5 — Daft Punk',
      songId: 'get_lucky',
      globeEventIds: ['evt-edm-amsterdam-2005'],
      phaseSeeds: phaseSeeds(
        [
          'Daft Punk — French house samples disco to reboot pop.',
          'Daft Punk — el house francés samplea disco para reiniciar el pop.',
        ],
        [
          'Study "Get Lucky" chord loop.',
          'Estudia el loop de acordes de "Get Lucky".',
        ],
        [
          'Write a disco-house 4-bar loop.',
          'Escribe un loop disco-house de 4 compases.',
        ],
        ['Class playback.', 'Reproducción.'],
        ['What did nostalgia buy them?', '¿Qué les compró la nostalgia?'],
      ),
    },
    {
      slug: 'edm-day-6',
      label: 'Day 6 — Drum & Bass, Jungle',
      globeEventIds: ['evt-electronic-ibiza-1988'],
      phaseSeeds: phaseSeeds(
        [
          'UK Jungle & DnB — breakbeat culture speeds up.',
          'Jungle & DnB — la cultura breakbeat acelera.',
        ],
        ['Chop a break to 170 BPM.', 'Corta un break a 170 BPM.'],
        ['Draft a jungle pattern.', 'Escribe un patrón jungle.'],
        ['Peer share.', 'Comparte.'],
        [
          'What did fast tempo let the crowd say?',
          '¿Qué dejó decir el tempo rápido?',
        ],
      ),
    },
    {
      slug: 'edm-day-7',
      label: 'Day 7 — Modern EDM & Big Room',
      globeEventIds: ['evt-edm-amsterdam-2005', 'evt-edm-miami-2006'],
      phaseSeeds: phaseSeeds(
        [
          'EDM festival culture — from Amsterdam to Miami.',
          'La cultura EDM festivalera — de Amsterdam a Miami.',
        ],
        [
          'Study the drop-oriented structure.',
          'Estudia la estructura orientada al drop.',
        ],
        ['Draft a build + drop.', 'Boceta un build + drop.'],
        ['Peer share.', 'Comparte.'],
        [
          'What did the drop teach a whole generation?',
          '¿Qué le enseñó el drop a una generación?',
        ],
      ),
    },
    {
      slug: 'edm-day-8',
      label: 'Day 8 — Electronic Studio Showcase',
      globeEventIds: [
        'evt-house-chicago-1984',
        'evt-electronic-dusseldorf-1979',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Class-selected electronic track.',
          'Pista electrónica elegida por la clase.',
        ],
        [
          'Studio time — an electronic track drawing on 2+ subgenres.',
          'Estudio — pista electrónica que toma de 2+ subgéneros.',
        ],
        [
          'Add a sample of a real-world sound.',
          'Añade una muestra del mundo real.',
        ],
        ['Class showcase.', 'Muestra.'],
        [
          'What did electricity teach music to want?',
          '¿Qué le enseñó la electricidad a la música a querer?',
        ],
      ),
    },
    {
      slug: 'edm-day-9',
      label: 'Day 9 — Dance-Pop Convergence',
      songId: 'wake_me_up',
      globeEventIds: ['evt-edm-miami-2006'],
      phaseSeeds: phaseSeeds(
        [
          'Avicii, Calvin Harris — EDM absorbs top-40 pop.',
          'Avicii, Calvin Harris — el EDM absorbe el top-40.',
        ],
        [
          'A/B the folk-into-EDM shift in "Wake Me Up".',
          'Compara A/B el giro folk-a-EDM en "Wake Me Up".',
        ],
        ['Draft a folk-EDM hybrid hook.', 'Escribe un hook híbrido folk-EDM.'],
        ['Class playback.', 'Reproducción.'],
        [
          'What did pop want from EDM in that era?',
          '¿Qué quería el pop del EDM en esa era?',
        ],
      ),
    },
    {
      slug: 'edm-day-10',
      label: 'Day 10 — Ambient, IDM & the Quiet Machines',
      globeEventIds: [
        'evt-dubstep-burial-london-2007',
        'evt-minimal-techno-bucharest-2007',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Burial, Aphex Twin — the machines learn to whisper.',
          'Burial, Aphex Twin — las máquinas aprenden a susurrar.',
        ],
        [
          'Study a texture-first electronic composition.',
          'Estudia una composición electrónica basada en textura.',
        ],
        [
          'Compose a 60-second ambient study.',
          'Compón un estudio ambient de 60 segundos.',
        ],
        ['Class listen with eyes closed.', 'Escucha con los ojos cerrados.'],
        [
          'What did the quiet let the machines say?',
          '¿Qué le dejó decir el silencio a las máquinas?',
        ],
      ),
    },
  ],
};

// ============================================================================
// SPRING — LOCATION UNITS (Feb – Mar)
// ============================================================================

const FEB_DETROIT: UnitTemplate = {
  slug: 'feb-detroit-motown',
  label: 'Detroit — Motown to Techno',
  monthIndex: 2,
  themeId: 'theme-detroit-motown',
  kind: 'location',
  focusLocation: 'Detroit, MI',
  focusEra: '1959 – today',
  dayStubs: [
    {
      slug: 'det-day-1',
      label: 'Day 1 — Hitsville U.S.A.',
      globeEventIds: ['evt-motown-detroit-1963'],
      phaseSeeds: phaseSeeds(
        [
          'Berry Gordy opens Hitsville — the assembly-line hit.',
          'Berry Gordy abre Hitsville — la fábrica del hit.',
        ],
        [
          'Study the Funk Brothers rhythm section.',
          'Estudia la sección de ritmo Funk Brothers.',
        ],
        [
          'Draft a two-bar Motown groove.',
          'Escribe un groove Motown de dos compases.',
        ],
        ['Play together.', 'Toquen juntos.'],
        [
          'What did the assembly line change?',
          '¿Qué cambió la línea de ensamble?',
        ],
      ),
    },
    {
      slug: 'det-day-2',
      label: 'Day 2 — Smokey Robinson',
      globeEventIds: ['evt-motown-detroit-1963'],
      phaseSeeds: phaseSeeds(
        [
          'Smokey — songwriter, singer, poet of Motown.',
          'Smokey — compositor, cantante, poeta de Motown.',
        ],
        [
          'Study his metaphor-per-line writing.',
          'Estudia su escritura metáfora-por-línea.',
        ],
        [
          'Write two lines of a Smokey-style tender lyric.',
          'Escribe dos líneas tiernas al estilo Smokey.',
        ],
        ['Read aloud.', 'Lee.'],
        ['What did tenderness accomplish?', '¿Qué logró la ternura?'],
      ),
    },
    {
      slug: 'det-day-3',
      label: 'Day 3 — The Supremes',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'The Supremes — three voices, twelve #1 hits.',
          'The Supremes — tres voces, doce #1.',
        ],
        [
          'Study their three-part harmony.',
          'Estudia su armonía a tres partes.',
        ],
        [
          'Sing a Supremes phrase together.',
          'Canten una frase de las Supremes.',
        ],
        ['Perform.', 'Interpreten.'],
        [
          'What did glamour buy the movement?',
          '¿Qué compró el glamour al movimiento?',
        ],
      ),
    },
    {
      slug: 'det-day-4',
      label: 'Day 4 — Marvin Gaye — the Political Album',
      songId: 'whats_going_on',
      globeEventIds: ['evt-marvin-gaye-detroit-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Marvin turns the Motown machine political.',
          'Marvin vuelve política la máquina Motown.',
        ],
        [
          "Study the album's cross-fades.",
          'Estudia los cross-fades del álbum.',
        ],
        [
          'Write a two-line protest ballad.',
          'Escribe una balada de protesta de dos líneas.',
        ],
        ['Read.', 'Lee.'],
        ['What did Marvin risk?', '¿Qué arriesgó Marvin?'],
      ),
    },
    {
      slug: 'det-day-5',
      label: 'Day 5 — Stevie Wonder',
      songId: 'superstition',
      globeEventIds: ['evt-funk-detroit-1972-stevie-wonder-superstition'],
      phaseSeeds: phaseSeeds(
        [
          'Stevie — the child prodigy becomes the auteur.',
          'Stevie — el prodigio se vuelve auteur.',
        ],
        [
          'Study the "Superstition" clavinet part.',
          'Estudia el clavinet de "Superstition".',
        ],
        ['Program a clavinet-style hook.', 'Programa un hook estilo clavinet.'],
        ['Class playback.', 'Reproducción.'],
        [
          'What did Stevie prove about a "single voice"?',
          '¿Qué demostró Stevie sobre una "voz única"?',
        ],
      ),
    },
    {
      slug: 'det-day-6',
      label: 'Day 6 — The Jackson 5 Arrive',
      songId: 'ill_be_there',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'The Jackson 5 — Gary, Indiana to Hitsville.',
          'The Jackson 5 — Gary, Indiana a Hitsville.',
        ],
        [
          "Study young Michael's phrasing.",
          'Estudia el fraseo del joven Michael.',
        ],
        [
          'Write a two-line "young voice" hook.',
          'Escribe un hook de "voz joven".',
        ],
        ['Perform.', 'Interpreten.'],
        ['What did Motown make of the kid?', '¿Qué hizo Motown con el chico?'],
      ),
    },
    {
      slug: 'det-day-7',
      label: 'Day 7 — Motown Leaves Detroit',
      globeEventIds: ['evt-motown-detroit-1966'],
      phaseSeeds: phaseSeeds(
        [
          'Motown moves to LA in 1972 — what stayed?',
          'Motown se muda a LA en 1972 — ¿qué quedó?',
        ],
        [
          'Study post-Motown Detroit rock (MC5, Iggy).',
          'Estudia el post-Motown Detroit rock (MC5, Iggy).',
        ],
        ['Write a two-line rebellion hook.', 'Escribe un hook de rebelión.'],
        ['Perform loud.', 'Interpreten fuerte.'],
        ['What did the vacancy invite?', '¿Qué invitó el vacío?'],
      ),
    },
    {
      slug: 'det-day-8',
      label: 'Day 8 — Detroit Techno — the Belleville Three',
      globeEventIds: ['evt-house-chicago-1984'],
      phaseSeeds: phaseSeeds(
        [
          'Juan Atkins, Derrick May, Kevin Saunderson.',
          'Juan Atkins, Derrick May, Kevin Saunderson.',
        ],
        [
          'Program a Detroit techno beat.',
          'Programa un beat techno de Detroit.',
        ],
        ['Add machine funk.', 'Añade machine funk.'],
        ['Play.', 'Toca.'],
        [
          "What did Detroit hear in machines that Chicago didn't?",
          '¿Qué escuchó Detroit en las máquinas que Chicago no?',
        ],
      ),
    },
    {
      slug: 'det-day-9',
      label: 'Day 9 — Eminem & Detroit Hip-Hop',
      globeEventIds: ['evt-hiphop-detroit-2000-eminem'],
      phaseSeeds: phaseSeeds(
        [
          'Eminem — 8 Mile and the reset of pop-rap.',
          'Eminem — 8 Mile y el reinicio del pop-rap.',
        ],
        [
          'Study his internal rhyme density.',
          'Estudia la densidad de rimas internas.',
        ],
        ['Write a 4-line dense rhyme.', 'Escribe 4 líneas densas.'],
        ['Read fast.', 'Lee rápido.'],
        [
          'What did skill do for a Detroit story?',
          '¿Qué hizo la habilidad por una historia de Detroit?',
        ],
      ),
    },
    {
      slug: 'det-day-10',
      label: 'Day 10 — J Dilla',
      globeEventIds: ['evt-hiphop-detroit-2000-eminem'],
      phaseSeeds: phaseSeeds(
        [
          'J Dilla — the drunk drums that changed hip-hop.',
          'J Dilla — los tambores "borrachos" que cambiaron el hip-hop.',
        ],
        ['Study the off-grid feel.', 'Estudia el feel fuera de la cuadrícula.'],
        [
          'Program a Dilla-inspired beat.',
          'Programa un beat inspirado en Dilla.',
        ],
        ['Class playback.', 'Reproducción.'],
        [
          'What did leaving the grid teach us?',
          '¿Qué nos enseñó salir de la cuadrícula?',
        ],
      ),
    },
  ],
};

const MAR_KINGSTON: UnitTemplate = {
  slug: 'mar-kingston',
  label: 'Kingston — Reggae & Global Rhythm',
  monthIndex: 3,
  themeId: 'theme-kingston',
  kind: 'location',
  focusLocation: 'Kingston, Jamaica',
  focusEra: '1962 – today',
  dayStubs: [
    {
      slug: 'king-day-1',
      label: 'Day 1 — Ska & Independence',
      globeEventIds: ['evt-reggae-kingston-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Jamaican independence 1962 — ska celebrates.',
          'La independencia jamaicana 1962 — la ska celebra.',
        ],
        ['Study the ska horn stab.', 'Estudia el stab de metales ska.'],
        ['Draft a ska horn line.', 'Escribe una línea de metales ska.'],
        ['Play in ensemble.', 'Interpreten en ensamble.'],
        [
          'What did independence let people hear?',
          '¿Qué dejó escuchar la independencia?',
        ],
      ),
    },
    {
      slug: 'king-day-2',
      label: 'Day 2 — Rocksteady Slows It Down',
      globeEventIds: ['evt-reggae-kingston-1971'],
      phaseSeeds: phaseSeeds(
        [
          'Rocksteady — ska cools into a groove.',
          'Rocksteady — la ska se enfría en un groove.',
        ],
        [
          'Feel the walking bass at a slower tempo.',
          'Siente el bajo caminante a tempo lento.',
        ],
        [
          'Write a two-bar rocksteady bass line.',
          'Escribe una línea de bajo rocksteady.',
        ],
        ['Play together.', 'Toquen.'],
        ['What did slowing down invite?', '¿Qué invitó la desaceleración?'],
      ),
    },
    {
      slug: 'king-day-3',
      label: 'Day 3 — Bob Marley — Global Superstar',
      songId: 'three_little_birds',
      globeEventIds: ['evt-reggae-kingston-1978-marley'],
      phaseSeeds: phaseSeeds(
        [
          'Marley — the world discovers Rastafari.',
          'Marley — el mundo descubre el rastafari.',
        ],
        ['Study the one-drop drum pattern.', 'Estudia el patrón one-drop.'],
        ['Draft a message hook.', 'Escribe un hook con mensaje.'],
        ['Sing together.', 'Canten juntos.'],
        [
          'What did Marley translate for the world?',
          '¿Qué tradujo Marley para el mundo?',
        ],
      ),
    },
    {
      slug: 'king-day-4',
      label: 'Day 4 — Jimmy Cliff & "The Harder They Come"',
      globeEventIds: ['evt-reggae-kingston-1972-cliff'],
      phaseSeeds: phaseSeeds(
        [
          "Jimmy Cliff — reggae's first global film.",
          'Jimmy Cliff — la primera película global del reggae.',
        ],
        [
          'Study "Many Rivers to Cross" chord movement.',
          'Estudia el movimiento armónico de "Many Rivers to Cross".',
        ],
        [
          'Write a two-line resilience verse.',
          'Escribe un verso de resiliencia de dos líneas.',
        ],
        ['Read.', 'Lee.'],
        [
          'What did the film sell that the album could not?',
          '¿Qué vendió la película que el disco no?',
        ],
      ),
    },
    {
      slug: 'king-day-5',
      label: 'Day 5 — Peter Tosh — the Militant Prophet',
      globeEventIds: ['evt-reggae-kingston-1977-tosh'],
      phaseSeeds: phaseSeeds(
        [
          'Tosh — sharper edge, deeper faith.',
          'Tosh — filo más agudo, fe más profunda.',
        ],
        [
          'Study his snare-heavy groove.',
          'Estudia su groove de tarola pesada.',
        ],
        ['Write a two-line demand.', 'Escribe una demanda de dos líneas.'],
        ['Read out loud.', 'Lee en voz alta.'],
        [
          "What did Tosh demand of Bob's message?",
          '¿Qué le exigió Tosh al mensaje de Bob?',
        ],
      ),
    },
    {
      slug: 'king-day-6',
      label: 'Day 6 — Dub — King Tubby & Lee Perry',
      globeEventIds: [
        'evt-dub-kingston-1972-tubby',
        'evt-dub-kingston-1976-pablo',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Dub — the studio is now the artist.',
          'Dub — el estudio es ahora el artista.',
        ],
        [
          'Study a delay-drenched dub track.',
          'Estudia un dub bañado en delay.',
        ],
        [
          'Remix a class track through dub effects.',
          'Remix a un track con efectos dub.',
        ],
        ['Playback.', 'Reproducción.'],
        ['What is subtraction?', '¿Qué es sustraer?'],
      ),
    },
    {
      slug: 'king-day-7',
      label: 'Day 7 — Sound System Culture',
      globeEventIds: ['evt-dancehall-kingston-1975'],
      phaseSeeds: phaseSeeds(
        [
          'Sound system culture — the DJ becomes a star.',
          'La cultura de sound system — el DJ se vuelve estrella.',
        ],
        ['Study a toaster / MC pattern.', 'Estudia un patrón toaster / MC.'],
        ['Write a two-line MC bar.', 'Escribe un bar MC de dos líneas.'],
        ['Perform.', 'Interpreten.'],
        [
          'How did sound systems seed hip-hop in NYC?',
          '¿Cómo los sound systems sembraron el hip-hop en NYC?',
        ],
      ),
    },
    {
      slug: 'king-day-8',
      label: 'Day 8 — Yellowman & Early Dancehall',
      globeEventIds: ['evt-dancehall-kingston-1982-yellowman'],
      phaseSeeds: phaseSeeds(
        [
          "Yellowman — dancehall's first superstar.",
          'Yellowman — la primera superestrella del dancehall.',
        ],
        ['Study his chatting cadence.', 'Estudia su cadencia "chatting".'],
        ['Write a two-line rider hook.', 'Escribe un hook rider.'],
        ['Perform.', 'Interpreta.'],
        [
          'What did chatting invent that hip-hop then borrowed?',
          '¿Qué inventó el chatting que el hip-hop tomó prestado?',
        ],
      ),
    },
    {
      slug: 'king-day-9',
      label: 'Day 9 — Shabba Ranks & Beenie Man',
      globeEventIds: [
        'evt-dancehall-kingston-1991-shabba',
        'evt-dancehall-kingston-2000-beenie',
      ],
      phaseSeeds: phaseSeeds(
        [
          'Digital dancehall goes worldwide.',
          'El dancehall digital se globaliza.',
        ],
        ['Program a digital riddim.', 'Programa un riddim digital.'],
        ['Draft a two-line hook.', 'Escribe un hook.'],
        ['Class playback.', 'Reproducción.'],
        [
          'What did digital give the dance?',
          '¿Qué le dio lo digital al baile?',
        ],
      ),
    },
    {
      slug: 'king-day-10',
      label: 'Day 10 — Sean Paul — Crossover Era',
      globeEventIds: ['evt-dancehall-kingston-2002-sean-paul'],
      phaseSeeds: phaseSeeds(
        [
          "Sean Paul — dancehall in pop's DNA.",
          'Sean Paul — dancehall en el ADN del pop.',
        ],
        [
          'Study his cross-genre features.',
          'Estudia sus colaboraciones cruzadas.',
        ],
        ['Write a two-line crossover hook.', 'Escribe un hook de cruce.'],
        ['Peer share.', 'Comparte.'],
        ['What travels? What stays home?', '¿Qué viaja? ¿Qué se queda?'],
      ),
    },
  ],
};

// ============================================================================
// FINAL ASSEMBLY
// ============================================================================

export const CANONICAL_ANNUAL_TEMPLATE: AnnualPlanTemplate = {
  id: 'canonical-year-v1',
  label: 'Music Atlas — Canonical Year',
  autumn: {
    semester: 'autumn',
    label: 'Autumn Semester',
    units: [
      // Heritage
      AUG_WELCOME,
      SEP_HHM,
      OCT_INDIGENOUS_DDLM,
      NOV_COMPASSION,
      DEC_REFLECTION,
      // Genre
      SEP_LATIN,
      OCT_BLUES,
      NOV_JAZZ,
      DEC_GOSPEL,
      // Location
      OCT_NEW_ORLEANS,
      NOV_MEMPHIS,
    ],
  },
  spring: {
    semester: 'spring',
    label: 'Spring Semester',
    units: [
      // Heritage
      JAN_IDENTITY,
      FEB_BLACK_HISTORY,
      MAR_WOMENS_HISTORY,
      APR_PROTEST,
      MAY_MOTHERS_DAY,
      // Genre
      JAN_HIPHOP,
      FEB_RNB_SOUL,
      MAR_ROCK,
      APR_REGGAE_AFROBEAT,
      MAY_COUNTRY,
      MAY_ELECTRONIC,
      // Location
      FEB_DETROIT,
      MAR_KINGSTON,
    ],
  },
};
