// ── "Roots & Routes" — curated genre-genealogy journeys ───────────────────
// Hand-authored genealogies tracing how traditions influenced one another
// across regions and centuries — the core ethnomusicological view of musical
// diffusion (cf. the Atlas's influence-arc data, distilled into readable paths).

export interface RouteStep {
  label: string;
  region: string;
  note: string;
}

export interface RootsRoute {
  id: string;
  title: string;
  overview: string;
  steps: RouteStep[];
}

export const ROOTS_AND_ROUTES: RootsRoute[] = [
  {
    id: 'griot-to-hiphop',
    title: 'From Griot to Hip-Hop',
    overview:
      'How West African oral tradition, carried across the Atlantic, became the through-line of Black American music.',
    steps: [
      {
        label: 'Griot Traditions',
        region: 'West Africa',
        note: 'Hereditary jali storytellers and kora players — oral history sung as call-and-response.',
      },
      {
        label: 'Spirituals & Field Hollers',
        region: 'American South',
        note: 'Enslaved Africans forge new sacred and work songs, keeping African rhythm and blue notes.',
      },
      {
        label: 'Blues',
        region: 'Mississippi Delta',
        note: 'The 12-bar form crystallises around guitar, harmonica and a lone confessional voice.',
      },
      {
        label: 'Jazz',
        region: 'New Orleans',
        note: 'Blues meets brass, ragtime and Caribbean rhythm into an improviser’s art.',
      },
      {
        label: 'R&B & Soul',
        region: 'Detroit / Memphis',
        note: 'Gospel fervour electrifies rhythm & blues; Motown and Stax define the sound.',
      },
      {
        label: 'Hip-Hop',
        region: 'The Bronx, NYC',
        note: 'DJs loop the funk break; MCs return to the griot’s spoken word.',
      },
    ],
  },
  {
    id: 'roots-of-reggae',
    title: 'The Roots of Reggae',
    overview:
      'Jamaica’s fast evolution from African-rooted folk drumming to a global sound of resistance.',
    steps: [
      {
        label: 'Kumina & Nyabinghi',
        region: 'Jamaica',
        note: 'African-derived drumming and Rastafari chant hold the island’s rhythmic core.',
      },
      {
        label: 'Mento',
        region: 'Jamaica',
        note: 'Rural acoustic folk song, cousin to Trinidadian calypso.',
      },
      {
        label: 'Ska',
        region: 'Kingston',
        note: 'Post-independence energy: shuffling offbeats and jazzy horns.',
      },
      {
        label: 'Rocksteady',
        region: 'Kingston',
        note: 'The tempo drops, the bass steps forward, harmonies sweeten.',
      },
      {
        label: 'Reggae',
        region: 'Kingston',
        note: 'The one-drop groove and conscious lyrics carry Rastafari worldwide.',
      },
      {
        label: 'Dub & Dancehall',
        region: 'Kingston',
        note: 'Engineers remix the riddim into echo and space; the deejay takes centre stage.',
      },
    ],
  },
  {
    id: 'blues-family-tree',
    title: 'The Blues Family Tree',
    overview:
      'A single Delta tradition seeds most of 20th-century popular music.',
    steps: [
      {
        label: 'Work Songs & Hollers',
        region: 'American South',
        note: 'Communal labour song sets the call-and-response and bent pitches.',
      },
      {
        label: 'Delta Blues',
        region: 'Mississippi',
        note: 'Solo guitar and voice — Robert Johnson, Son House, Charley Patton.',
      },
      {
        label: 'Chicago Blues',
        region: 'Chicago',
        note: 'The Great Migration plugs the blues in: electric guitar, drums, harmonica.',
      },
      {
        label: 'Rock & Roll',
        region: 'Memphis / USA',
        note: 'Blues + country + gospel ignite a new backbeat-driven youth music.',
      },
      {
        label: 'Rock',
        region: 'USA & UK',
        note: 'British bands study the blues and hand it back louder and heavier.',
      },
    ],
  },
  {
    id: 'afro-cuban-currents',
    title: 'Afro-Cuban Currents',
    overview:
      'Yoruba and Bantu rhythms preserved in Cuba spread the clave across the Americas.',
    steps: [
      {
        label: 'Yoruba / Bantu Rhythm',
        region: 'West & Central Africa',
        note: 'Sacred bàtá and bembé rhythms survive in Afro-Cuban religion.',
      },
      {
        label: 'Son Cubano',
        region: 'Eastern Cuba',
        note: 'Spanish guitar and African percussion lock into the clave.',
      },
      {
        label: 'Mambo & Cha-Cha',
        region: 'Havana',
        note: 'Big-band arrangements make the son swing on the dance floor.',
      },
      {
        label: 'Salsa',
        region: 'New York',
        note: 'Cuban and Puerto Rican musicians in NYC refashion son into a pan-Latin sound.',
      },
    ],
  },
  {
    id: 'sacred-to-soul',
    title: 'Sacred to Soul',
    overview: 'The path from the Black church to the secular dance floor.',
    steps: [
      {
        label: 'Spirituals',
        region: 'American South',
        note: 'Coded songs of faith and freedom among the enslaved.',
      },
      {
        label: 'Gospel',
        region: 'USA',
        note: 'Thomas Dorsey fuses blues feeling with sacred text; the choir soars.',
      },
      {
        label: 'Soul',
        region: 'Detroit / Memphis',
        note: 'Gospel technique meets worldly lyrics — Ray Charles, Aretha Franklin.',
      },
      {
        label: 'Funk',
        region: 'USA',
        note: 'James Brown puts everything "on the one" — rhythm becomes the message.',
      },
    ],
  },
  {
    id: 'andean-voices',
    title: 'Andean Voices',
    overview:
      'Indigenous highland music becomes a continental voice of protest.',
    steps: [
      {
        label: 'Indigenous Andean',
        region: 'Andes',
        note: 'Siku panpipes, kena flutes and huayno rhythms of Quechua and Aymara peoples.',
      },
      {
        label: 'Andean Folk Revival',
        region: 'Bolivia / Peru',
        note: 'The charango and ensemble folklore bring highland song to the cities.',
      },
      {
        label: 'Nueva Canción',
        region: 'Chile / Latin America',
        note: 'Víctor Jara and Violeta Parra turn folk roots into a movement for justice.',
      },
    ],
  },
];
