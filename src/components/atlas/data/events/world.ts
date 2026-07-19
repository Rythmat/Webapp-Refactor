import type { HistoricalEvent } from '@/components/atlas/types';

export const WORLD_EVENTS: HistoricalEvent[] = [
  {
    id: 'evt-maluf-tripoli-1960',
    year: 1960,
    location: { lat: 32.9022, lng: 13.18, city: 'Tripoli', country: 'Libya' },
    genre: ["Ma'luf", 'Arabic Classical'],
    title: "Hassan Araibi leads Libya's golden age of ma'luf",
    description:
      "Singer and oud master Hassan Araibi becomes Libya's most celebrated musician, performing ma'luf — the Libyan branch of Andalusian classical music — on national radio. His ornate vocal style and virtuosic oud playing define Tripoli's pre-revolution cultural golden era.",
    tags: [
      'hassan araibi',
      'maluf',
      'oud',
      'tripoli',
      'libyan music',
      'andalusian',
      'radio tripoli',
      'arabic classical',
    ],
  },
  {
    id: 'evt-reggae-espanol-panamacity-1985',
    year: 1985,
    location: {
      lat: 8.9824,
      lng: -79.5199,
      city: 'Panama City',
      country: 'Panama',
    },
    genre: ['Reggae en Espa\u00f1ol', 'Dancehall'],
    title: 'El General pioneers reggae en espa\u00f1ol in Panama',
    description:
      'Edgardo "El General" Franco and other Panamanian artists begin translating Jamaican dancehall into Spanish over sound system culture in Panama City\'s West Indian immigrant neighborhoods. El General\'s "Tu Pum Pum" becomes an international hit. This Spanish-language dancehall \u2014 called reggae en espa\u00f1ol \u2014 is the direct precursor to reggaeton, which would later crystallize in Puerto Rico.',
    tags: [
      'el general',
      'tu pum pum',
      'reggae en espanol',
      'dancehall',
      'panama music',
      'west indian',
      'dembow',
      'reggaeton origins',
    ],
    videoId: 'EMc0tq0HwVM',
  },
  {
    id: 'evt-nueva-cancion-santiago-1969',
    year: 1969,
    location: {
      lat: -33.4489,
      lng: -70.6693,
      city: 'Santiago',
      country: 'Chile',
    },
    genre: ['Nueva Canci\u00f3n', 'Folk'],
    title:
      'V\u00edctor Jara and the nueva canci\u00f3n movement transform Latin American music',
    description:
      "V\u00edctor Jara, Violeta Parra, Inti-Illimani, and Quilapay\u00fan create nueva canci\u00f3n chilena \u2014 a movement fusing Andean folk instruments with politically committed lyrics that becomes the musical voice of Salvador Allende's Popular Unity movement. After the 1973 coup, Jara is murdered in the Estadio Chile, and his songs become global anthems of resistance and human rights.",
    tags: [
      'victor jara',
      'violeta parra',
      'inti-illimani',
      'quilapayun',
      'nueva cancion',
      'allende',
      'protest music',
      'estadio chile',
    ],
    videoId: 'uAi8hK6_2z4',
  },
  // source: wiki/topics/andalusian-music.md · Filip Holm — https://youtu.be/_RoV2A4_FK4
  {
    id: 'evt-ziryab-cordoba-822',
    year: 822,
    location: {
      lat: 37.8882,
      lng: -4.7794,
      city: 'C\u00f3rdoba',
      country: 'Spain',
    },
    genre: ['Andalusian Classical', 'Arabic Classical'],
    title: 'Ziryab founds the Andalusian classical tradition in C\u00f3rdoba',
    description:
      'The 9th-century musician Ziryab, trained in the Baghdad court school under Ishaq al-Mawsili, emigrates west to Umayyad C\u00f3rdoba and establishes what may be the first true school of music in European history. He popularizes the oud \u2014 ancestor of the European lute and guitar \u2014 and grafts the Baghdad court style onto al-Andalus, founding the Andalusian classical tradition and making C\u00f3rdoba one of the three great centers of music in the Islamic world alongside Baghdad and Medina.',
    tags: [
      'ziryab',
      'andalusian',
      'oud',
      'cordoba',
      'al-andalus',
      'baghdad court',
      'lute',
      'arabic classical',
    ],
    videoId: '_RoV2A4_FK4',
  },
  // source: wiki/topics/middle-eastern-music.md · Filip Holm — https://youtu.be/JIEmnNiXBCk
  {
    id: 'evt-urmawi-baghdad-1250',
    year: 1250,
    location: { lat: 33.3152, lng: 44.3661, city: 'Baghdad', country: 'Iraq' },
    genre: ['Maqam', 'Arabic Classical'],
    title:
      'Safi al-Din al-Urmawi systematizes the 17-tone maqam system in Baghdad',
    description:
      'In 13th-century Baghdad, musicologist Safi al-Din al-Urmawi systematizes the existing maqam modal system \u2014 inherited from al-Kindi, al-Farabi, and Ibn Sina \u2014 into a unified theory in his Kitab al-Adwar (Book of Modes). He divides the octave into 17 unequal intervals, formalizing the quarter-tones of Middle Eastern music, and writes the first known music notation in the Islamic world using letters and numbers. His framework proved so foundational that the tradition is split into pre- and post-Urmawi, shaping Arabic, Persian, Ottoman, and Hindustani music for centuries.',
    tags: [
      'safi al-din al-urmawi',
      'maqam',
      'kitab al-adwar',
      '17-tone',
      'quarter tones',
      'baghdad',
      'microtonal',
      'music notation',
    ],
    videoId: 'JIEmnNiXBCk',
  },
];
