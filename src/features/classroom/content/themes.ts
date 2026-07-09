import type { Theme } from './types';

export const THEMES: Theme[] = [
  {
    id: 'theme-january',
    month: 1,
    title: {
      en: 'Identity, Vision & Dreams',
      es: 'Identidad, Visión y Sueños',
    },
    focus:
      "Connect New Year intention with MLK's language of dreams, mentorship, and collective possibility. Explore blues as a structure for lived experience and the traditions of protest speech and community leadership.",
    essentialQuestions: [
      'Who am I right now, and who do I want to become?',
      'What does leadership look like when someone is flawed but still great?',
      'How can spoken word, music, and rhythm help people move toward change?',
    ],
    suggestedArtists: [
      'Kendrick Lamar',
      'Sam Cooke',
      'Nina Simone',
      'Common',
      'Andra Day',
      'Bill Withers',
    ],
    enduringUnderstandings: [
      'Music can inspire hope and collective action across every justice movement in American history.',
      'Blues is a structure for expressing lived experience, struggle, humor, and resilience.',
      'Civil rights speech, protest music, and hip hop are part of one continuous lineage of community voice.',
    ],
    seedIds: ['seed-vision-dream-cypher'],
    source: 'canonical',
  },
  {
    id: 'theme-february',
    month: 2,
    title: {
      en: 'Black History Month',
      es: 'Mes de la Historia Afroamericana',
    },
    focus:
      "Center Black artistry, resistance, and innovation as foundational forces in American music — tracing the Great Migration's sound map from Delta Blues to Chicago, Harlem, Detroit, Denver, and hip hop.",
    essentialQuestions: [
      "How does music carry people's stories across geography and generations?",
      'What happens when people migrate and bring their culture with them?',
      'What does it mean to be an ambassador for your community?',
    ],
    suggestedArtists: [
      'Nina Simone',
      'A Tribe Called Quest',
      'Lauryn Hill',
      'James Brown',
      'Duke Ellington',
      'Mahalia Jackson',
    ],
    enduringUnderstandings: [
      'Nearly every modern American popular music genre has deep roots in Black American musical traditions.',
      'The Great Migration was a sonic shift — carrying blues, gospel, jazz, and soul into new cities and new forms.',
    ],
    seedIds: ['seed-great-migration-sound-map'],
    source: 'canonical',
  },
  {
    id: 'theme-march',
    month: 3,
    title: {
      en: "Women's History Month",
      es: 'Mes de la Historia de las Mujeres',
    },
    focus:
      "Explore contributions of women artists whose voices and innovations shaped music history — from Billie Holiday's witness to injustice to the women who built jazz, blues, R&B, and hip hop.",
    essentialQuestions: [
      'Whose voices have been overlooked in music history, and why?',
      'How do women artists shape sound, identity, and culture?',
      'What does courage look like in artistic expression?',
    ],
    suggestedArtists: [
      'Billie Holiday',
      'Ella Fitzgerald',
      'Sarah Vaughan',
      'Missy Elliott',
      'Lauryn Hill',
      'H.E.R.',
      'Esperanza Spalding',
    ],
    enduringUnderstandings: [
      'The "canon" of music history reflects who had power to document it — not who did the most important work.',
      'Music can bear witness to injustice with restraint and gravity; silence and minimal texture can be as powerful as complexity.',
    ],
    seedIds: ['seed-women-who-changed-the-sound'],
    source: 'canonical',
  },
];
