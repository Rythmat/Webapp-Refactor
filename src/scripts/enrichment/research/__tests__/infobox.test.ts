import { describe, expect, it } from 'vitest';
import {
  findInfobox,
  listItems,
  parseBirthDate,
  parsePlace,
  parseYearsActive,
  saysGroup,
} from '../infobox';

const PERSON = `{{Short description|American singer}}
{{Infobox musical artist
| name = Beyoncé
| image = Beyonce.jpg <!-- a comment -->
| birth_name = Beyoncé Giselle Knowles
| birth_date = {{birth date and age|1981|9|4}}
| birth_place = [[Houston]], [[Texas]], U.S.
| occupation = {{flatlist|
* Singer
* songwriter
}}
| genre = {{hlist|[[Contemporary R&B|R&B]]|[[Pop music|pop]]|[[Hip hop music|hip hop]]}}
| instrument = Vocals<ref>{{cite web|url=x}}</ref>
| years_active = 1990–present
| label = {{flatlist|[[Columbia Records|Columbia]]}}
}}
'''Beyoncé Giselle Knowles-Carter''' is an American singer.`;

const BAND = `{{Infobox musical artist
| name = The Beatles
| background = group_or_band
| origin = [[Liverpool]], England
| genre = {{flatlist|
* [[Rock music|Rock]]
* [[Pop music|pop]]
* [[Beat music|beat]]
}}
| years_active = 1960–1970
| past_members = John Lennon
}}`;

const EMBEDDED = `{{Infobox person
| name = Prince
| birth_date = {{Birth date|1958|06|07}}
| birth_place = [[Minneapolis]], Minnesota, U.S.
| occupation = Musician
| module = {{Infobox musical artist|embed=yes
| genre = Funk
| instrument = {{hlist|Vocals|[[Guitar]]|[[Bass guitar|bass]]}}
| years_active = 1975–2016
}}
}}`;

describe('findInfobox', () => {
  it('reads a musical artist box, refs and comments stripped', () => {
    const box = findInfobox(PERSON)!;
    expect(box.template).toBe('musical artist');
    expect(box.params.image).toBe('Beyonce.jpg');
    expect(box.params.instrument).toBe('Vocals');
    expect(box.params.name).toBe('Beyoncé');
  });

  it('merges a musical artist box embedded in a person box', () => {
    const box = findInfobox(EMBEDDED)!;
    expect(box.params.genre).toBe('Funk');
    expect(box.params.birth_place).toContain('Minneapolis');
    expect(box.params.years_active).toBe('1975–2016');
  });

  it('returns null without an infobox', () => {
    expect(findInfobox("'''X''' is a thing.")).toBeNull();
  });
});

describe('listItems', () => {
  it('unwraps hlist, flatlist and links', () => {
    const genres = listItems(findInfobox(PERSON)!.params.genre);
    expect(genres.map((g) => g.text)).toEqual(['R&B', 'pop', 'hip hop']);
    expect(genres[0].link?.target).toBe('Contemporary R&B');
    const band = listItems(findInfobox(BAND)!.params.genre);
    expect(band.map((g) => g.link?.target)).toEqual([
      'Rock music',
      'Pop music',
      'Beat music',
    ]);
  });

  it('splits plain commas and <br>', () => {
    expect(listItems('Vocals, guitar<br />piano').map((i) => i.text)).toEqual([
      'Vocals',
      'guitar',
      'piano',
    ]);
  });
});

describe('parseBirthDate', () => {
  it.each([
    ['{{birth date and age|1981|9|4}}', '1981-09-04'],
    ['{{Birth date|df=yes|1958|06|07}}', '1958-06-07'],
    ['{{birth year and age|1950}}', '1950'],
    ['{{birth date and age|1942|11}}', '1942-11'],
    ['May 5, 1988', '1988-05-05'],
    ['5 May 1988', '1988-05-05'],
    ['1934', '1934'],
    ['c. 1940', null],
    ['{{birth date|1990|2|30}}', null],
  ])('%s → %s', (input, expected) => {
    expect(parseBirthDate(input)).toBe(expected);
  });
});

describe('parseYearsActive', () => {
  it.each([
    ['1960–1970', { from: 1960, to: 1970 }],
    ['1990–present', { from: 1990, to: null }],
    ['1963–1970, 2003–present', { from: 1963, to: null }],
    ['{{hlist|1968–1980|2007}}', { from: 1968, to: 2007 }],
    ['1970s–present', null],
    ['1950s–1980', { from: null, to: 1980 }],
    ['1965–{{as of|2015|alt=present}}', { from: 1965, to: null }],
    ['1965–', { from: 1965, to: null }],
    ['1965', { from: 1965, to: null }],
    ['1213–1284', { from: 1213, to: 1284 }],
  ])('%s', (input, expected) => {
    expect(parseYearsActive(input)).toEqual(expected);
  });
});

describe('parsePlace', () => {
  it('keeps the links in order and the written parts', () => {
    const place = parsePlace('[[Houston]], [[Texas]], U.S.')!;
    expect(place.links.map((l) => l.target)).toEqual(['Houston', 'Texas']);
    expect(place.parts).toEqual(['Houston', 'Texas', 'U.S.']);
  });

  it('takes the first of several places', () => {
    const place = parsePlace(
      '[[Kingston, Jamaica|Kingston]], Jamaica<br>[[London]]',
    )!;
    expect(place.links[0]).toEqual({
      target: 'Kingston, Jamaica',
      label: 'Kingston',
    });
    expect(place.parts).toEqual(['Kingston', 'Jamaica']);
  });
});

describe('saysGroup', () => {
  it('reads background and the members fields', () => {
    expect(saysGroup(findInfobox(BAND)!)).toBe(true);
    expect(saysGroup(findInfobox(PERSON)!)).toBe(false);
  });
});
