# Music’s family tree — calibration report

Written by `src/components/atlas/data/lineage.calibration.test.ts` from
the bundled globe events. The lanes are the Globe timeline’s; each splits
from, or forms where two lanes meet, at its year. An event sits in the
lane its genres name — or, when it is older than that lane, on the
nearest ancestor flowing in its year. Edit the tree in
`src/components/atlas/data/lineage.ts`, then rewrite this file with
`npx vitest run src/components/atlas/data/lineage.calibration.test.ts --update`.

Events: 1725. On an ancestor, being older than their own lane: 11.

## Lanes, top to bottom

| Lane | Born | From | Joined later by | Genres | Events | Top genres |
| --- | ---: | --- | --- | --- | ---: | --- |
| Pop | 1910 | Stage & Screen | Rock (1956), R&B & Soul (1960) | Pop | 231 | Pop (211), Rock (95), R&B (20), Dance Pop (9), Electronic (7) |
| Stage & Screen | 1875 | Classical | — | Film Scoring, Musical Theatre, Jingles | 55 | Film Scoring (41), Classical (11), Jazz (11), Musical Theatre (9), Electronic (6) |
| Electronic | 1950 | Classical | Funk (1977) | Electronic | 59 | Electronic (47), House (7), Techno (7), Pop (6), EDM (4) |
| Classical | 560 | Roots & Folk | — | Classical | 101 | Classical (55), Opera (16), Sacred (10), Arabic Classical (9), Romantic (9) |
| Roots & Folk | 500 | — (the source) | — | Folk, African | 288 | Folk (122), Rock (30), Afro-Pop (15), Pop (14), Traditional (13) |
| Reggae | 1956 | Roots & Folk + R&B & Soul | — | Reggae | 62 | Reggae (39), Dancehall (12), Roots Reggae (8), Calypso (6), Reggae Pop (6) |
| Latin | 1900 | Roots & Folk | — | Latin | 70 | Reggaeton (13), Latin (11), Salsa (10), Latin Pop (9), Son Cubano (7) |
| Jazz | 1910 | Blues | — | Jazz | 84 | Jazz (76), Post-Bop (9), Bebop (8), Hard Bop (7), Pop (7) |
| Blues | 1895 | Roots & Folk | — | Blues | 53 | Blues (41), Chicago Blues (6), Blues Rock (5), Electric Blues (5), Desert Rock (4) |
| Jam Band | 1965 | Rock + Jazz | — | Jam Band | 36 | Jam Band (36), Funk (14), Rock (6), Electronica (5), Progressive Rock (5) |
| Rock | 1950 | Blues | Roots & Folk (1954) | Rock | 320 | Rock (221), Indie Rock (31), Alternative Rock (22), Punk (15), New Wave (12) |
| Metal | 1968 | Rock + Classical | — | any genre matching /metal/i | 14 | Heavy Metal (7), Metal (3), Alternative Rock (2), Thrash Metal (2), Alternative Metal (1) |
| R&B & Soul | 1940 | Blues | — | R&B | 66 | R&B (58), Soul (14), Gospel (6), Disco (3), Folk (2) |
| Neo Soul | 1994 | R&B & Soul + Hip Hop | — | Neo Soul | 40 | Neo Soul (40), R&B (25), Jazz (9), Funk (6), Electronic (5) |
| Funk | 1962 | R&B & Soul | — | Funk | 153 | Funk (152), Pop (26), R&B (26), Soul (11), Rock (7) |
| Hip Hop | 1973 | Funk + Reggae | — | Hip Hop | 93 | Hip Hop (89), Conscious Rap (9), Rap (9), Pop Rap (7), Electronic (6) |

## Lanes by era

| Lane | Ancient & Medieval | Renaissance & Baroque | Classical & Romantic | Early Modern | Postwar & Revolution | Electronic & Hip Hop | Global Digital |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pop | 0 | 0 | 0 | 1 | 47 | 61 | 122 |
| Stage & Screen | 0 | 0 | 1 | 8 | 17 | 9 | 20 |
| Electronic | 0 | 0 | 0 | 0 | 3 | 23 | 33 |
| Classical | 12 | 20 | 27 | 14 | 15 | 4 | 9 |
| Roots & Folk | 0 | 3 | 14 | 15 | 115 | 63 | 78 |
| Reggae | 0 | 0 | 0 | 0 | 26 | 19 | 17 |
| Latin | 0 | 0 | 0 | 6 | 34 | 15 | 15 |
| Jazz | 0 | 0 | 0 | 19 | 49 | 6 | 10 |
| Blues | 0 | 0 | 0 | 14 | 22 | 11 | 6 |
| Jam Band | 0 | 0 | 0 | 0 | 4 | 17 | 15 |
| Rock | 0 | 0 | 0 | 0 | 146 | 110 | 64 |
| Metal | 0 | 0 | 0 | 0 | 1 | 8 | 5 |
| R&B & Soul | 0 | 0 | 0 | 1 | 51 | 4 | 10 |
| Neo Soul | 0 | 0 | 0 | 0 | 0 | 4 | 36 |
| Funk | 0 | 0 | 0 | 0 | 105 | 32 | 16 |
| Hip Hop | 0 | 0 | 0 | 0 | 2 | 38 | 53 |

## Older than their lane

Drawn on the nearest ancestor flowing in their year.

| Year | Event | Genres name | Drawn on |
| ---: | --- | --- | --- |
| 1800 | Contradanza arrives: European dance meets African rhythm in Cuba | Latin | Roots & Folk |
| 1800 | Freed slaves return to Sierra Leone, carrying diaspora music | Reggae | Roots & Folk |
| 1879 | Miguel Faílde debuts the danzón — Cuba's national dance | Latin | Roots & Folk |
| 1895 | Lundu and maxixe: Afro-Brazilian rhythms enter the salon | Latin | Roots & Folk |
| 1914 | Calypso emerges from African kaiso traditions in Trinidad | Reggae | Roots & Folk |
| 1932 | Thomas Dorsey creates modern gospel music in Chicago | R&B & Soul | Blues |
| 1947 | Mento — rural Jamaican folk song takes the stage | Reggae | Roots & Folk |
| 1948 | HMT Windrush arrives: Caribbean music plants roots in Britain | Reggae | Roots & Folk |
| 1950 | Kumina and Revival traditions shape Jamaica's musical foundation | Reggae | Roots & Folk |
| 1951 | TASPO takes the steelpan to the Festival of Britain | Reggae | Roots & Folk |
| 1955 | Nemours Jean-Baptiste invents kompa direk | Reggae | Roots & Folk |

## Agreement with the authored files

Each events file was written around a genre; this is how many of its
events its genres file under that genre’s lanes, and where the rest go.

| File | Events | Expected | Agreement | Elsewhere |
| --- | ---: | --- | ---: | --- |
| african | 78 | Roots & Folk | 82.1% | Jazz (4), Pop (4), Blues (4), Latin (1), R&B & Soul (1) |
| blues | 43 | Blues | 100.0% | — |
| classical | 87 | Classical | 98.9% | Stage & Screen (1) |
| electronic | 47 | Electronic | 100.0% | — |
| folk | 147 | Roots & Folk | 100.0% | — |
| hiphop | 73 | Hip Hop | 100.0% | — |
| jamband | 35 | Jam Band | 97.1% | Metal (1) |
| jazz | 66 | Jazz | 98.5% | Roots & Folk (1) |
| latin | 78 | Latin | 83.3% | Roots & Folk (4), Rock (6), Pop (2), Reggae (1) |
| musicForMedia | 85 | Stage & Screen, Classical, Electronic | 88.2% | Metal (1), Pop (7), Rock (1), Hip Hop (1) |
| pop | 58 | Pop | 100.0% | — |
| reggae | 60 | Reggae | 98.3% | Electronic (1) |
| rnbSoulFunk | 95 | R&B & Soul, Funk, Neo Soul | 100.0% | — |
| rock | 126 | Rock, Metal | 98.4% | R&B & Soul (1), Pop (1) |

## Genres no lane claims

Only ever an event’s secondary genres: every event has a genre a lane
claims. Add one to `LANE_OVERRIDES` to file it.

Adult Contemporary (1), Afrofuturism (1), Banku (1), Compilation (1), Crossover (1), Diaspora (1), Downtempo (1), Easy Listening (1), Europop (1), Fijiri (1), Fula Music (1), Future Bass (1), Guaracha (1), Hyperpop (1), IDM (1), Improvisation (1), Jamgrass (1), Maskandi (1), Mestizo (1), Neo-Psychedelia (1), Orchestral (1), Power Ballad (1), Saxophone (1), Session Music (1), Shoegaze (1), Son Jarocho (1), Songhai (1), Spoken Word (1), Tejano (1), Tishoumaren (1), UK Garage (1), World (1), Yoruba (1), Yoruba Music (1)
