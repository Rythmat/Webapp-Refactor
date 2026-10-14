# Music streams — calibration report

Written by `src/components/atlas/data/streams.calibration.test.ts` from the
bundled globe events. The streams are the lanes of the Globe’s timeline;
an event is drawn in the stream of its first genre that one claims.
Edit the table in `src/components/atlas/data/streams.ts`, then rewrite
this file with `npx vitest run -u src/components/atlas/data/streams.calibration.test.ts`.

Events: 1725. In more than one stream: 434 (25.2%).

## Streams

| Stream | Courses | Events | Share | Top genres |
| --- | --- | ---: | ---: | --- |
| Roots & Folk | Folk, African, Latin, Reggae | 420 | 24.3% | Folk (126), Reggae (40), Rock (33), Pop (18), Afro-Pop (15), Reggaeton (15) |
| Classical, Stage & Screen | Classical, Film Scoring, Musical Theatre, Jingles | 156 | 9.0% | Classical (66), Film Scoring (41), Opera (16), Jazz (13), Electronic (11), Sacred (10) |
| Blues, Jazz & Soul | Blues, Jazz, R&B, Neo Soul, Funk | 396 | 23.0% | Funk (163), R&B (112), Jazz (90), Blues (45), Neo Soul (40), Pop (37) |
| Rock & Pop | Rock, Pop, Jam Band | 600 | 34.8% | Rock (322), Pop (217), Jam Band (37), Indie Rock (32), Alternative Rock (26), R&B (25) |
| Hip Hop & Electronic | Hip Hop, Electronic | 153 | 8.9% | Hip Hop (90), Electronic (54), Conscious Rap (9), Rap (9), House (7), Pop (7) |

## Streams by era

| Stream | Ancient & Medieval | Renaissance & Baroque | Classical & Romantic | Early Modern | Postwar & Revolution | Electronic & Hip Hop | Global Digital |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Roots & Folk | 0 | 3 | 14 | 21 | 175 | 97 | 110 |
| Classical, Stage & Screen | 12 | 20 | 28 | 22 | 32 | 13 | 29 |
| Blues, Jazz & Soul | 0 | 0 | 0 | 34 | 227 | 57 | 78 |
| Rock & Pop | 0 | 0 | 0 | 1 | 198 | 196 | 205 |
| Hip Hop & Electronic | 0 | 0 | 0 | 0 | 5 | 61 | 87 |

## Agreement with the authored files

Each events file was written around one genre; this is how many of its
events land in that genre’s stream, and where the rest go.

| File | Events | Expected stream | Agreement | Elsewhere |
| --- | ---: | --- | ---: | --- |
| african | 78 | Roots & Folk | 83.3% | Blues · Jazz · Soul (9), Rock & Pop (4) |
| blues | 43 | Blues, Jazz & Soul | 100.0% | — |
| classical | 87 | Classical, Stage & Screen | 100.0% | — |
| electronic | 47 | Hip Hop & Electronic | 100.0% | — |
| folk | 147 | Roots & Folk | 100.0% | — |
| hiphop | 73 | Hip Hop & Electronic | 100.0% | — |
| jamband | 35 | Rock & Pop | 100.0% | — |
| jazz | 66 | Blues, Jazz & Soul | 98.5% | Roots (1) |
| latin | 78 | Roots & Folk | 89.7% | Rock & Pop (8) |
| musicForMedia | 85 | Classical, Stage & Screen | 78.8% | Beats (10), Rock & Pop (8) |
| pop | 58 | Rock & Pop | 100.0% | — |
| reggae | 60 | Roots & Folk | 98.3% | Beats (1) |
| rnbSoulFunk | 95 | Blues, Jazz & Soul | 100.0% | — |
| rock | 126 | Rock & Pop | 99.2% | Blues · Jazz · Soul (1) |

## Genres no stream claims

Only ever an event’s secondary genres: every event has a first genre a
stream claims. Add one to `STREAM_OVERRIDES` to file it.

Adult Contemporary (1), Afrofuturism (1), Banku (1), Compilation (1), Crossover (1), Diaspora (1), Downtempo (1), Easy Listening (1), Europop (1), Fijiri (1), Fula Music (1), Future Bass (1), Guaracha (1), Hyperpop (1), IDM (1), Improvisation (1), Jamgrass (1), Maskandi (1), Mestizo (1), Neo-Psychedelia (1), Orchestral (1), Power Ballad (1), Saxophone (1), Session Music (1), Shoegaze (1), Son Jarocho (1), Songhai (1), Spoken Word (1), Tejano (1), Tishoumaren (1), UK Garage (1), World (1), Yoruba (1), Yoruba Music (1)

## For the owner

- **Latin and Reggae** flow into Roots & Folk. They could be a lane of
  their own (“Caribbean & Latin”), at the cost of a sixth lane.
- **Gospel** flows into Blues, Jazz & Soul (through R&B), not Classical.
- **Film scoring, musical theatre and jingles** share the Classical lane;
  on their own they would be a thin lane of about 55 events.
- **Funk and Disco** sit with Blues, Jazz & Soul, not Rock & Pop.
