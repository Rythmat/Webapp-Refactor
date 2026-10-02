import type { Song } from '@/curriculum/types/songLibrary';

export const _24k_magic: Song = {
  id: '24k_magic',
  title: '24k Magic',
  artist: 'Bruno Mars',
  year: 2016,

  historicalDescription:
    "Bruno Mars releases '24K Magic', a shimmering throwback to 1980s funk, R&B, and new jack swing that announces his full pivot away from acoustic balladry. The song captures a moment when nostalgia for the Prince and Rick James era floods pop radio, and Mars proves himself one of the few artists of his generation who can channel that era without pastiche. It sets the tone for an album that sweeps the Grammy Awards.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  session: { studioId: 'glenwood-place-studios' },
  credits: [
    { name: 'Bruno Mars', role: 'songwriter', artistGlobeId: 'bruno-mars' },
    {
      name: 'Shampoo Press & Curl',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'shampoo-press-and-curl',
    },
    { name: 'Byron “Mr. Talkbox” Chambers', role: 'performer' },
    {
      name: 'Bruno Mars',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'bruno-mars',
      primary: true,
    },
    { name: 'Brody Brown', role: 'songwriter', artistGlobeId: 'brody-brown' },
    {
      name: 'The Stereotypes',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'the-stereotypes',
    },
    { name: 'Dave Foreman', role: 'performer' },
    {
      name: 'Bruno Mars',
      role: 'performer',
      artistGlobeId: 'bruno-mars',
      primary: true,
    },
    {
      name: 'Philip Lawrence',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'philip-lawrence',
    },
    {
      name: 'Philip Lawrence',
      role: 'songwriter',
      artistGlobeId: 'philip-lawrence',
    },
    { name: 'Charles Moniz', role: 'engineer' },
    { name: 'Serban Ghenea', role: 'engineer' },
    {
      name: 'James Fauntleroy',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'james-fauntleroy',
    },
    { name: 'John Hanes', role: 'engineer' },
    {
      name: 'Brody Brown',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'brody-brown',
    },
  ],
  releases: [{ releaseId: 'bruno-mars-24k-magic' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min/2', chordName: 'Fmin/G', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C alt7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            {
              degree: '♭2 maj7',
              chordName: 'G♭maj7(♯11)',
              beat: 3,
              duration: 2,
            },
          ],
        },
        { chords: [], restBars: 2 },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F sus7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F sus7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F sus7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F sus7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C min7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '♭7 maj', chordName: 'E♭', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'F sus7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C min7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '♭7 maj', chordName: 'E♭', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭ min7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'C7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F sus7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UqyT8IEBkvY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bruno-mars.webp',
  popularity: 50,
};
