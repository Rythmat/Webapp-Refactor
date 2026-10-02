import type { Song } from '@/curriculum/types/songLibrary';

export const lover: Song = {
  id: 'lover',
  title: 'Lover',
  artist: 'Taylor Swift',
  year: 2019,
  historicalDescription:
    "Taylor Swift releases 'Lover' as the lead single and title track of her seventh studio album, a breezy, romantic pop-rock declaration that signals a deliberate tonal shift away from the dark, reputation era. Soft and unguarded, the song marks Swift's return to vulnerability and joy, becoming an anthem of uncomplicated love in a cultural moment hungry for sincerity.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 69,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'electric-lady-studios' },
  credits: [
    { name: 'Taylor Swift', role: 'producer', artistGlobeId: 'taylor-swift' },
    {
      name: 'Jack Antonoff',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'jack-antonoff',
    },
    { name: 'Laura Sisk', role: 'engineer' },
    { name: 'Serban Ghenea', role: 'engineer' },
    { name: 'Jack Antonoff', role: 'producer', artistGlobeId: 'jack-antonoff' },
    {
      name: 'Jack Antonoff',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'jack-antonoff',
    },
    { name: 'Jack Antonoff', role: 'engineer', artistGlobeId: 'jack-antonoff' },
    {
      name: 'Taylor Swift',
      role: 'vocals',
      artistGlobeId: 'taylor-swift',
      primary: true,
    },
    {
      name: 'Jack Antonoff',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'jack-antonoff',
    },
    {
      name: 'Jack Antonoff',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'jack-antonoff',
    },
    { name: 'Taylor Swift', role: 'songwriter', artistGlobeId: 'taylor-swift' },
    {
      name: 'Jack Antonoff',
      role: 'performer',
      artistGlobeId: 'jack-antonoff',
    },
    {
      name: 'Jack Antonoff',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'jack-antonoff',
    },
    { name: 'John Hanes', role: 'engineer' },
  ],
  releases: [{ releaseId: 'taylor-swift-lover', track: 3 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'G/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7/3', chordName: 'Emin7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=-BjZmE2gtdo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/taylor-swift.webp',
  popularity: 50,
};
