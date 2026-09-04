/* eslint-disable */
/**
 * Music Atlas Teacher — Canonical Theme Bank (v1.2)
 *
 * Month-level planning scaffolding. NOT activities. See SPEC_v1.2_ThemeBank.md §1.
 *
 * Sourced from Music Bridge IMPACT lesson materials under MOU. "Music Bridge"
 * appears in engineering docs only — never in user-facing copy or identifiers.
 *
 * Authoring notes:
 *   - title is LocalizedText ({ en, es? }); ES left empty for now (falls back to EN).
 *   - focus, essentialQuestions, suggestedArtists, enduringUnderstandings are
 *     teacher-facing English in v1.2.
 *   - enduringUnderstandings hold the STATEMENT-VOICE ideas (the yearlong file's
 *     CLO trios, rephrased as understandings). Student-voice "I can…" objectives
 *     live in the CLO Bank, derived from the seeds — NOT here.
 *   - seedIds cross-reference lessonSeeds.seed.js. Referential integrity is
 *     validated at build time (every seedId resolves; every seed's themeId resolves).
 *   - month is 1..12. A Theme with month:null would be a custom/unit-level theme
 *     (none ship canonically).
 */

const CREATED_AT = '2026-05-21';
const lt = (en: string, es?: string) => (es ? { en, es } : { en });

const themes = [
  {
    id: 'theme-january',
    month: 1,
    title: lt('January \u2014 Identity, Vision, Mentorship, and Dreams'),
    focus:
      'New beginnings, identity, and vision. Anchored by National Mentoring Month, the New Year, and Dr. Martin Luther King Jr. Day \u2014 connecting civil-rights voice, protest, hope, and community leadership to spoken word, blues, and student self-expression.',
    essentialQuestions: [
      'Who am I right now, and who do I want to become?',
      'What matters to me?',
      'What does leadership look like when someone is flawed but still great?',
      'How can spoken word, music, and rhythm help people move toward change?',
    ],
    suggestedArtists: [
      'Kendrick Lamar',
      'Sam Cooke',
      'Nina Simone',
      'Common',
      'MLK speeches',
      '2Pac',
    ],
    enduringUnderstandings: [
      'Music can inspire hope and collective action.',
      'Musical and lyrical techniques can communicate social messages.',
      'Music has historically supported movements for justice and equality.',
    ],
    seedIds: ['seed-vision-dream-cypher', 'seed-blues-as-lived-experience'],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-february',
    month: 2,
    title: lt(
      'February \u2014 Black History, Migration, Renaissance, and Ambassadors',
    ),
    focus:
      'Black musical innovation, identity, resilience, and cultural influence. Black History Month traced through the Great Migration, the Harlem Renaissance, and the idea of artists as ambassadors for their communities \u2014 connecting blues, jazz, gospel, soul, funk, and hip hop.',
    essentialQuestions: [
      'How does music carry people\u2019s stories across geography and generations?',
      'What happens when people migrate and bring their culture with them?',
      'How did Black artists shape American music?',
      'What does it mean to be an ambassador for your community?',
    ],
    suggestedArtists: [
      'Public Enemy',
      'A Tribe Called Quest',
      'Lauryn Hill',
      'Nina Simone',
      'James Brown',
      'Duke Ellington',
    ],
    enduringUnderstandings: [
      'Black musical traditions continue to shape contemporary culture and identity.',
      'Rhythmic, lyrical, and production elements are rooted in Black musical traditions.',
      'Hip hop emerged from a long continuum of Black artistic innovation.',
    ],
    seedIds: [
      'seed-great-migration-sound-map',
      'seed-harlem-renaissance-artist-lounge',
      'seed-jazz-social-justice-strayhorn',
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-march',
    month: 3,
    title: lt('March \u2014 Women\u2019s History, Spring, and Transformation'),
    focus:
      'Transformation, women in music, and emotional storytelling. Women\u2019s History Month centering women across jazz, blues, R&B, hip hop, and global music, alongside springtime themes of rebirth and renewal (Spring Equinox, Holi, Ramadan).',
    essentialQuestions: [
      'Whose voices have been overlooked in music history?',
      'How do women artists shape sound, identity, and culture?',
      'How do music and ritual help people mark transformation?',
      'How do color, season, fasting, reflection, and renewal connect to sound?',
    ],
    suggestedArtists: [
      'Missy Elliott',
      'Lauryn Hill',
      'H.E.R.',
      'SZA',
      'Billie Holiday',
      'Ella Fitzgerald',
    ],
    enduringUnderstandings: [
      'Music can communicate emotional transformation and growth.',
      'Artists create mood through harmony, texture, rhythm, and production.',
      'Women have shaped musical innovation across every genre and era.',
    ],
    seedIds: [
      'seed-women-who-changed-the-sound',
      'seed-strange-fruit-power-of-witness',
      'seed-women-in-jazz',
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-april',
    month: 4,
    title: lt(
      'April \u2014 Arab Heritage, Earth Day, Second Chances, and Jazz',
    ),
    focus:
      'Authenticity, environment, and renewal. Poetry Month and Jazz Appreciation alongside Arab American Heritage Month, Earth Day, and Second Chance Month \u2014 exploring spoken word, lyricism, our connection to place, and the difference between image and lived truth.',
    essentialQuestions: [
      'What does a second chance sound like?',
      'How does music connect us to land, environment, and home?',
      'How do Arab musical traditions influence contemporary sound?',
      'How does jazz teach listening, improvisation, and adaptation?',
    ],
    suggestedArtists: [
      'J. Cole',
      'Kendrick Lamar',
      'The Weeknd',
      'Pablo Neruda',
      'H.E.R.',
    ],
    enduringUnderstandings: [
      'Music and poetry can communicate truths people struggle to express directly.',
      'Symbolism, emotional contrast, and lyrical storytelling shape meaning.',
      'Hip hop and spoken word both emerge from traditions of expressive storytelling.',
    ],
    seedIds: [
      'seed-second-chance-soundtrack',
      'seed-earth-day-environment-beat',
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-may',
    month: 5,
    title: lt('May \u2014 Heritage, Mothers, Labor, and Community'),
    focus:
      'Solidarity, care, and intergenerational connection. AANHPI and Jewish American Heritage Months, Mother\u2019s Day, and May Day labor solidarity \u2014 exploring how families and ancestors shape our sound, how songs preserve culture, and what care and solidarity sound like.',
    essentialQuestions: [
      'How do families and ancestors shape our sound?',
      'How do songs preserve culture across generations?',
      'What does solidarity sound like?',
      'What does care sound like?',
    ],
    suggestedArtists: [
      'Public Enemy',
      'Cesar Chavez & Dolores Huerta (speeches)',
      'Fred Hampton (speeches)',
    ],
    enduringUnderstandings: [
      'Music can create unity and emotional support during difficult experiences.',
      'Repetition, rhythm, and lyrical hooks can communicate group identity.',
      'Songs and chants have historically supported labor movements and collective action.',
    ],
    seedIds: ['seed-mother-caregiver-song'],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-june',
    month: 6,
    title: lt('June \u2014 Freedom, Pride, Diaspora, and Juneteenth'),
    focus:
      'Freedom, joy, and identity. Juneteenth, Pride Month, Caribbean-American and Immigrant Heritage Months, and the Summer Solstice \u2014 exploring liberation, Black joy, diaspora, and how people celebrate identity and survival.',
    essentialQuestions: [
      'What does freedom sound like?',
      'What does joy sound like after struggle?',
      'How do migration and diaspora shape music?',
      'How do people celebrate identity and survival?',
    ],
    suggestedArtists: [
      'Gil Scott-Heron',
      'Kendrick Lamar',
      'Common',
      'Stevie Wonder',
    ],
    enduringUnderstandings: [
      'Music can express struggle and celebration at the same time.',
      'Musical techniques can create emotional uplift and resilience.',
      'Juneteenth commemorates delayed emancipation and the ongoing pursuit of freedom.',
    ],
    seedIds: ['seed-freedom-joy-juneteenth', 'seed-diaspora-rhythm-lab'],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-july',
    month: 7,
    title: lt('July \u2014 Independence, Contradictions, and Freedom'),
    focus:
      'Patriotism, critique, and identity. Independence Day held alongside Frederick Douglass\u2019s \u201CWhat to the Slave Is the Fourth of July?\u201D \u2014 exploring how artists celebrate and critique a country at once, and the gap between national ideals and lived experience.',
    essentialQuestions: [
      'What does freedom mean if not everyone experiences it equally?',
      'Can a song love a country and critique it at the same time?',
      'What is the difference between a symbol and a lived reality?',
      'What does democracy sound like?',
    ],
    suggestedArtists: [
      'Marvin Gaye',
      'Childish Gambino',
      '2Pac',
      'Bruce Springsteen',
    ],
    enduringUnderstandings: [
      'Music can express pride, critique, frustration, and hope at the same time.',
      'Lyrical themes and emotional contrast can carry complex meaning.',
      'Artists often explore contradictions between national ideals and lived experience.',
    ],
    seedIds: ['seed-freedom-vs-reality'],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-august',
    month: 8,
    title: lt('August \u2014 Friendship, Community, and Hip Hop Foundations'),
    focus:
      'Community, play, and the roots of hip hop. Friendship Day and late-summer creativity meet hip hop block-party culture \u2014 exploring how music builds community, why fun and celebration matter, and how block parties helped create hip hop.',
    essentialQuestions: [
      'What makes a good friend?',
      'How does music build community?',
      'Why are fun and celebration important?',
      'How did block parties help create hip hop?',
    ],
    suggestedArtists: [
      'DJ Kool Herc',
      'Grandmaster Flash',
      'Run-DMC',
      'Afrika Bambaataa',
      'A Tribe Called Quest',
    ],
    enduringUnderstandings: [
      'Hip hop emerged from creativity, community, and resourcefulness.',
      'Foundational DJ and production techniques shape the sound of hip hop.',
      'Hip hop developed as a cultural response to social and economic conditions in New York City.',
    ],
    seedIds: [
      'seed-block-party-friendship-cypher',
      'seed-hip-hop-history-denver',
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-september',
    month: 9,
    title: lt('September \u2014 Hispanic Heritage, Autumn, and Local Culture'),
    focus:
      'Latino identity, migration, and rhythm traditions. Hispanic Heritage Month (begins Sept 15) and the Autumn Equinox \u2014 exploring how music carries cultural identity and how rhythm, language, and dance connect people to heritage and local community.',
    essentialQuestions: [
      'How does music carry cultural identity?',
      'What changes when seasons change?',
      'How do rhythm, language, and dance connect people to heritage?',
    ],
    suggestedArtists: ['Calle 13', 'Bad Bunny', 'Celia Cruz', 'Daddy Yankee'],
    enduringUnderstandings: [
      'Music can express migration, belonging, identity, and cultural pride.',
      'Rhythmic and stylistic characteristics are associated with Latin music traditions.',
      'Latino musical traditions have profoundly shaped contemporary music globally.',
    ],
    seedIds: [
      'seed-heritage-groove-lab',
      'seed-hispanic-heritage-kickoff',
      'seed-music-for-change',
      'seed-fall-soundscapes',
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-october',
    month: 10,
    title: lt(
      'October \u2014 Halloween, D\u00EDa de Muertos, Darkness, and Grief',
    ),
    focus:
      'Fear, memory, and atmosphere. Halloween and D\u00EDa de Muertos, LGBTQ+ History Month, and Hispanic Heritage Month\u2019s continuation \u2014 exploring how music helps us face fear, how people remember those who came before, and how sound design creates atmosphere.',
    essentialQuestions: [
      'How does music help us face fear?',
      'How do people remember ancestors and loved ones?',
      'What does grief sound like?',
      'How does sound design create atmosphere?',
      'How have LGBTQ+ artists shaped music and culture?',
    ],
    suggestedArtists: ['Hans Zimmer', 'John Carpenter', 'Metro Boomin'],
    enduringUnderstandings: [
      'Music can strongly influence emotional perception and tension.',
      'Producers and composers create suspense through rhythm, texture, dynamics, and harmony.',
      'Film scoring and hip hop production both shape emotional storytelling through sound.',
    ],
    seedIds: [
      'seed-ancestors-memory-dia-de-muertos',
      'seed-fear-darkness-sound-design',
      'seed-opera-liberation',
      'seed-dia-de-la-raza',
      'seed-halloween-sound-design',
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-november',
    month: 11,
    title: lt(
      'November \u2014 Indigenous Heritage, Light, Gratitude, and Voice',
    ),
    focus:
      'Heritage, gratitude, and civic voice. Native American Heritage Month, Diwali, Thanksgiving, and Election Day as winter approaches \u2014 exploring how music preserves heritage, how communities bring light into darkness, and how music participates in civic life.',
    essentialQuestions: [
      'How does music preserve cultural heritage?',
      'How do communities bring light into darkness?',
      'What does gratitude sound like when life is complicated?',
      'How does music participate in civic life and community values?',
    ],
    suggestedArtists: ['Stevie Wonder', 'Anderson .Paak', 'SZA'],
    enduringUnderstandings: [
      'Music can strengthen emotional connection and reflection.',
      'Certain musical elements create warmth and intimacy.',
      'Music often plays a central role in family gatherings and community rituals.',
    ],
    seedIds: [
      'seed-light-in-the-dark',
      'seed-election-day-voice-and-choice',
      'seed-native-american-heritage',
      'seed-veterans-day-music-service',
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },

  {
    id: 'theme-december',
    month: 12,
    title: lt(
      'December \u2014 Solstice, Kwanzaa, Holidays, Reflection, and Healing',
    ),
    focus:
      'Closure, healing, and future vision. Winter Solstice, Kwanzaa, Christmas, and Hanukkah \u2014 exploring how holidays bring people together or surface complicated feelings, how music and ritual help people survive winter, and what we want to carry into the next year.',
    essentialQuestions: [
      'What does reflection sound like?',
      'How do holidays bring people together or bring up complicated feelings?',
      'How do music and ritual help people survive winter?',
      'What do I want to carry forward into the next year?',
    ],
    suggestedArtists: [
      'Mac Miller',
      'Kanye West',
      'Kendrick Lamar',
      'Stevie Wonder',
    ],
    enduringUnderstandings: [
      'Music can support healing, reflection, and future visioning.',
      'Music can communicate personal experiences and emotions creatively.',
      'Artists often use music to process endings, transitions, and personal growth.',
    ],
    seedIds: [
      'seed-playlist-soundtrack-of-the-year',
      'seed-kwanzaa-principles-community',
      'seed-holiday-music-world',
      'seed-beethoven-motif-remix',
      'seed-human-rights-music',
      'seed-winter-soundscapes',
    ],
    source: 'canonical',
    createdBy: null,
    createdAt: CREATED_AT,
  },
];

export const RAW_THEMES = themes;
