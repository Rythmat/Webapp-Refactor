import type { Song } from '@/curriculum/types/songLibrary';

export const jesus_etc: Song = {
  id: 'jesus_etc',
  title: 'Jesus Etc.',
  artist: 'Wilco',
  year: 2002,
  historicalDescription:
    "Wilco releases 'Jesus Etc.' as part of their landmark album Yankee Hotel Foxtrot, a record so unconventional that their label refuses to release it — leading the band to stream it free online before it becomes one of the most acclaimed albums of the decade. The song's tender, chamber-pop fragility, anchored by Leroy Bach's string arrangement, stands in quiet contrast to the album's experimental noise and dissonance. It captures a band reinventing American rock on their own terms.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Wilco', role: 'producer', ensemble: true, artistGlobeId: 'wilco' },
    { name: 'Jeff Tweedy', role: 'songwriter', artistGlobeId: 'jeff-tweedy' },
    { name: 'Jeff Tweedy', role: 'vocals', artistGlobeId: 'jeff-tweedy' },
    { name: 'Jay Bennett', role: 'songwriter', artistGlobeId: 'jay-bennett' },
    { name: 'Jim O’Rourke', role: 'engineer' },
  ],
  releases: [{ releaseId: 'wilco-yankee-hotel-foxtrot', track: 5 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '3 maj/♯5', chordName: 'A/C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '3 maj/♯5', chordName: 'A/C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '3 maj/♯5', chordName: 'A/C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '3 maj/♯5', chordName: 'A/C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '3 maj/♯5', chordName: 'A/C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '3 maj/♯5', chordName: 'A/C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'C/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=v4_O4Sj-XTs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/wilco.webp',
  popularity: 50,
};
