/* eslint-disable */
/**
 * Music Atlas Teacher — Idea Bank (v1.2)
 *
 * Browsable reference material, NOT structured lessons. Pure inspiration:
 * copy-to-notes, no apply. See SPEC_v1.2_ThemeBank.md §5c.
 *
 * Sourced from Music Bridge IMPACT lesson materials under MOU. "Music Bridge"
 * appears in engineering docs only — never in user-facing copy or identifiers.
 *
 * Shape is a single object with reference sections. The Idea Bank drawer renders
 * these as browsable, copyable inspiration accessible from the Theme panel and
 * the Lesson Seed Bank.
 */

const ideaBank = {

  /* Recurring lesson formats — reusable structures usable in any month. */
  recurringFormats: [
    {
      id: 'format-artist-birthday-spotlight',
      title: 'Artist Birthday Spotlight',
      description:
        'Students explore an artist whose birthday falls near the lesson date. Introduce the artist\u2019s biography, style, cultural context, and one or two key works; students identify musical traits and create a short response.',
      possibleUses: [
        'Quick 10-minute opener',
        'Full artist spotlight',
        'Beatmaking sample flip',
        'Songwriting prompt',
        'Visual artist poster project',
      ],
      createOptions: [
        'Write 4\u20138 bars inspired by the artist\u2019s message.',
        'Create a beat using one stylistic element from the artist.',
        'Design a concert poster or album cover.',
        'Reimagine one musical idea in a new genre.',
      ],
      enduringUnderstandings: [
        'An artist\u2019s music can be described by how it makes us feel and why.',
        'A musical or lyrical trait can define an artist\u2019s style.',
        'An artist\u2019s work connects to their time, community, and cultural influence.',
      ],
    },
    {
      id: 'format-album-song-anniversary',
      title: 'Album / Song Anniversary',
      description:
        'Students examine a significant album or song released near the lesson date \u2014 lyrical themes, production choices, historical impact, social context, or influence on later artists.',
      createOptions: [
        'Make a 30-second beat inspired by the original production style.',
        'Write a new verse that responds to the song\u2019s theme today.',
        'Compare the song\u2019s message to a current event.',
        'Create a \u201Cthen vs now\u201D listening map.',
      ],
      enduringUnderstandings: [
        'A song or album can still connect emotionally with listeners long after release.',
        'Production, lyric, groove, and arrangement choices shape a recording.',
        'A song or album reflects its historical moment.',
      ],
    },
  ],

  /* Slide-deck template — the classic Artist / Theme Spotlight arc, for teachers
     who want a familiar slide structure (now launched live into Atlas modules). */
  slideDeckTemplate: {
    title: 'Artist / Theme Spotlight',
    slides: [
      { slide: 1, title: 'Title', content: 'Artist, theme, date, and essential question.' },
      { slide: 2, title: 'Quick Context', content: 'Who, where, when, and why this matters.' },
      { slide: 3, title: 'Listen Closely', content: 'Song or clip with 2\u20133 listening questions.' },
      { slide: 4, title: 'Musical Elements', content: 'Rhythm, melody, harmony, texture, production, lyrics, form.' },
      { slide: 5, title: 'Cultural / Historical Connection', content: 'What was happening in the world, community, genre, or artist\u2019s life?' },
      { slide: 6, title: 'Create Prompt', content: 'Lyric, beat, soundscape, visual, or performance task.' },
      { slide: 7, title: 'Share / Reflect', content: 'Performance or discussion prompts.' },
    ],
  },

  /* Cross-cutting themes — usable any month as spotlights, prompts, beat concepts,
     discussion topics, or project units. */
  crossCuttingThemes: [
    {
      category: 'Identity and Inner Life',
      items: ['Who am I?', 'Nature and nurture', 'Hurt and healing', 'Love: romance, heartbreak, family', 'Spirituality and religion', 'Peace: outer and inner', 'Life and death'],
    },
    {
      category: 'Society and Power',
      items: ['Democracy and government', 'Hypocrisy', 'Making money', 'Economic models and capitalism', 'Ethnicity, race, and culture', 'Threat level and fear', 'Technology'],
    },
    {
      category: 'Community and Relationships',
      items: ['Friendship', 'Family', 'Neighborhood and community', 'Lineages and ancestors', 'Distance, proximity, travel, and migration'],
    },
    {
      category: 'Culture and Expression',
      items: ['Stardom and fame', 'Clothing, fashion, and bling', 'Dance and movement', 'Fun, leisure, and entertainment', 'Music in TV, movies, and gaming'],
    },
    {
      category: 'Environment and Place',
      items: ['Nature, city, home, toxins, elements', 'The earth and the universe', 'Weather, darkness, endings, and renewal'],
    },
  ],

  /* Content threads — connect any lesson theme to student lives and relevance. */
  contentThreads: [
    'Student individual life experiences and circumstances',
    'Current events in the news',
    'Local social contexts',
    'Historical context',
    'Family, community, and cultural history',
    'Future possibilities, projections, hopes, and fears',
    'Musical artists, albums, and songs',
    'Music in TV, movies, gaming, and social media',
  ],

  /* Activity types — modes of engagement to mix into any lesson. */
  activityTypes: [
    { name: 'Questions', description: 'Use essential questions to invite reflection and personal connection.' },
    { name: 'Discussions', description: 'Use listening-based discussion to connect emotion, technique, and context.' },
    { name: 'Listening', description: 'Use intentional listening, mood mapping, lyric analysis, and stylistic identification.' },
    { name: 'Writing Assignments', description: 'Use hooks, 4-bar verses, spoken word, reflections, captions, letters, and playlist notes.' },
    { name: 'Musical Group Practice', description: 'Use body percussion, call-and-response, groove building, chord progressions, blues, clave, and cyphers.' },
    { name: 'Individual and Collaborative Projects', description: 'Use beatmaking, cover art, playlist slides, posters, soundscapes, lyrics, and short performances.' },
    { name: 'Teacher-Led Production', description: 'The teacher builds a beat live from student ideas, historical samples, or stylistic references.' },
    { name: 'Musical Analysis', description: 'Analyze rhythm, harmony, melody, texture, form, production, lyric content, and cultural context.' },
  ],

  /* Anthem Bank — songs supporting resilience, unity, hustle, identity, joy,
     and social consciousness, plus a ready prompt. */
  anthemBank: {
    songs: [
      'Rick Ross \u2014 \u201CEveryday I\u2019m Hustlin\u2019\u201D',
      'Brand Nubian \u2014 \u201CAll for One\u201D',
      'Kendrick Lamar \u2014 \u201CAlright\u201D',
      'The Roots \u2014 \u201CWhat They Do\u201D',
      'Queen Latifah \u2014 \u201CU.N.I.T.Y.\u201D',
      'Linda Sol \u2014 \u201CWoah!\u201D',
      'Janelle Mon\u00E1e \u2014 \u201CFloat\u201D',
      'Bruno Mars \u2014 \u201CUptown Funk\u201D',
      '2Pac \u2014 \u201CKeep Ya Head Up\u201D',
    ],
    prompt: 'What makes a song an anthem?',
    createOptions: [
      'Write a hook for a class anthem.',
      'Compare personal anthems and community anthems.',
      'Create a beat designed for a group chant.',
      'Design cover art for an anthem about resilience.',
    ],
    enduringUnderstandings: [
      'A song can create energy, pride, confidence, or unity.',
      'Hooks, repetition, groove, and arrangement choices make a song memorable.',
      'Anthems connect to identity, movement, community, and culture.',
    ],
  },

};

export const RAW_IDEA_BANK = ideaBank;
