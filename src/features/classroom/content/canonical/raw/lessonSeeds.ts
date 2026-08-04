/* eslint-disable */
/**
 * Music Atlas Teacher — Canonical Lesson Seed Bank (v1.2)
 *
 * Themed, time-anchored lessons. Two kinds coexist:
 *   - kind: 'day'      → a full five-phase template Day (from the expanded seed bank)
 *   - kind: 'activity' → a single anchor activity (from the monthly lesson outline)
 *
 * Sourced from Music Bridge IMPACT lesson materials under MOU. "Music Bridge"
 * appears in engineering docs only — never in user-facing copy or identifiers.
 *
 * Schema: see SPEC_v1.2_ThemeBank.md §2.
 *
 * Authoring notes:
 *   - LocalizedText fields ({ en, es? }) are the board-eligible (student-facing) surface:
 *     title, and each phase's presentation.title / presentation.prompt.
 *     ES is left empty for now (falls back to EN); batch ES translation is a later pass.
 *   - Per-phase CLO text is the derivation source for canonical learning CLOs
 *     (deriveCanonicalCLOs walks this file). The student-voice "I can…" objectives
 *     from the source become CLO Bank entries; statement-voice ideas live on Themes.
 *   - Atlas module references use the four-module model: globe | learn | studio | arcade.
 *     References are AMBITIOUS — they describe where this could live in Atlas.
 *   - localContext holds Denver tie-ins: teacher-facing only, tenant-clearable (SPEC §6).
 *   - 'day' seeds carry presentation (student-facing) + activitySuggestions + atlasResources
 *     + cloText (per phase) + songs. 'activity' seeds carry a full anchor Activity.
 *
 * Counts: 20 'day' seeds + 16 'activity' seeds = 36 canonical seeds.
 */

const CREATED_AT = '2026-05-21';
const lt = (en: string, es?: string) => (es ? { en, es } : { en });

/* ============================================================
   PART 1 — kind: 'day'  (five-phase template lessons)
   from expanded_monthly_lesson_seed_bank.md
   ============================================================ */

const daySeeds = [

  {
    id: 'seed-vision-dream-cypher',
    kind: 'day',
    title: lt('Vision / Dream Cypher'),
    themeId: 'theme-january',
    monthHint: 1,
    tags: ['MLK', 'Spoken Word', 'Cadence', 'Vision', 'Hip Hop'],
    standards: ['Creating', 'Performing', 'Connecting', 'Responding'],
    description:
      'Students connect New Year reflection with MLK\u2019s language of dreams, vision, and collective possibility. The lesson connects preacher cadence, rap cadence, and student voice.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('One word for today'),
          prompt: lt('Energy check-in: one word for how you\u2019re entering today. Then listen to MLK\u2019s \u201CMountaintop\u201D \u2014 notice the cadence: repetition, pacing, intensity, pause, rise, and release.'),
        },
        activitySuggestions: ['community-check-in', 'listen-for-the-story'],
        atlasResources: [
          { module: 'globe', label: 'Globe: MLK & the language of dreams', contextNote: 'Speech excerpt + civil-rights-era context.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can identify music and spoken word that inspires hope, resilience, and change.',
          awarenessOfContext: 'I can connect contemporary hip hop and R&B to traditions of civil rights speech and community leadership.',
        },
        rationaleHints: { standards: ['Connecting', 'Responding'] },
      },
      groupPractice: {
        presentation: {
          title: lt('From speech to cadence'),
          prompt: lt('Clap or tap the rhythm of a spoken phrase. Turn it into a rap cadence. Practice call-and-response with a repeated hook: \u201CI have a vision\u2026\u201D / \u201CI\u2019m working toward\u2026\u201D'),
        },
        activitySuggestions: ['chords-in-rhythm', 'improvisation-conversation'],
        atlasResources: [
          { module: 'studio', label: 'Studio: speech-cadence beat', contextNote: 'Loop a slow beat to speak cadence over.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use cadence, repetition, rhythm, and dynamics to strengthen a spoken or musical message.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('I see myself\u2026'),
          prompt: lt('Choose one: write 8 bars beginning \u201CI see myself\u2026\u201D \u00B7 a spoken-word verse about change \u00B7 a beat under a speech-style cadence \u00B7 cover art for your future self.'),
        },
        activitySuggestions: ['theme-writing', 'composing', 'producing'],
        atlasResources: [
          { module: 'studio', label: 'Studio: write your verse or beat', contextNote: 'Lyric + beat sketch space.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can use music to express my vision for myself and my community.',
        },
      },
      presentPerform: {
        presentation: {
          title: lt('Share one line'),
          prompt: lt('Share one line, one verse, one beat, or one visual element with the class.'),
        },
        activitySuggestions: ['individual-performance', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('One change'),
          prompt: lt('Reflect: \u201CWhat is one change I can actually work toward?\u201D Then save your work and reset the room.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {},
      },
    },
    songs: [
      'MLK \u2014 \u201CMountaintop\u201D speech', '2Pac \u2014 \u201CChanges\u201D', '2Pac \u2014 \u201CKeep Ya Head Up\u201D',
      'Andra Day \u2014 \u201CRise Up\u201D', 'Common & John Legend \u2014 \u201CGlory\u201D', 'Bill Withers \u2014 \u201CLean on Me\u201D',
      'Harold Melvin & The Blue Notes \u2014 \u201CWake Up Everybody\u201D', 'Anderson .Paak \u2014 \u201CLockdown\u201D',
    ],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-blues-as-lived-experience',
    kind: 'day',
    title: lt('Blues as Lived Experience'),
    themeId: 'theme-january',
    monthHint: 1,
    tags: ['Blues', '12-Bar Blues', 'AAB Form', 'Improvisation', 'Lineage'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students learn the blues as a structure for expressing lived experience, struggle, humor, resilience, and truth \u2014 AAB lyric form, 12-bar blues, I\u2013IV\u2013V harmony, blues scale, improvisation, and call-and-response.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What life do you hear?'),
          prompt: lt('Listen to a blues excerpt. What kind of life experience do you hear in this music? Join a body-percussion or vocal call-and-response.'),
        },
        activitySuggestions: ['listen-for-the-feels', 'listen-for-empathy'],
        atlasResources: [
          { module: 'globe', label: 'Globe: the blues and its roots', contextNote: 'Where the blues comes from and where it went.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can use music to express lived experience and emotional truth.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('12-bar blues'),
          prompt: lt('Learn the 12-bar blues structure. Practice I\u2013IV\u2013V chords. Improvise using the blues scale. Write an AAB lyric together.'),
        },
        activitySuggestions: ['create-a-chord-progression', 'stylistic-technique', 'improvisation-beginner'],
        atlasResources: [
          { module: 'learn', label: 'Learn: 12-bar blues & the blues scale', contextNote: 'Iconic notation for the form, chords, and scale.' },
          { module: 'studio', label: 'Studio: 12-bar blues play-along', contextNote: 'Loop the changes to solo and comp over.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can recognize and use AAB form, I\u2013IV\u2013V harmony, call-and-response, and the blues scale.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Your AAB verse'),
          prompt: lt('Choose one: an AAB verse about something real in your life \u00B7 a blues-inspired hip hop hook \u00B7 a melody over a 12-bar blues loop \u00B7 a modern beat using blues-scale melodies.'),
        },
        activitySuggestions: ['theme-writing', 'mini-compositions', 'improvisation-intermediate'],
        atlasResources: [
          { module: 'studio', label: 'Studio: blues composition space', contextNote: 'Build over the 12-bar loop.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Class blues cypher'),
          prompt: lt('Perform one AAB lyric, melody, or improvised phrase in the class blues cypher.'),
        },
        activitySuggestions: ['perform-as-ensemble', 'individual-performance'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Honest, not hopeless'),
          prompt: lt('Reflect: \u201CHow can music make struggle sound honest without making it hopeless?\u201D Save your work and reset.'),
        },
        activitySuggestions: ['peer-and-teacher-feedback', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect blues traditions to later forms of soul, R&B, rock, and hip hop.',
        },
      },
    },
    songs: [],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-great-migration-sound-map',
    kind: 'day',
    title: lt('The Great Migration Sound Map'),
    themeId: 'theme-february',
    monthHint: 2,
    tags: ['Black History', 'Migration', 'Lineage', 'Groove', 'Geography'],
    standards: ['Creating', 'Performing', 'Connecting', 'Responding'],
    description:
      'Students trace how Black musical styles moved across the United States through the Great Migration \u2014 blues, jazz, gospel, soul, funk, and hip hop \u2014 exploring how movement changes music and how music preserves memory.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What changes when people move?'),
          prompt: lt('Look at a migration map. Listen to contrasting examples from the South, Chicago, New York, Detroit, and Denver. What changes when people move?'),
        },
        activitySuggestions: ['listening-emotion-setting', 'historical-connections'],
        atlasResources: [
          { module: 'globe', label: 'Globe: the Great Migration sound map', contextNote: 'Trace styles across cities on the map.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can hear how music carries memory, movement, and identity.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Build a rhythm map'),
          prompt: lt('Each group creates a groove for one city or region. Layer the grooves to show cultural movement. Practice call-and-response between \u201Chome\u201D and \u201Cnew city.\u201D'),
        },
        activitySuggestions: ['stylistic-loops', 'group-practicing', 'collaborate-in-small-groups'],
        atlasResources: [
          { module: 'studio', label: 'Studio: layered city grooves', contextNote: 'One track per region, layered.' },
          { module: 'learn', label: 'Learn: grooves across styles', contextNote: 'Compare blues, jazz, gospel, soul, funk feels.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can compare grooves, instrumentation, rhythm, and form across styles.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Your sound map'),
          prompt: lt('Choose one: a musical map of your own family or community history \u00B7 lyrics about where you come from and where you\u2019re going \u00B7 a beat that blends two regional styles \u00B7 a visual map of a musical lineage.'),
        },
        activitySuggestions: ['composing', 'theme-writing', 'sampling-project'],
        atlasResources: [
          { module: 'studio', label: 'Studio: blend two regional styles', contextNote: 'Production space for the regional beat.' },
          { module: 'globe', label: 'Globe: map a musical lineage', contextNote: 'Build the visual lineage map.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Present your map'),
          prompt: lt('Present your sound map, beat, verse, or visual to the class.'),
        },
        activitySuggestions: ['research-presentation', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('What does music carry?'),
          prompt: lt('Reflect: \u201CWhat does music help people carry with them?\u201D Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect musical development to migration, community, and Black cultural history.',
        },
      },
    },
    songs: ['Duke Ellington \u2014 \u201CDuke\u2019s Place\u201D', 'Miles Davis \u2014 \u201CAll Blues\u201D', 'Harlem Renaissance jazz and blues recordings'],
    localContext: lt('Denver\u2019s Five Points jazz history \u2014 a Great Migration destination and once \u201Cthe Harlem of the West.\u201D'),
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-harlem-renaissance-artist-lounge',
    kind: 'day',
    title: lt('Harlem Renaissance Artist Lounge'),
    themeId: 'theme-february',
    monthHint: 2,
    tags: ['Black History', 'Harlem Renaissance', 'Jazz', 'Spoken Word', 'Interdisciplinary'],
    standards: ['Creating', 'Performing', 'Presenting', 'Connecting'],
    description:
      'Students enter the Harlem Renaissance as a creative world where poetry, jazz, dance, visual art, and nightlife shaped Black modern identity, then create their own \u201Cartist lounge.\u201D',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What energy does this scene have?'),
          prompt: lt('Listen to a Harlem Renaissance-era jazz or blues recording. View images of the artists, venues, and fashion. What kind of energy does this scene have?'),
        },
        activitySuggestions: ['listening-stylistic-elements', 'cultural-connections'],
        atlasResources: [
          { module: 'globe', label: 'Globe: the Harlem Renaissance', contextNote: 'Artists, venues, publications, fashion of the era.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can describe the confidence, elegance, struggle, and creativity expressed in Harlem Renaissance art.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Swing & spoken word'),
          prompt: lt('Learn a swing rhythm or blues riff. Practice spoken-word delivery over a jazz loop. Explore call-and-response between voice and instrument.'),
        },
        activitySuggestions: ['stylistic-technique', 'improvisation-conversation'],
        atlasResources: [
          { module: 'studio', label: 'Studio: jazz loop for spoken word', contextNote: 'Loop a swing groove to deliver over.' },
          { module: 'learn', label: 'Learn: swing feel & blues riffs', contextNote: 'Iconic notation for the rhythm and riff.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use rhythm, phrasing, and expressive delivery in a jazz-inspired context.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Your Harlem club'),
          prompt: lt('Choose one: a short poem or verse for an imaginary Harlem club \u00B7 a flyer for a Harlem Renaissance performance \u00B7 a jazz-inspired loop \u00B7 a spoken-word piece with accompaniment.'),
        },
        activitySuggestions: ['theme-writing', 'composing', 'inspired-by-art'],
        atlasResources: [
          { module: 'studio', label: 'Studio: jazz-inspired loop', contextNote: 'Build the lounge soundtrack.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('The lounge opens'),
          prompt: lt('Perform your piece in the class \u201Cartist lounge.\u201D'),
        },
        activitySuggestions: ['perform-for-audience', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Reflect & reset'),
          prompt: lt('Reflect on how the Harlem Renaissance shaped American culture. Save your work and reset the room.'),
        },
        activitySuggestions: ['peer-and-teacher-feedback', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can explain how the Harlem Renaissance shaped American music, literature, and culture.',
        },
      },
    },
    songs: ['Harlem Renaissance-era jazz and blues recordings', 'Duke Ellington selections'],
    localContext: lt('Denver\u2019s Five Points \u2014 the historic jazz district where Ellington, Holiday, and Armstrong performed.'),
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-women-who-changed-the-sound',
    kind: 'day',
    title: lt('Women Who Changed the Sound'),
    themeId: 'theme-march',
    monthHint: 3,
    tags: ['Women\u2019s History', 'Vocal Expression', 'Improvisation', 'Representation'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students explore women artists whose voices and innovations shaped music history \u2014 analyzing vocal expression, improvisation, identity, and courage.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What stands out?'),
          prompt: lt('Listen to one featured artist. What stands out about the sound, emotion, and control? Mood map: tone, texture, color, energy.'),
        },
        activitySuggestions: ['listen-for-the-feels', 'listening-stylistic-elements'],
        atlasResources: [
          { module: 'globe', label: 'Globe: women who shaped music history', contextNote: 'Featured artists and their innovations.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can recognize emotional strength and vulnerability in vocal performance.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Phrasing & technique'),
          prompt: lt('Practice call-and-response phrasing inspired by the artist. Learn a short melodic fragment. Identify one technical feature: vibrato, phrasing, range, articulation, improvisation, or storytelling.'),
        },
        activitySuggestions: ['stylistic-technique', 'improvisation-conversation'],
        atlasResources: [
          { module: 'learn', label: 'Learn: phrasing & vocal technique', contextNote: 'Notation/reference for the technical feature.' },
          { module: 'studio', label: 'Studio: practice the phrase', contextNote: 'Loop a backing track to phrase over.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can identify and imitate selected vocal, rhythmic, or melodic techniques.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Tribute'),
          prompt: lt('Choose one: a tribute verse to an influential woman \u00B7 a beat or loop inspired by the artist\u2019s mood \u00B7 a concert flyer celebrating women in music \u00B7 a melodic phrase reinterpreted in a modern style.'),
        },
        activitySuggestions: ['theme-writing', 'producing', 'inspired-by-art'],
        atlasResources: [
          { module: 'studio', label: 'Studio: mood-inspired loop', contextNote: 'Build the tribute beat.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share your tribute'),
          prompt: lt('Share your verse, loop, flyer, or reinterpretation with the class.'),
        },
        activitySuggestions: ['listening-session', 'individual-performance'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Why representation matters'),
          prompt: lt('Reflect on how women artists shaped musical history and challenged exclusion. Save and reset.'),
        },
        activitySuggestions: ['peer-and-teacher-feedback', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can explain how women artists shaped musical history and challenged exclusion.',
        },
      },
    },
    songs: ['Billie Holiday', 'Ella Fitzgerald', 'Sarah Vaughan', 'Esperanza Spalding', 'Yma Sumac'],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-strange-fruit-power-of-witness',
    kind: 'day',
    title: lt('Strange Fruit and the Power of Witness'),
    themeId: 'theme-march',
    monthHint: 3,
    tags: ['Women\u2019s History', 'Witness', 'Restraint', 'Historical Injustice', 'Sensitive'],
    standards: ['Responding', 'Creating', 'Connecting'],
    description:
      'Students examine Billie Holiday\u2019s \u201CStrange Fruit\u201D as music bearing witness to injustice. Facilitate with care, clear framing, and attention to student readiness.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('Grounding before we listen'),
          prompt: lt('A grounding breath before listening. Listen for tone, silence, pacing, and emotional weight.'),
        },
        activitySuggestions: ['box-breathing', 'listen-for-the-feels'],
        atlasResources: [
          { module: 'globe', label: 'Globe: the song\u2019s historical context', contextNote: 'Age-appropriate framing of the history.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can notice how music can hold grief, truth, and moral seriousness.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('How restraint intensifies'),
          prompt: lt('Discuss how minimal musical elements intensify meaning. Identify how tempo, harmony, and vocal delivery create gravity.'),
        },
        activitySuggestions: ['listen-for-the-feels', 'emotional-connections'],
        atlasResources: [
          { module: 'learn', label: 'Learn: how restraint shapes feeling', contextNote: 'Tempo, harmony, dynamics and emotional weight.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can identify how restraint, silence, tempo, and vocal tone shape emotional impact.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Bearing witness'),
          prompt: lt('Choose one: a poem about something people need to stop ignoring \u00B7 a sparse soundscape that communicates seriousness \u00B7 a respectful reflection on art telling painful truths.'),
        },
        activitySuggestions: ['theme-writing', 'soundscape-project'],
        atlasResources: [
          { module: 'studio', label: 'Studio: sparse soundscape', contextNote: 'Restraint and space as the point.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share with care'),
          prompt: lt('Share your poem, soundscape, or reflection if you choose to.'),
        },
        activitySuggestions: ['listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Art as witness'),
          prompt: lt('Reflect on the role of artists as witnesses. Save your work and reset gently.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect a song to historical injustice and the role of artists as witnesses.',
        },
      },
    },
    songs: ['Billie Holiday \u2014 \u201CStrange Fruit\u201D'],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-second-chance-soundtrack',
    kind: 'day',
    title: lt('Second Chance Soundtrack'),
    themeId: 'theme-april',
    monthHint: 4,
    tags: ['Second Chances', 'Transformation', 'Accountability', 'Beatmaking'],
    standards: ['Creating', 'Producing', 'Responding', 'Connecting'],
    description:
      'Students explore Second Chance Month through music about growth, accountability, and future identity \u2014 moving from mistake to possibility without minimizing harm.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What makes a second chance real?'),
          prompt: lt('Listen to a song about change, growth, or survival. What makes a real second chance possible? Discuss the difference between image, apology, accountability, and transformation.'),
        },
        activitySuggestions: ['listen-for-the-story', 'community-check-in'],
        atlasResources: [
          { module: 'globe', label: 'Globe: songs of growth and second chances', contextNote: 'Artists who turned a corner.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can use music to express accountability, hope, and transformation.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Before & after'),
          prompt: lt('Build a two-section beat: \u201Cbefore\u201D and \u201Cafter.\u201D Practice changing musical mood using tempo, chords, texture, or rhythm.'),
        },
        activitySuggestions: ['musical-structures-song-form', 'emotional-connections'],
        atlasResources: [
          { module: 'studio', label: 'Studio: two-section mood beat', contextNote: 'Dark section into hopeful section.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can change musical elements to show emotional contrast.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('This time I\u2026'),
          prompt: lt('Choose one: a verse titled \u201CSecond Chance\u201D \u00B7 a beat that shifts dark to hopeful \u00B7 score a scene where a character chooses a new direction \u00B7 a hook beginning \u201CThis time I\u2026\u201D'),
        },
        activitySuggestions: ['theme-writing', 'film-scoring-project', 'create-a-hook'],
        atlasResources: [
          { module: 'studio', label: 'Studio: write your verse or score', contextNote: 'Lyric + production space.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share the turn'),
          prompt: lt('Share the moment in your piece where things change.'),
        },
        activitySuggestions: ['listening-session', 'individual-performance'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Growth & justice'),
          prompt: lt('Reflect on music, personal growth, and conversations about justice and reintegration. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect music to personal growth and broader conversations about justice and reintegration.',
        },
      },
    },
    songs: [],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-earth-day-environment-beat',
    kind: 'day',
    title: lt('Earth Day Soundscape / Environment Beat'),
    themeId: 'theme-april',
    monthHint: 4,
    tags: ['Earth Day', 'Soundscape', 'Found Sound', 'Environment', 'Sampling'],
    standards: ['Creating', 'Producing', 'Responding', 'Connecting'],
    description:
      'Students use environmental sounds, nature imagery, city sounds, and climate themes to create beats, soundscapes, or lyrics \u2014 connecting to nature, home, neighborhoods, and the built environment.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What does your environment sound like?'),
          prompt: lt('Listen to a nature or urban soundscape. What does your environment sound like? Identify sounds of nature, city, home, weather, and human activity.'),
        },
        activitySuggestions: ['passive-listening', 'listen-for-instruments'],
        atlasResources: [
          { module: 'globe', label: 'Globe: soundscapes around the world', contextNote: 'Nature vs city listening examples.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can connect sound to place, memory, comfort, danger, or belonging.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Found-sound beat'),
          prompt: lt('Make a beat using found sounds. Turn rain, wind, footsteps, traffic, or birds into rhythm. How do producers use texture to create setting?'),
        },
        activitySuggestions: ['found-sound-production', 'soundscape-project'],
        atlasResources: [
          { module: 'studio', label: 'Studio: found-sound production', contextNote: 'Import field recordings; chop and layer.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use timbre, texture, rhythm, and sampling to create a setting.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Your neighborhood in sound'),
          prompt: lt('Choose one: a soundscape of your neighborhood \u00B7 lyrics from the point of view of the earth, city, or home \u00B7 a beat using environmental samples \u00B7 a short scene about nature vs city.'),
        },
        activitySuggestions: ['soundscape-project', 'theme-writing', 'sampling-project'],
        atlasResources: [
          { module: 'studio', label: 'Studio: environment beat', contextNote: 'Build with your own recordings.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Listening session'),
          prompt: lt('Share your soundscape or beat in a class listening session.'),
        },
        activitySuggestions: ['listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Sound & place'),
          prompt: lt('Reflect on music, environment, community, and social conditions. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect music to environment, community, and social conditions.',
        },
      },
    },
    songs: [],
    localContext: lt('Field recordings from Denver parks, neighborhoods, streets, and the South Platte River corridor.'),
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-mother-caregiver-song',
    kind: 'day',
    title: lt('Mother / Caregiver Song'),
    themeId: 'theme-may',
    monthHint: 5,
    tags: ['Care', 'Family', 'Gratitude', 'Warmth', 'Intergenerational'],
    standards: ['Creating', 'Connecting', 'Responding'],
    description:
      'Students explore music about mothers, caregivers, chosen family, and intergenerational care \u2014 tender, reflective, celebratory, or complex depending on readiness.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('Someone who helped you grow'),
          prompt: lt('Listen to a song about family, care, or gratitude. Think of someone who helped you survive or grow. (Space is made for chosen family and complex family experiences.)'),
        },
        activitySuggestions: ['community-check-in', 'listen-for-empathy'],
        atlasResources: [
          { module: 'globe', label: 'Globe: songs of care across cultures', contextNote: 'How different traditions honor caregivers.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can express gratitude, complexity, love, or grief through music.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('The sound of warmth'),
          prompt: lt('Identify musical choices that create warmth: tempo, chords, melody, instrumentation, vocal tone. Build a simple warm loop or chord progression.'),
        },
        activitySuggestions: ['create-a-chord-progression', 'emotional-connections'],
        atlasResources: [
          { module: 'learn', label: 'Learn: warm chord voicings', contextNote: 'What makes a progression feel tender.' },
          { module: 'studio', label: 'Studio: warm loop', contextNote: 'Build the gentle progression.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use melody, harmony, tempo, and texture to create warmth or tenderness.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('A thank-you in sound'),
          prompt: lt('Choose one: a thank-you verse or letter-song \u00B7 a beat for someone who cared for you \u00B7 a piece from a caregiver\u2019s perspective \u00B7 a cover-art tribute.'),
        },
        activitySuggestions: ['theme-writing', 'producing', 'inspired-by-art'],
        atlasResources: [
          { module: 'studio', label: 'Studio: write your tribute', contextNote: 'Lyric + warm beat.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share if you choose'),
          prompt: lt('Share your tribute with the class or keep it private \u2014 your call.'),
        },
        activitySuggestions: ['listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Care & memory'),
          prompt: lt('Reflect on music, family, culture, and intergenerational memory. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect music to family, culture, and intergenerational memory.',
        },
      },
    },
    songs: [],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-freedom-joy-juneteenth',
    kind: 'day',
    title: lt('Freedom, Joy, and Juneteenth'),
    themeId: 'theme-june',
    monthHint: 6,
    tags: ['Juneteenth', 'Freedom', 'Black Joy', 'Groove', 'Celebration'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students explore Juneteenth as a celebration of freedom, delayed justice, resilience, and Black joy \u2014 balancing historical awareness with celebration and future vision.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('Joyful and serious at once?'),
          prompt: lt('Listen to a freedom song, soul track, or contemporary song about liberation. Can music be joyful and serious at the same time?'),
        },
        activitySuggestions: ['listen-for-the-feels', 'historical-connections'],
        atlasResources: [
          { module: 'globe', label: 'Globe: Juneteenth & freedom songs', contextNote: 'From freedom songs to contemporary liberation music.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can identify joy, pride, grief, and resilience in music.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Build a celebration groove'),
          prompt: lt('Build a celebratory groove. Practice call-and-response hooks about freedom or the future. Discuss the difference between legal freedom and lived freedom.'),
        },
        activitySuggestions: ['stylistic-loops', 'create-a-hook', 'group-practicing'],
        atlasResources: [
          { module: 'studio', label: 'Studio: celebration groove', contextNote: 'Build an upbeat, joyful loop.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use groove, repetition, and melodic hooks to create celebration.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Freedom sounds like\u2026'),
          prompt: lt('Choose one: a \u201Cfreedom sounds like\u2026\u201D verse \u00B7 a Black joy playlist slide \u00B7 a celebration beat \u00B7 a scene of liberation scored in sound.'),
        },
        activitySuggestions: ['theme-writing', 'producing', 'film-scoring-project'],
        atlasResources: [
          { module: 'studio', label: 'Studio: celebration beat', contextNote: 'Produce the joyful track.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share the joy'),
          prompt: lt('Share your verse, beat, or playlist with the class.'),
        },
        activitySuggestions: ['perform-for-audience', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Freedom, history, justice'),
          prompt: lt('Reflect on Juneteenth, freedom, history, and ongoing justice. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect Juneteenth to freedom, history, and ongoing justice.',
        },
      },
    },
    songs: ['Gil Scott-Heron', 'Kendrick Lamar', 'Common', 'Stevie Wonder'],
    localContext: lt('Denver\u2019s Juneteenth Music Festival in Five Points \u2014 one of the largest in the country.'),
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-diaspora-rhythm-lab',
    kind: 'day',
    title: lt('Diaspora Rhythm Lab'),
    themeId: 'theme-june',
    monthHint: 6,
    tags: ['Caribbean', 'Diaspora', 'Rhythm', 'Clave', 'Migration'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students explore Caribbean, Latin, African diasporic, and immigrant musical influences through rhythm, groove, and movement \u2014 centering cultural flow, migration, and identity.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What makes this rhythm move?'),
          prompt: lt('Listen to Caribbean or diasporic groove examples. What makes this rhythm move?'),
        },
        activitySuggestions: ['physicalize', 'listening-stylistic-elements'],
        atlasResources: [
          { module: 'globe', label: 'Globe: diasporic rhythm traditions', contextNote: 'Caribbean, Latin, and African diaspora grooves.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can feel how rhythm connects body, culture, and celebration.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Layered grooves'),
          prompt: lt('Learn a clave, dancehall-inspired rhythm, calypso feel, or layered percussion pattern. Compare groove feels across traditions.'),
        },
        activitySuggestions: ['stylistic-loops', 'stylistic-technique', 'collaborate-in-small-groups'],
        atlasResources: [
          { module: 'learn', label: 'Learn: clave & diasporic rhythms', contextNote: 'Iconic notation for the patterns.' },
          { module: 'studio', label: 'Studio: layer the percussion', contextNote: 'Stack the rhythm parts.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can perform or program layered rhythmic patterns.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Your rhythm map'),
          prompt: lt('Choose one: a beat using diasporic rhythm layers \u00B7 a piece about migration, belonging, or home \u00B7 a rhythm map connecting cultures.'),
        },
        activitySuggestions: ['composing', 'theme-writing', 'sampling-project'],
        atlasResources: [
          { module: 'studio', label: 'Studio: diasporic beat', contextNote: 'Build the layered rhythm track.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share the groove'),
          prompt: lt('Perform or play back your rhythm work for the class.'),
        },
        activitySuggestions: ['perform-as-ensemble', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Rhythm & migration'),
          prompt: lt('Reflect on rhythm traditions, migration, diaspora, and cultural exchange. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect rhythm traditions to migration, diaspora, and cultural exchange.',
        },
      },
    },
    songs: [],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-freedom-vs-reality',
    kind: 'day',
    title: lt('Freedom vs Reality'),
    themeId: 'theme-july',
    monthHint: 7,
    tags: ['Independence Day', 'Democracy', 'Contradiction', 'Spoken Word', 'Critique'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students explore the contradictions of Independence Day through music, speech, and lyric writing \u2014 distinguishing ideals, symbols, and lived experience.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('Promise vs reality'),
          prompt: lt('Listen to a song that critiques or complicates American identity. Hear a short excerpt from Frederick Douglass\u2019s speech. What is the difference between a promise and reality?'),
        },
        activitySuggestions: ['listen-for-the-story', 'historical-connections'],
        atlasResources: [
          { module: 'globe', label: 'Globe: freedom, critique & the Fourth', contextNote: 'Douglass\u2019s speech in context.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can express complex feelings about freedom, belonging, and contradiction.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Ideal & reality'),
          prompt: lt('Create two musical sections: \u201Cideal\u201D and \u201Creality.\u201D Compare major/minor, bright/dark, anthem/drill, celebration/tension.'),
        },
        activitySuggestions: ['emotional-connections', 'musical-structures-song-form'],
        atlasResources: [
          { module: 'studio', label: 'Studio: contrast two sections', contextNote: 'Bright ideal vs tense reality.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use musical contrast to represent different perspectives.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('My definition of freedom'),
          prompt: lt('Choose one: a verse beginning \u201CThey say freedom is\u2026\u201D \u00B7 a beat shifting between patriotic and critical moods \u00B7 score a documentary scene about contradiction \u00B7 a spoken-word piece \u201CMy Definition of Freedom.\u201D'),
        },
        activitySuggestions: ['theme-writing', 'film-scoring-project', 'producing'],
        atlasResources: [
          { module: 'studio', label: 'Studio: write your verse or score', contextNote: 'Lyric + production.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share your definition'),
          prompt: lt('Share your verse, beat, or spoken-word piece.'),
        },
        activitySuggestions: ['perform-for-audience', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Ideals & lived experience'),
          prompt: lt('Reflect on music, speech, national ideals, critique, and lived experience. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect music and speech to national ideals, critique, and lived experience.',
        },
      },
    },
    songs: ['Marvin Gaye', 'Childish Gambino', '2Pac', 'Bruce Springsteen'],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-block-party-friendship-cypher',
    kind: 'day',
    title: lt('Block Party / Friendship Cypher'),
    themeId: 'theme-august',
    monthHint: 8,
    tags: ['Hip Hop History', 'Community', 'Cypher', 'Collaboration', 'Block Party'],
    standards: ['Creating', 'Performing', 'Presenting', 'Connecting'],
    description:
      'Students connect Friendship Day and hip hop block party origins through collaborative beatmaking, cyphers, dance, and shout-outs \u2014 emphasizing community, play, collaboration, and respect.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('When does music feel like belonging?'),
          prompt: lt('Play an upbeat community-centered hip hop or funk track. What makes music feel like people belong together?'),
        },
        activitySuggestions: ['physicalize', 'community-check-in'],
        atlasResources: [
          { module: 'globe', label: 'Globe: hip hop block party origins', contextNote: 'The Bronx, DJ culture, community space.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can use music to create belonging, fun, and positive group energy.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Build the class beat'),
          prompt: lt('Build a class beat with rhythm sections: drums, bass, melody, hook, chants. Practice cypher norms: pass the mic, hype others, respond respectfully.'),
        },
        activitySuggestions: ['community-songwriting', 'collaborate-in-small-groups', 'create-a-bass-line'],
        atlasResources: [
          { module: 'studio', label: 'Studio: class block-party beat', contextNote: 'Layered sections for the whole class.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can collaborate rhythmically and respond to others in a musical setting.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Shout it out'),
          prompt: lt('Choose one: a shout-out verse for a friend or community \u00B7 a block party beat \u00B7 a flyer for a neighborhood music event \u00B7 a class anthem hook.'),
        },
        activitySuggestions: ['theme-writing', 'producing', 'create-a-hook'],
        atlasResources: [
          { module: 'studio', label: 'Studio: your block-party track', contextNote: 'Build on the class beat.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('The cypher'),
          prompt: lt('Take part in the class cypher \u2014 pass the mic, hype each other.'),
        },
        activitySuggestions: ['perform-as-ensemble', 'perform-for-audience'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Community & creativity'),
          prompt: lt('Reflect on hip hop culture, block parties, community space, and collective creativity. Save and reset.'),
        },
        activitySuggestions: ['peer-and-teacher-feedback', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect hip hop culture to block parties, community space, and collective creativity.',
        },
      },
    },
    songs: ['Brand Nubian \u2014 \u201CAll for One\u201D', 'A Tribe Called Quest selections', 'Bruno Mars \u2014 \u201CUptown Funk\u201D', 'Janelle Mon\u00E1e \u2014 \u201CFloat\u201D'],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-heritage-groove-lab',
    kind: 'day',
    title: lt('Heritage Groove Lab'),
    themeId: 'theme-september',
    monthHint: 9,
    tags: ['Hispanic Heritage', 'Clave', 'Bilingual', 'Groove', 'Identity'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students explore Hispanic Heritage Month through rhythm, groove, identity, and local artists \u2014 clave, bilingual lyricism, Latin hip hop, salsa, reggaeton, cumbia, or local Latinx music.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What culture do you hear?'),
          prompt: lt('Body-percussion clave warm-up. Listen to a Latinx artist or Latin music example. What culture, place, or identity do you hear?'),
        },
        activitySuggestions: ['rhythmic-entrainment', 'listening-stylistic-elements'],
        atlasResources: [
          { module: 'globe', label: 'Globe: Latin music traditions', contextNote: 'Salsa, reggaeton, cumbia, Latin hip hop.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can describe the emotion and community impact of a piece.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Lock the clave'),
          prompt: lt('Learn clave or a Latin-inspired groove. Layer percussion, bass, melody, and chant.'),
        },
        activitySuggestions: ['stylistic-loops', 'stylistic-technique', 'create-a-bass-line'],
        atlasResources: [
          { module: 'learn', label: 'Learn: clave & Latin grooves', contextNote: '2-3 and 3-2 clave, montuno, tumbao.' },
          { module: 'studio', label: 'Studio: layer the groove', contextNote: 'Stack percussion, bass, melody.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can perform a groove with rhythmic accuracy.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Code-switch & create'),
          prompt: lt('Choose one: a Latin-inspired loop \u00B7 bilingual or code-switching lyrics \u00B7 a visual promo for a Latinx artist \u00B7 an autumn-equinox soundscape about change.'),
        },
        activitySuggestions: ['composing', 'theme-writing', 'soundscape-project'],
        atlasResources: [
          { module: 'studio', label: 'Studio: Latin-inspired loop', contextNote: 'Build the groove track.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share your groove'),
          prompt: lt('Perform or play back your loop, lyrics, or soundscape.'),
        },
        activitySuggestions: ['perform-as-ensemble', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Cultural identity in music'),
          prompt: lt('Reflect on cultural influences in music. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can identify cultural influences in music.',
        },
      },
    },
    songs: ['Calle 13', 'Bad Bunny', 'Celia Cruz', 'Daddy Yankee'],
    localContext: lt('Los Mocochetes; Felix Ayodele y La Banda; local Denver Latinx musicians.'),
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-ancestors-memory-dia-de-muertos',
    kind: 'day',
    title: lt('Ancestors, Memory, and D\u00EDa de Muertos'),
    themeId: 'theme-october',
    monthHint: 10,
    tags: ['D\u00EDa de Muertos', 'Memory', 'Ancestors', 'Ritual', 'Remembrance'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students explore music, memory, ancestors, and cultural remembrance through D\u00EDa de Muertos or broader traditions of honoring those who came before.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('Keeping memory alive'),
          prompt: lt('Listen to music connected to remembrance or Mexican cultural tradition. How do people keep someone\u2019s memory alive?'),
        },
        activitySuggestions: ['listen-for-empathy', 'cultural-connections'],
        atlasResources: [
          { module: 'globe', label: 'Globe: D\u00EDa de Muertos & remembrance', contextNote: 'Cultural context and respectful framing.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can express grief, memory, love, and respect through music.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Repetition as ritual'),
          prompt: lt('Create a simple melody or rhythm that feels like remembrance. How can repetition create ritual?'),
        },
        activitySuggestions: ['create-a-hook', 'stylistic-loops'],
        atlasResources: [
          { module: 'studio', label: 'Studio: a remembrance motif', contextNote: 'Looped melodic figure.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use repetition, timbre, and melody to create ritual atmosphere.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('To someone who came before'),
          prompt: lt('Choose one: a verse to an ancestor, loved one, or future descendant \u00B7 an altar-inspired visual music slide \u00B7 a remembrance soundscape \u00B7 cover art for a song about memory.'),
        },
        activitySuggestions: ['theme-writing', 'soundscape-project', 'inspired-by-art'],
        atlasResources: [
          { module: 'studio', label: 'Studio: remembrance soundscape', contextNote: 'Build the reflective piece.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share with care'),
          prompt: lt('Share your verse, slide, or soundscape if you choose.'),
        },
        activitySuggestions: ['listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Traditions of remembrance'),
          prompt: lt('Reflect on music and cultural traditions of remembrance. Save and reset gently.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect music to cultural traditions of remembrance.',
        },
      },
    },
    songs: [],
    localContext: lt('Denver\u2019s D\u00EDa de los Muertos celebrations and community altars in the Art District on Santa Fe.'),
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-fear-darkness-sound-design',
    kind: 'day',
    title: lt('Fear, Darkness, and Sound Design'),
    themeId: 'theme-october',
    monthHint: 10,
    tags: ['Halloween', 'Sound Design', 'Film Scoring', 'Atmosphere', 'Tension'],
    standards: ['Creating', 'Producing', 'Responding', 'Connecting'],
    description:
      'Students explore Halloween, horror scores, drill/trap atmosphere, and cinematic storytelling \u2014 learning how sound creates fear, suspense, and release.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What made you feel tension?'),
          prompt: lt('Listen to a spooky score or dark beat. What sound made you feel tension?'),
        },
        activitySuggestions: ['listen-for-the-feels', 'listen-for-the-story'],
        atlasResources: [
          { module: 'globe', label: 'Globe: horror scores & dark production', contextNote: 'How fear is built in film and hip hop.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can identify how sound creates fear, tension, and release.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Tools of tension'),
          prompt: lt('Experiment with low notes, dissonance, silence, reverb, distortion, whispering, and sudden accents.'),
        },
        activitySuggestions: ['soundscape-project', 'found-sound-production'],
        atlasResources: [
          { module: 'studio', label: 'Studio: build tension', contextNote: 'Dissonance, space, reverb, sudden accents.' },
          { module: 'learn', label: 'Learn: dissonance & the tritone', contextNote: 'Why certain intervals feel scary.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can manipulate timbre, dynamics, harmony, and space to create atmosphere.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Score the scare'),
          prompt: lt('Choose one: score a scary scene \u00B7 a haunted soundscape \u00B7 a dark beat that turns safe or hopeful \u00B7 lyrics from the perspective of fear.'),
        },
        activitySuggestions: ['film-scoring-project', 'soundscape-project', 'theme-writing'],
        atlasResources: [
          { module: 'studio', label: 'Studio: score a scene', contextNote: 'Sync sound to picture.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Listening session'),
          prompt: lt('Share your score or soundscape \u2014 lights low.'),
        },
        activitySuggestions: ['listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Sound & story'),
          prompt: lt('Reflect on how film scoring and hip hop production shape emotional storytelling. Save and reset.'),
        },
        activitySuggestions: ['peer-and-teacher-feedback', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect film scoring and hip hop production to emotional storytelling.',
        },
      },
    },
    songs: ['Hans Zimmer', 'John Carpenter', 'Metro Boomin'],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-light-in-the-dark',
    kind: 'day',
    title: lt('Light in the Dark \u2014 Diwali / Winter / Hope'),
    themeId: 'theme-november',
    monthHint: 11,
    tags: ['Diwali', 'Winter', 'Hope', 'Contrast', 'Gratitude'],
    standards: ['Creating', 'Producing', 'Responding', 'Connecting'],
    description:
      'Students explore the metaphor of light in darkness through Diwali, winter, gratitude, and emotional resilience \u2014 soundscapes, melodic brightness, rhythm, and lyrical hope.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('Light in dark times'),
          prompt: lt('Listen to celebratory or reflective music connected to light, gratitude, or renewal. What helps people keep love in their heart during dark times?'),
        },
        activitySuggestions: ['listen-for-the-feels', 'community-check-in'],
        atlasResources: [
          { module: 'globe', label: 'Globe: Diwali & festivals of light', contextNote: 'Traditions of light across cultures.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can express hope, gratitude, grief, and warmth through sound.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Dark to light'),
          prompt: lt('Create contrast between dark and light sections of a beat. Use high-register sounds, bells, drones, or warm chords.'),
        },
        activitySuggestions: ['emotional-connections', 'musical-structures-song-form'],
        atlasResources: [
          { module: 'studio', label: 'Studio: dark-to-light beat', contextNote: 'Contrast register, texture, dynamics.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use contrast, texture, register, and dynamics to create emotional transformation.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Light in the Dark'),
          prompt: lt('Choose one: a hook called \u201CLight in the Dark\u201D \u00B7 a winter-to-light soundscape \u00B7 score a scene where a community gathers \u00B7 a gratitude beat.'),
        },
        activitySuggestions: ['create-a-hook', 'soundscape-project', 'producing'],
        atlasResources: [
          { module: 'studio', label: 'Studio: your light beat', contextNote: 'Build the hopeful track.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share the light'),
          prompt: lt('Share your hook, soundscape, or beat.'),
        },
        activitySuggestions: ['listening-session', 'perform-for-audience'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Season & community'),
          prompt: lt('Reflect on music and seasonal, spiritual, and community traditions. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect music to seasonal, spiritual, and community traditions.',
        },
      },
    },
    songs: [],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-election-day-voice-and-choice',
    kind: 'day',
    title: lt('Election Day / Voice and Choice'),
    themeId: 'theme-november',
    monthHint: 11,
    tags: ['Civic Voice', 'Community Values', 'Call-and-Response', 'Nonpartisan'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students explore voice, choice, democracy, leadership, and community values through music and lyric writing. Nonpartisan \u2014 focused on expression, agency, listening, and civic imagination.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('What does it mean to have a voice?'),
          prompt: lt('Listen to a song about voice, rights, community, or power. What does it mean to have a voice?'),
        },
        activitySuggestions: ['listen-for-the-story', 'community-check-in'],
        atlasResources: [
          { module: 'globe', label: 'Globe: music & civic voice', contextNote: 'Songs about community values and power.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can express what matters to me and listen to what matters to others.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Chants & shared values'),
          prompt: lt('Create call-and-response chants around shared values. Practice respectful listening and response.'),
        },
        activitySuggestions: ['create-a-hook', 'community-songwriting', 'collaborate-in-small-groups'],
        atlasResources: [
          { module: 'studio', label: 'Studio: chant & hook', contextNote: 'Build a call-and-response hook.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can use repetition, rhythm, and hook-writing to make a message memorable.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('My voice matters'),
          prompt: lt('Choose one: a verse titled \u201CMy Voice Matters\u201D \u00B7 a campaign-style poster for a value (not a candidate) \u00B7 a beat for a community message \u00B7 a hook about what a neighborhood needs.'),
        },
        activitySuggestions: ['theme-writing', 'producing', 'inspired-by-art'],
        atlasResources: [
          { module: 'studio', label: 'Studio: community message', contextNote: 'Build the verse or beat.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share your message'),
          prompt: lt('Share your verse, poster, or hook with the class.'),
        },
        activitySuggestions: ['perform-for-audience', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Civic voice'),
          prompt: lt('Reflect on music, civic voice, community values, and collective decision-making. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect music to civic voice, community values, and collective decision-making.',
        },
      },
    },
    songs: [],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-playlist-soundtrack-of-the-year',
    kind: 'day',
    title: lt('Playlist Slideshow \u2014 Soundtrack of the Year'),
    themeId: 'theme-december',
    monthHint: 12,
    tags: ['Reflection', 'Playlist', 'Narrative', 'Storytelling', 'Year-End'],
    standards: ['Creating', 'Presenting', 'Responding', 'Connecting'],
    description:
      'Students create a playlist slideshow representing their year, their community, or a fictional character\u2019s journey \u2014 each slide a song, an image, and one sentence of emotional meaning.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('If this year had a soundtrack\u2026'),
          prompt: lt('Listen to one reflective song. If this year had a soundtrack, what would be on it?'),
        },
        activitySuggestions: ['listen-for-the-feels', 'community-check-in'],
        atlasResources: [
          { module: 'globe', label: 'Globe: playlists as storytelling', contextNote: 'How sequencing tells a story.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can connect songs to memory, emotion, and personal meaning.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('Sequencing as narrative'),
          prompt: lt('Analyze how song sequencing creates narrative. Discuss intro, conflict, turning point, healing, and ending.'),
        },
        activitySuggestions: ['musical-structures-song-form', 'listen-for-structures'],
        atlasResources: [
          { module: 'learn', label: 'Learn: narrative arc in a setlist', contextNote: 'How order shapes meaning.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can sequence music intentionally to create a narrative arc.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Your year in songs'),
          prompt: lt('Choose one: a personal soundtrack slideshow \u00B7 a fictional character playlist \u00B7 a class playlist around healing and hope \u00B7 cover art for the playlist.'),
        },
        activitySuggestions: ['meaningful-repertoire', 'inspired-by-art', 'composing'],
        atlasResources: [
          { module: 'globe', label: 'Globe: build your playlist slideshow', contextNote: 'Songs + images + meaning.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share your soundtrack'),
          prompt: lt('Present your playlist slideshow \u2014 one song, one image, one sentence per slide.'),
        },
        activitySuggestions: ['research-presentation', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Playlists as identity'),
          prompt: lt('Reflect on playlists as modern storytelling and identity expression. Save and reset.'),
        },
        activitySuggestions: ['self-reflection-planning', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can understand playlists as modern storytelling and identity expression.',
        },
      },
    },
    songs: ['Mac Miller', 'Kanye West', 'Kendrick Lamar'],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

  {
    id: 'seed-kwanzaa-principles-community',
    kind: 'day',
    title: lt('Kwanzaa / Principles and Community'),
    themeId: 'theme-december',
    monthHint: 12,
    tags: ['Kwanzaa', 'Community', 'Principles', 'Collaboration', 'African Diaspora'],
    standards: ['Creating', 'Performing', 'Responding', 'Connecting'],
    description:
      'Students explore Kwanzaa through principles such as unity, self-determination, collective work, purpose, and creativity \u2014 connecting each to music, hip hop culture, and community building.',
    template: {
      connectRegulate: {
        presentation: {
          title: lt('A principle to begin'),
          prompt: lt('Meet one Kwanzaa principle. Listen to a song connected to unity, purpose, or creativity.'),
        },
        activitySuggestions: ['community-check-in', 'cultural-connections'],
        atlasResources: [
          { module: 'globe', label: 'Globe: Kwanzaa principles & the diaspora', contextNote: 'The seven principles in context.' },
        ],
        cloText: {
          awarenessOfFeeling: 'I can connect music to community strength, purpose, and belonging.',
        },
      },
      groupPractice: {
        presentation: {
          title: lt('One layer each'),
          prompt: lt('Create a class chant or hook around one principle. Build a collaborative groove where each group contributes one layer.'),
        },
        activitySuggestions: ['community-songwriting', 'collaborate-in-small-groups', 'create-a-hook'],
        atlasResources: [
          { module: 'studio', label: 'Studio: collaborative groove', contextNote: 'Each group adds one part.' },
        ],
        cloText: {
          awarenessOfTechnique: 'I can collaborate musically by contributing one clear part to a group work.',
        },
      },
      creativeProjects: {
        presentation: {
          title: lt('Unity / Purpose'),
          prompt: lt('Choose one: a verse about one principle \u00B7 a beat called \u201CUnity\u201D or \u201CPurpose\u201D \u00B7 a visual slide explaining a principle through music.'),
        },
        activitySuggestions: ['theme-writing', 'producing', 'inspired-by-art'],
        atlasResources: [
          { module: 'studio', label: 'Studio: principle beat', contextNote: 'Build the track.' },
        ],
        cloText: {},
      },
      presentPerform: {
        presentation: {
          title: lt('Share the principle'),
          prompt: lt('Share your verse, beat, or slide with the class.'),
        },
        activitySuggestions: ['perform-as-ensemble', 'listening-session'],
        atlasResources: [],
        cloText: {},
      },
      respondReflectReset: {
        presentation: {
          title: lt('Principles & community'),
          prompt: lt('Reflect on Kwanzaa principles, African American culture, the diaspora, and community values. Save and reset.'),
        },
        activitySuggestions: ['peer-and-teacher-feedback', 'reset-the-space'],
        atlasResources: [],
        cloText: {
          awarenessOfContext: 'I can connect Kwanzaa principles to African American culture, African diaspora, and community values.',
        },
      },
    },
    songs: [],
    localContext: null,
    source: 'canonical', createdBy: null, createdAt: CREATED_AT,
  },

];

/* ============================================================
   PART 2 — kind: 'activity'  (single anchor lessons)
   from monthly_lesson_outline_activity_bank.md
   Each anchor.activity is a full canonical Activity, also
   derived into the Activity Bank on load.
   ============================================================ */

interface MkAnchorCfg {
  seedId: string;
  activityId: string;
  title: string;
  themeId: string;
  monthHint: number | null;
  phase: string;
  purpose: string;
  initiationStyle: string | null;
  tags: string[];
  standards: string[];
  description: string;
  learningOutcome: string;
  assessment: string;
  clos: {
    awarenessOfFeeling?: string;
    awarenessOfTechnique?: string;
    awarenessOfContext?: string;
  };
  impactValues: string[];
  atlasResources: { module: string; label: string; contextNote: string }[];
  songs?: string[];
  localContext?: string;
}

const mkAnchor = (cfg: MkAnchorCfg) => ({
  id: cfg.seedId,
  kind: 'activity',
  title: lt(cfg.title),
  themeId: cfg.themeId,
  monthHint: cfg.monthHint,
  tags: cfg.tags,
  standards: cfg.standards,
  description: cfg.description,
  anchor: {
    phase: cfg.phase,
    activity: {
      id: cfg.activityId,
      title: cfg.title,
      phase: cfg.phase,
      purpose: cfg.purpose,
      initiationStyle: cfg.initiationStyle,
      description: cfg.description,
      learningOutcome: cfg.learningOutcome,
      assessment: cfg.assessment,
      clos: cfg.clos,
      standards: cfg.standards,
      impactValues: cfg.impactValues,
      atlasResources: cfg.atlasResources,
      source: 'canonical', createdBy: null, createdAt: CREATED_AT,
    },
  },
  songs: cfg.songs || [],
  localContext: cfg.localContext ? lt(cfg.localContext) : null,
  source: 'canonical', createdBy: null, createdAt: CREATED_AT,
});

const activitySeeds = [

  mkAnchor({
    seedId: 'seed-hispanic-heritage-kickoff', activityId: 'act-hispanic-heritage-kickoff',
    title: 'Hispanic Heritage Kickoff', themeId: 'theme-september', monthHint: 9,
    phase: 'connectRegulate', purpose: 'Artist Spotlight', initiationStyle: 'learn-to-apply',
    tags: ['Hispanic Heritage', 'Latin Music', 'Cultural Identity', 'Rhythm'],
    standards: ['Connecting', 'Creating', 'Responding'],
    description: 'Students explore the beginning of Hispanic Heritage Month through Latinx musical identity, rhythm, groove, and local artists. Begins with a body-percussion clave, then moves into artist listening, cultural discussion, groove-building, and creative response.',
    learningOutcome: 'Students identify cultural influences in music and experience how rhythm, groove, lyrics, and community identity connect in Latinx musical traditions.',
    assessment: 'Participation in rhythm warm-up, discussion, groove creation, creative project, peer feedback, or written reflection.',
    clos: {
      awarenessOfFeeling: 'I can describe the emotion and community impact of a piece of music.',
      awarenessOfTechnique: 'I can perform a groove with rhythmic accuracy.',
      awarenessOfContext: 'I can identify and articulate cultural influences in music.',
    },
    impactValues: ['Community-Responsive', 'Inclusive', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Globe: Latinx musical identity', contextNote: 'Explore the artists and traditions.' },
      { module: 'learn', label: 'Learn: clave patterns', contextNote: '2-3 and 3-2 clave notation.' },
      { module: 'studio', label: 'Studio: build a Latin groove loop', contextNote: 'Layer the rhythm.' },
    ],
    localContext: 'Los Mocochetes; Felix Ayodele y La Banda; local Denver Latinx musicians.',
  }),

  mkAnchor({
    seedId: 'seed-hip-hop-history-denver', activityId: 'act-hip-hop-history-denver',
    title: 'Hip Hop History Month: Denver Focus', themeId: 'theme-august', monthHint: 8,
    phase: 'groupPractice', purpose: 'Music Industry Application', initiationStyle: 'hybrid',
    tags: ['Hip Hop Studies', 'Denver Music', 'Beatmaking', 'Graffiti Art'],
    standards: ['Connecting', 'Creating', 'Presenting'],
    description: 'Students connect the historical birth of hip hop to local Denver hip hop culture. Begins with a freestyle rhythm warm-up (body percussion, desk drumming, beatboxing, call-and-response), then explores Denver artists, builds a class beat, layers 4-bar loops, and assigns creative roles.',
    learningOutcome: 'Students understand hip hop as a living culture rooted in DJing, MCing, graffiti, rhythm, collaboration, and community expression.',
    assessment: 'Participation in the class beat, 4-bar loop creation, lyric writing, cypher performance, graffiti-style artwork, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can connect hip hop expression to identity, energy, and community voice.',
      awarenessOfTechnique: 'I can demonstrate timing and flow in rhythm-based performance.',
      awarenessOfContext: 'I can relate hip hop to social and historical context.',
    },
    impactValues: ['Community-Responsive', 'Modern', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Globe: the birth of hip hop', contextNote: 'Bronx origins through to local scenes.' },
      { module: 'studio', label: 'Studio: build a class beat', contextNote: 'Layer 4-bar loops.' },
      { module: 'arcade', label: 'Arcade: rhythm & flow games', contextNote: 'Timing practice.' },
    ],
    localContext: 'Denver Aux Wars; Ill Se7en; DJ Cavem; Jelie; graffiti art on Santa Fe Drive.',
  }),

  mkAnchor({
    seedId: 'seed-music-for-change', activityId: 'act-music-for-change',
    title: 'Music for Change', themeId: 'theme-september', monthHint: 9,
    phase: 'creativeProjects', purpose: 'Composition', initiationStyle: 'try-it-first',
    tags: ['Social Justice', 'Peace', 'Protest Music', 'Songwriting'],
    standards: ['Connecting', 'Creating', 'Responding'],
    description: 'Students explore music as a tool for peace, activism, and social change, connected to International Day of Peace. Begins with guided breathing over peaceful music, then artist listening and discussion, then songwriting, soundscape, or social media design.',
    learningOutcome: 'Students connect artistic work to personal and community values while using musical skills to communicate a message.',
    assessment: 'Participation in breathing/listening, discussion, arrangement, songwriting, soundscape creation, visual design, presentation, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can describe the emotional intent in my own and others\u2019 work.',
      awarenessOfTechnique: 'I can apply musical skills to communicate a message.',
      awarenessOfContext: 'I can connect artistic work to a personal or community value.',
    },
    impactValues: ['Community-Responsive', 'Therapeutic', 'Empowerment'],
    atlasResources: [
      { module: 'globe', label: 'Globe: music & activism', contextNote: 'Songs that moved movements.' },
      { module: 'studio', label: 'Studio: write a peace-themed song', contextNote: 'Lyric + reflective soundscape.' },
    ],
    localContext: 'Flobots; Covenhoven; Denver musicians connected to activism and social justice.',
  }),

  mkAnchor({
    seedId: 'seed-opera-liberation', activityId: 'act-opera-liberation',
    title: 'Opera & Liberation', themeId: 'theme-october', monthHint: 10,
    phase: 'connectRegulate', purpose: 'Active Listening', initiationStyle: 'learn-to-apply',
    tags: ['Opera', 'Latinx Music History', 'Storytelling', 'Vocal Expression'],
    standards: ['Connecting', 'Responding', 'Creating'],
    description: 'Students explore opera as a historical storytelling form through La p\u00FArpura de la rosa by Tom\u00E1s de Torrej\u00F3n y Velasco, often identified as the first opera of the New World. Listen for mood and dramatic gestures, learn a short excerpt, and discuss opera in colonial Latin America.',
    learningOutcome: 'Students understand opera as a dramatic musical form that can communicate identity, power, liberation, and emotional narrative.',
    assessment: 'Participation in listening, mood mapping, excerpt performance, spoken-word chorus, poster design, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can express emotional narrative through performance.',
      awarenessOfTechnique: 'I can use vocal technique or text rhythm intentionally.',
      awarenessOfContext: 'I can connect musical style to historical context.',
    },
    impactValues: ['Inclusive', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Globe: opera in colonial Latin America', contextNote: 'La p\u00FArpura de la rosa in context.' },
      { module: 'learn', label: 'Learn: a vocal/rhythmic excerpt', contextNote: 'Short operatic phrase.' },
    ],
    localContext: 'Denver opera organizations; Latinx soloists and opera performers.',
  }),

  mkAnchor({
    seedId: 'seed-dia-de-la-raza', activityId: 'act-dia-de-la-raza',
    title: 'D\u00EDa de la Raza / Indigenous Resistance', themeId: 'theme-october', monthHint: 10,
    phase: 'groupPractice', purpose: 'Community Creativity', initiationStyle: 'try-it-first',
    tags: ['Indigenous Music', 'Latinx Heritage', 'Cultural Fusion', 'Resistance'],
    standards: ['Connecting', 'Creating', 'Responding'],
    description: 'Students explore music connected to D\u00EDa de la Raza, Indigenous Peoples\u2019 Day, multicultural identity, and Indigenous resistance. Listen to music blending Indigenous and Latin American sounds, then build layered grooves using ostinatos, drums, shakers, chant, and melody.',
    learningOutcome: 'Students recognize how musical fusion can reflect cultural identity, resistance, resilience, and historical memory.',
    assessment: 'Participation in listening, rhythmic layering, soundscape creation, lyric writing, visual work, performance, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can communicate emotional narrative through sound.',
      awarenessOfTechnique: 'I can coordinate rhythmic layering with intention.',
      awarenessOfContext: 'I can relate musical fusion to cultural identity.',
    },
    impactValues: ['Community-Responsive', 'Inclusive', 'Empowerment'],
    atlasResources: [
      { module: 'globe', label: 'Globe: Indigenous & Latin fusion', contextNote: 'Cultural blending and resistance.' },
      { module: 'studio', label: 'Studio: layer ostinatos & chant', contextNote: 'Build the fusion groove.' },
    ],
    localContext: 'Local Indigenous and Latinx artists; multicultural heritage events; Indigenous percussion and flute traditions.',
  }),

  mkAnchor({
    seedId: 'seed-women-in-jazz', activityId: 'act-women-in-jazz',
    title: 'Women in Jazz', themeId: 'theme-march', monthHint: 3,
    phase: 'groupPractice', purpose: 'Skill Building', initiationStyle: 'try-it-first',
    tags: ['Jazz History', 'Women in Music', 'Improvisation', 'Representation'],
    standards: ['Connecting', 'Creating', 'Presenting'],
    description: 'Students explore the artistry and legacy of women in jazz through Mary Lou Williams, Toshiko Akiyoshi, and local female jazz artists. Listen for stylistic traits, learn a short riff or swing rhythm, experiment with call-and-response, and create a new melody, ensemble piece, or flyer.',
    learningOutcome: 'Students identify stylistic traits of specific jazz artists while exploring representation, improvisation, and personal voice.',
    assessment: 'Participation in listening, riff learning, call-and-response, melody writing, arrangement, flyer design, performance, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can express personal voice through improvisation.',
      awarenessOfTechnique: 'I can apply jazz articulation and phrasing.',
      awarenessOfContext: 'I can identify stylistic traits of a specific artist and discuss why representation matters.',
    },
    impactValues: ['Inclusive', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Globe: women who shaped jazz', contextNote: 'Mary Lou Williams, Toshiko Akiyoshi and more.' },
      { module: 'learn', label: 'Learn: a jazz riff & swing feel', contextNote: 'Iconic notation for the riff.' },
      { module: 'studio', label: 'Studio: improvise over changes', contextNote: 'Call-and-response practice.' },
    ],
    localContext: 'Denver-based women jazz artists; Five Points jazz venues.',
  }),

  mkAnchor({
    seedId: 'seed-halloween-sound-design', activityId: 'act-halloween-sound-design',
    title: 'Halloween Sound Design', themeId: 'theme-october', monthHint: 10,
    phase: 'creativeProjects', purpose: 'Production', initiationStyle: 'learn-to-apply',
    tags: ['Sound Design', 'Film Scoring', 'Atmosphere', 'Creative Technology'],
    standards: ['Creating', 'Producing', 'Responding'],
    description: 'Students explore Halloween as an entry point into creating atmosphere through sound. Listen to short spooky score clips, identify emotional responses, and experiment with instruments, DAWs, found objects, textures, effects, tension, and release.',
    learningOutcome: 'Students understand how timbre, dynamics, texture, effects, and pacing shape emotional atmosphere in music and media.',
    assessment: 'Participation in listening, sound exploration, soundscape creation, score composition, sound-effect design, presentation, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can describe the intended emotional impact of sound design.',
      awarenessOfTechnique: 'I can manipulate timbre and dynamics for dramatic effect.',
      awarenessOfContext: 'I can connect musical texture to emotional atmosphere.',
    },
    impactValues: ['Modern', 'Accessible', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Studio: build a haunted soundscape', contextNote: 'Tension, release, effects.' },
      { module: 'learn', label: 'Learn: dissonance & dynamics', contextNote: 'How tension is built.' },
    ],
    localContext: 'Local sound designers, haunted attractions, theater groups, and film-score examples.',
  }),

  mkAnchor({
    seedId: 'seed-native-american-heritage', activityId: 'act-native-american-heritage',
    title: 'Native American Heritage Month', themeId: 'theme-november', monthHint: 11,
    phase: 'connectRegulate', purpose: 'Active Listening', initiationStyle: 'learn-to-apply',
    tags: ['Native American Heritage', 'Cultural Heritage', 'Rhythm', 'Soundscape'],
    standards: ['Connecting', 'Creating', 'Responding'],
    description: 'Students explore Native American Heritage Month through respectful listening, cultural discussion, rhythm, and soundscape. Listen to a traditional powwow song or flute melody, notice rhythm, melody, and purpose, and discuss cultural meaning and respectful use of Indigenous music.',
    learningOutcome: 'Students develop respectful awareness of music as cultural heritage while connecting rhythm, story, identity, and community purpose.',
    assessment: 'Participation in listening, discussion of respectful use, rhythm practice, composition, art pairing, soundscape recording, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can express connection to story and heritage through music.',
      awarenessOfTechnique: 'I can perform rhythms with precision and intention.',
      awarenessOfContext: 'I can relate musical elements to cultural traditions.',
    },
    impactValues: ['Community-Responsive', 'Inclusive', 'Therapeutic'],
    atlasResources: [
      { module: 'globe', label: 'Globe: Indigenous music traditions', contextNote: 'Respectful cultural context.' },
      { module: 'studio', label: 'Studio: a remembrance soundscape', contextNote: 'Traditional and modern sounds.' },
    ],
    localContext: 'Local Indigenous musicians; powwow drum groups; Denver venues featuring Indigenous collaborations.',
  }),

  mkAnchor({
    seedId: 'seed-jazz-social-justice-strayhorn', activityId: 'act-jazz-social-justice-strayhorn',
    title: 'Jazz & Social Justice: Billy Strayhorn', themeId: 'theme-february', monthHint: 2,
    phase: 'groupPractice', purpose: 'Skill Building', initiationStyle: 'learn-to-apply',
    tags: ['Jazz History', 'Social Justice', 'LGBTQ+ History', 'Arrangement'],
    standards: ['Connecting', 'Creating', 'Responding'],
    description: 'Students explore jazz, inclusion, and social justice through Billy Strayhorn, composer-arranger for Duke Ellington and an important LGBTQ+ figure in jazz history. Listen to \u201CTake the \u2018A\u2019 Train\u201D or \u201CLush Life,\u201D discuss mood, harmony, story, and identity, and practice a short melody or jazz blues progression.',
    learningOutcome: 'Students connect jazz performance and arrangement choices to social identity, inclusion, and emotional expression.',
    assessment: 'Participation in listening, melody learning, dynamics practice, arrangement, spoken word, visual art, performance, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can convey emotion through arrangement choices.',
      awarenessOfTechnique: 'I can apply stylistic articulation in jazz performance.',
      awarenessOfContext: 'I can connect music to social and personal identity.',
    },
    impactValues: ['Inclusive', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Globe: Strayhorn & Ellington', contextNote: 'Jazz, identity, and inclusion.' },
      { module: 'learn', label: 'Learn: a jazz melody & blues changes', contextNote: 'Iconic notation.' },
      { module: 'studio', label: 'Studio: arrange with dynamics', contextNote: 'Expressive arrangement.' },
    ],
    localContext: 'Denver\u2019s Five Points jazz legacy; artists who advocate through music.',
  }),

  mkAnchor({
    seedId: 'seed-veterans-day-music-service', activityId: 'act-veterans-day-music-service',
    title: 'Veterans Day: Music in Service', themeId: 'theme-november', monthHint: 11,
    phase: 'presentPerform', purpose: 'Public Performance', initiationStyle: 'learn-to-apply',
    tags: ['Veterans Day', 'Ceremonial Music', 'Music in Society', 'Tribute'],
    standards: ['Connecting', 'Creating', 'Presenting'],
    description: 'Students explore the role of music in service, ceremony, morale-building, and tribute. Listen to a military march or bugle call, discuss the feelings and images it evokes, and learn a simple march rhythm or bugle-call melody, then compose or arrange a tribute.',
    learningOutcome: 'Students understand how music functions in society to honor, remember, support, and strengthen communities.',
    assessment: 'Participation in listening, rhythm or melody practice, composition, arrangement, multimedia creation, presentation, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can communicate a mood or tribute through performance.',
      awarenessOfTechnique: 'I can maintain steady tempo and ensemble unity.',
      awarenessOfContext: 'I can identify functional roles of music in society.',
    },
    impactValues: ['Community-Responsive', 'Accessible', 'Prosocial'],
    atlasResources: [
      { module: 'globe', label: 'Globe: music in ceremony & society', contextNote: 'How music honors and remembers.' },
      { module: 'learn', label: 'Learn: a march rhythm or bugle call', contextNote: 'Simple ceremonial melody.' },
    ],
    localContext: 'Colorado military bands, ceremonial music, bugle calls, and veteran community events.',
  }),

  mkAnchor({
    seedId: 'seed-fall-soundscapes', activityId: 'act-fall-soundscapes',
    title: 'Fall Soundscapes', themeId: 'theme-september', monthHint: 9,
    phase: 'creativeProjects', purpose: 'Production', initiationStyle: 'try-it-first',
    tags: ['Soundscape', 'Seasonal Music', 'Field Recording', 'Creative Technology'],
    standards: ['Creating', 'Responding', 'Connecting'],
    description: 'Students use autumn sounds and moods as inspiration for soundscape composition. Listen to recorded autumn environments, identify natural and human-made sounds, and explore how instruments, voice, found sounds, and DAWs create texture.',
    learningOutcome: 'Students connect environmental sound, musical texture, and emotional storytelling.',
    assessment: 'Participation in listening, mood mapping, texture exploration, field recording, composition, audio/visual project, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can evoke an emotional response using non-traditional musical elements.',
      awarenessOfTechnique: 'I can shape timbre and texture for mood.',
      awarenessOfContext: 'I can connect musical choices to environmental context.',
    },
    impactValues: ['Accessible', 'Therapeutic', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Studio: autumn soundscape', contextNote: 'Layer field recordings and texture.' },
    ],
    localContext: 'Field recordings from Denver parks, neighborhoods, streets, and autumn environments.',
  }),

  mkAnchor({
    seedId: 'seed-holiday-music-world', activityId: 'act-holiday-music-world',
    title: 'Holiday Music Around the World', themeId: 'theme-december', monthHint: 12,
    phase: 'groupPractice', purpose: 'Community Creativity', initiationStyle: 'learn-to-apply',
    tags: ['World Music', 'Cultural Traditions', 'Holiday Music', 'Ensemble'],
    standards: ['Connecting', 'Creating', 'Presenting'],
    description: 'Students explore holiday music from multiple traditions \u2014 Hanukkah, Christmas, Kwanzaa, Solstice, and more. Listen to short excerpts, identify celebratory sounds and instruments, learn a simple melody, chant, or rhythm, and discuss music\u2019s role in gatherings.',
    learningOutcome: 'Students understand how music supports celebration, memory, ritual, and cultural belonging.',
    assessment: 'Participation in listening, melody/rhythm learning, cultural discussion, medley arrangement, composition, presentation, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can express celebratory or reflective mood through performance.',
      awarenessOfTechnique: 'I can apply melodic and rhythmic skills in an ensemble setting.',
      awarenessOfContext: 'I can connect music to cultural rituals and traditions.',
    },
    impactValues: ['Inclusive', 'Community-Responsive', 'Accessible'],
    atlasResources: [
      { module: 'globe', label: 'Globe: holiday traditions worldwide', contextNote: 'Multiple cultural celebrations.' },
      { module: 'learn', label: 'Learn: a melody or chant', contextNote: 'From one tradition.' },
      { module: 'studio', label: 'Studio: a multicultural medley', contextNote: 'Arrange the pieces together.' },
    ],
    localContext: 'Local cultural organizations, seasonal concerts, and community holiday events.',
  }),

  mkAnchor({
    seedId: 'seed-beethoven-motif-remix', activityId: 'act-beethoven-motif-remix',
    title: 'Beethoven\u2019s Birthday: Motif Remix', themeId: 'theme-december', monthHint: 12,
    phase: 'creativeProjects', purpose: 'Composition', initiationStyle: 'learn-to-apply',
    tags: ['Classical Remix', 'Composer Study', 'Motif Development', 'Arrangement'],
    standards: ['Connecting', 'Creating', 'Producing'],
    description: 'Students explore Beethoven\u2019s birthday through motif, emotional power, rhythmic drive, and reinterpretation. Listen to Symphony No. 5, \u201COde to Joy,\u201D or modern reinterpretations such as Jon Batiste\u2019s. Learn a short motif, experiment with tempo and dynamics, then arrange it for modern instruments, DAW, beatmaking, or visual art.',
    learningOutcome: 'Students understand how a short musical idea can be transformed through tempo, dynamics, instrumentation, production, and interpretation.',
    assessment: 'Participation in listening, motif learning, experimentation, arrangement, composition, visual art, performance, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can convey emotion through interpretation.',
      awarenessOfTechnique: 'I can demonstrate control over tempo and dynamics.',
      awarenessOfContext: 'I can identify stylistic traits of a composer.',
    },
    impactValues: ['Accessible', 'Modern', 'Inclusive'],
    atlasResources: [
      { module: 'learn', label: 'Learn: the Symphony No. 5 motif', contextNote: 'The four-note figure in notation.' },
      { module: 'studio', label: 'Studio: remix the motif', contextNote: 'Reinterpret with modern production.' },
      { module: 'globe', label: 'Globe: Beethoven & modern reinterpretation', contextNote: 'From 1808 to Jon Batiste.' },
    ],
    localContext: 'Colorado Symphony performances.',
  }),

  mkAnchor({
    seedId: 'seed-human-rights-music', activityId: 'act-human-rights-music',
    title: 'Human Rights & Music', themeId: 'theme-december', monthHint: 12,
    phase: 'creativeProjects', purpose: 'Composition', initiationStyle: 'try-it-first',
    tags: ['Human Rights', 'Protest Music', 'Activism', 'Songwriting'],
    standards: ['Connecting', 'Creating', 'Responding'],
    description: 'Students explore Human Rights Day through music connected to justice movements and community action. Listen to a song tied to a movement, identify the message, and discuss how lyrics, groove, melody, and performance support meaning, then write, produce, or arrange.',
    learningOutcome: 'Students use music to communicate social messages and understand how art can inspire reflection, awareness, and change.',
    assessment: 'Participation in listening, chorus/groove learning, discussion, songwriting, spoken word, media design, arrangement, performance, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can describe the emotional and social impact of performance.',
      awarenessOfTechnique: 'I can use rhythm and melody to support lyrical meaning.',
      awarenessOfContext: 'I can connect musical ideas to social messages.',
    },
    impactValues: ['Community-Responsive', 'Therapeutic', 'Empowerment'],
    atlasResources: [
      { module: 'globe', label: 'Globe: music & human rights movements', contextNote: 'Songs tied to justice.' },
      { module: 'studio', label: 'Studio: write or arrange an activist song', contextNote: 'Lyric + production.' },
    ],
    localContext: 'Local activist musicians and arts organizations promoting justice.',
  }),

  mkAnchor({
    seedId: 'seed-winter-soundscapes', activityId: 'act-winter-soundscapes',
    title: 'Winter Soundscapes', themeId: 'theme-december', monthHint: 12,
    phase: 'creativeProjects', purpose: 'Production', initiationStyle: 'try-it-first',
    tags: ['Soundscape', 'Seasonal Music', 'Field Recording', 'Poetry'],
    standards: ['Creating', 'Responding', 'Connecting'],
    description: 'Students use winter sounds, imagery, and atmosphere as inspiration for original music and sound design. Listen to a winter soundscape with eyes closed, identify sounds and feelings, then create textures using instruments, DAW, voice, found objects, or narration.',
    learningOutcome: 'Students connect timbre, texture, atmosphere, imagery, and emotional response through seasonal sound design.',
    assessment: 'Participation in listening, sharing, texture creation, composition, poetry pairing, narration, presentation, peer feedback, or reflection.',
    clos: {
      awarenessOfFeeling: 'I can evoke emotional response through nontraditional musical elements.',
      awarenessOfTechnique: 'I can shape sound for mood and setting.',
      awarenessOfContext: 'I can relate timbre and texture to environmental imagery.',
    },
    impactValues: ['Accessible', 'Therapeutic', 'Inclusive'],
    atlasResources: [
      { module: 'studio', label: 'Studio: winter soundscape', contextNote: 'Texture, narration, and field recordings.' },
    ],
    localContext: 'Field recordings from Denver\u2019s winter environment: snow, city streets, wind, wildlife, neighborhood sounds.',
  }),

];

const lessonSeeds = [...daySeeds, ...activitySeeds];

export const RAW_LESSON_SEEDS = lessonSeeds;
export const RAW_DAY_SEEDS = daySeeds;
export const RAW_ACTIVITY_SEEDS = activitySeeds;
