// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetSessionEntitiesForTests } from '../../entities/sessionEntities';
import { ArtistFields, BornFields } from '../ArtistFields';
import { fieldSelector } from '../shared';
import {
  type Body,
  clearPicker,
  pick,
  renderEditor,
  seed,
  type,
  without,
  wrap,
} from './harness';

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: null }),
}));
// The artist body level the server validates at: 2 takes `born`.
const caps = vi.hoisted(() => ({ artistLevel: 2 }));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    isServed: () => false,
    isAuthoritative: () => false,
    feature: () => false,
    identityOf: () => 'slug',
    schemaVersionOf: (kind: string) =>
      kind === 'artist' ? caps.artistLevel : 0,
  }),
}));

beforeAll(() => {
  // cmdk scrolls the active option into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  resetSessionEntitiesForTests();
  caps.artistLevel = 2;
});

const MARVIN: Body = {
  slug: 'marvin-gaye',
  name: 'Marvin Gaye',
  basedInPlaceId: 'detroit',
  activeFrom: 1961,
  activeTo: 1984,
  genreIds: ['rnb'],
  labelIds: ['tamla'],
  bio: 'Soul singer.',
  externalIds: { wikidata: 'Q43259' },
};

const TEMPTATIONS: Body = {
  slug: 'the-temptations',
  name: 'The Temptations',
  group: true,
  members: [{ artistId: 'david-ruffin', from: 1964, to: 1968 }],
};

/** The words an element's `aria-describedby` points at. */
const description = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent);

describe('ArtistFields', () => {
  it('renders a stored artist without writing anything', () => {
    seed('label', 'tamla', 'Tamla');
    const { onChange } = renderEditor(ArtistFields, MARVIN);
    expect(screen.getByLabelText('Name')).toHaveProperty(
      'value',
      'Marvin Gaye',
    );
    expect(screen.getByRole('button', { name: 'City' }).textContent).toBe(
      'Detroit',
    );
    expect(screen.getByLabelText('Active from')).toHaveProperty(
      'value',
      '1961',
    );
    expect(
      within(screen.getByRole('group', { name: 'Genres' })).getByText('R&B'),
    ).toBeTruthy();
    expect(
      within(screen.getByRole('group', { name: 'Labels' })).getByText('Tamla'),
    ).toBeTruthy();
    // The stored outside id is kept but never shown: the site names no
    // outside catalogue (owner decision of 30 September 2026).
    expect(screen.queryByText('External ids')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Q43259|Wikidata/);
    // Not a group, so no members; Born is there, empty, and writes nothing.
    expect(screen.queryByText('Members')).toBeNull();
    expect(screen.getByLabelText('Date of birth')).toHaveProperty('value', '');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('writes born into the record, and takes it out again', () => {
    const { last } = renderEditor(ArtistFields, MARVIN);
    type(screen.getByLabelText('Date of birth'), '1939-04-02');
    expect(last()).toStrictEqual({ ...MARVIN, born: { date: '1939-04-02' } });
    type(screen.getByLabelText('Date of birth'), '');
    expect(last()).toStrictEqual(MARVIN);
  });

  it('patches only the field that was edited', () => {
    const { onChange, last } = renderEditor(ArtistFields, MARVIN);
    type(screen.getByLabelText('Name'), 'Marvin Pentz Gay');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(last()).toStrictEqual({ ...MARVIN, name: 'Marvin Pentz Gay' });

    type(screen.getByLabelText('Active to'), '1983');
    expect(last()).toStrictEqual({
      ...MARVIN,
      name: 'Marvin Pentz Gay',
      activeTo: 1983,
    });
  });

  it('removes a cleared optional field rather than blanking it', () => {
    const { last } = renderEditor(ArtistFields, MARVIN);
    type(screen.getByLabelText('Bio'), '');
    expect(last()).toStrictEqual(without(MARVIN, 'bio'));
    type(screen.getByLabelText('Active to'), '');
    expect(last()).toStrictEqual(without(MARVIN, 'bio', 'activeTo'));
  });

  it('keeps a required name as an empty string, and ties the warning to it', () => {
    const { last } = renderEditor(ArtistFields, MARVIN);
    const name = screen.getByLabelText('Name');
    expect(name.getAttribute('aria-invalid')).toBeNull();
    type(name, '');
    expect(last()).toStrictEqual({ ...MARVIN, name: '' });
    expect(screen.getByText('Needs name.')).toBeTruthy();
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(description(name)).toContain('Needs name.');
  });

  it('does not report an edit that changes nothing', () => {
    const { onChange } = renderEditor(ArtistFields, MARVIN);
    type(screen.getByLabelText('Name'), 'Marvin Gaye');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('writes bare slugs from the pickers', async () => {
    const { last } = renderEditor(ArtistFields, MARVIN);

    await pick(
      screen.getByRole('button', { name: 'City' }),
      'Memphis',
      /Memphis/,
    );
    expect(last()).toStrictEqual({ ...MARVIN, basedInPlaceId: 'memphis' });

    await pick(
      within(screen.getByRole('group', { name: 'Genres' })).getByRole(
        'button',
        { name: 'Add genre' },
      ),
      'Soul',
      /^Soul/,
    );
    expect(last()).toStrictEqual({
      ...MARVIN,
      basedInPlaceId: 'memphis',
      genreIds: ['rnb', 'soul'],
    });

    await pick(
      within(screen.getByRole('group', { name: 'Instruments' })).getByRole(
        'button',
        { name: 'Add instrument' },
      ),
      'Piano',
      /^Piano/,
    );
    expect(last()).toStrictEqual({
      ...MARVIN,
      basedInPlaceId: 'memphis',
      genreIds: ['rnb', 'soul'],
      instrumentIds: ['piano'],
    });
  });

  it('names a subgenre’s genre by the genre’s own name', () => {
    renderEditor(ArtistFields, { ...MARVIN, genreIds: ['kwaito'] });
    const genres = within(screen.getByRole('group', { name: 'Genres' }));
    expect(genres.getByText('· Southern African')).toBeTruthy();
  });

  it('clears a place by removing the key', async () => {
    const { last } = renderEditor(ArtistFields, MARVIN);
    await clearPicker(screen.getByRole('button', { name: 'City' }));
    expect(last()).toStrictEqual(without(MARVIN, 'basedInPlaceId'));
  });

  it('writes group as true, and removes it rather than writing false', () => {
    const body: Body = { slug: 'the-miracles', name: 'The Miracles' };
    const { last } = renderEditor(ArtistFields, body);
    const toggle = screen.getByLabelText('A group or band, not one person');
    fireEvent.click(toggle);
    expect(last()).toStrictEqual({ ...body, group: true });
    expect(screen.getByText('Members')).toBeTruthy();
    fireEvent.click(toggle);
    expect(last()).toStrictEqual(body);
  });

  it('edits the record’s own flags one key at a time', () => {
    // A stored `unverified: false` is not canonical, but it is the owner's.
    const body: Body = { ...MARVIN, unverified: false, source: 'discogs' };
    const { last } = renderEditor(ArtistFields, body);
    const own = within(screen.getByRole('group', { name: 'This record' }));
    fireEvent.change(own.getByLabelText('Source'), {
      target: { value: 'wikipedia' },
    });
    expect(last()).toStrictEqual({ ...body, source: 'wikipedia' });
    fireEvent.click(own.getByLabelText('Unconfirmed'));
    expect(last()).toStrictEqual({
      ...body,
      source: 'wikipedia',
      unverified: true,
    });
    fireEvent.click(own.getByLabelText('Unconfirmed'));
    fireEvent.change(own.getByLabelText('Source'), { target: { value: '' } });
    expect(last()).toStrictEqual(without(body, 'unverified', 'source'));
  });

  it('adds members in RefRows, and never the group to itself', async () => {
    seed('artist', 'david-ruffin', 'David Ruffin');
    seed('artist', 'eddie-kendricks', 'Eddie Kendricks');
    const { last, onChange } = renderEditor(ArtistFields, TEMPTATIONS);

    await pick(
      screen.getByRole('button', { name: 'Add a member' }),
      'Eddie Kendricks',
      /Eddie Kendricks/,
    );
    expect(last()).toStrictEqual({
      ...TEMPTATIONS,
      members: [
        { artistId: 'david-ruffin', from: 1964, to: 1968 },
        { artistId: 'eddie-kendricks' },
      ],
    });

    type(screen.getByLabelText('Member 2 joined'), '1960');
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Member 2' })).getByLabelText(
        'Unconfirmed',
      ),
    );
    expect(last()).toStrictEqual({
      ...TEMPTATIONS,
      members: [
        { artistId: 'david-ruffin', from: 1964, to: 1968 },
        { artistId: 'eddie-kendricks', from: 1960, unverified: true },
      ],
    });

    // Clearing a member's year removes that key only.
    type(screen.getByLabelText('Member 1 left'), '');
    expect((last()?.members as Body[])[0]).toStrictEqual({
      artistId: 'david-ruffin',
      from: 1964,
    });

    const calls = onChange.mock.calls.length;
    await pick(
      screen.getByRole('button', { name: 'Add a member' }),
      'The Temptations',
      /The Temptations/,
    );
    expect(onChange.mock.calls.length).toBe(calls);
    // Read out as it appears, not only shown.
    expect(
      screen
        .getByText('A group cannot be its own member.')
        .closest('[role="status"]'),
    ).toBeTruthy();
  });

  it('changes a member in its row, refusing a duplicate or the group', async () => {
    seed('artist', 'david-ruffin', 'David Ruffin');
    seed('artist', 'eddie-kendricks', 'Eddie Kendricks');
    seed('artist', 'otis-williams', 'Otis Williams');
    const body: Body = {
      ...TEMPTATIONS,
      members: [
        { artistId: 'david-ruffin', from: 1964, to: 1968, source: '' },
        { artistId: 'otis-williams' },
      ],
    };
    const { last, onChange } = renderEditor(ArtistFields, body);

    // The row's other keys stay as they were, the blank source included.
    await pick(
      screen.getByRole('button', { name: 'Member 1' }),
      'Eddie Kendricks',
      /Eddie Kendricks/,
    );
    const changed: Body = {
      ...body,
      members: [
        { artistId: 'eddie-kendricks', from: 1964, to: 1968, source: '' },
        { artistId: 'otis-williams' },
      ],
    };
    expect(last()).toStrictEqual(changed);

    const calls = onChange.mock.calls.length;
    await pick(
      screen.getByRole('button', { name: 'Member 2' }),
      'Eddie Kendricks',
      /Eddie Kendricks/,
    );
    expect(screen.getByText('Already a member.')).toBeTruthy();
    await pick(
      screen.getByRole('button', { name: 'Member 2' }),
      'The Temptations',
      /The Temptations/,
    );
    expect(screen.getByText('A group cannot be its own member.')).toBeTruthy();
    expect(onChange.mock.calls.length).toBe(calls);

    // An edit that goes through clears the refusal.
    type(screen.getByLabelText('Member 2 joined'), '1960');
    expect(screen.queryByText('A group cannot be its own member.')).toBeNull();
    expect(last()).toStrictEqual({
      ...changed,
      members: [
        { artistId: 'eddie-kendricks', from: 1964, to: 1968, source: '' },
        { artistId: 'otis-williams', from: 1960 },
      ],
    });
  });

  it('removes the members key with the last member', () => {
    const { last } = renderEditor(ArtistFields, TEMPTATIONS);
    fireEvent.click(screen.getByRole('button', { name: 'Remove member 1' }));
    expect(last()).toStrictEqual(without(TEMPTATIONS, 'members'));
  });

  it('adds an influence as a reference with its own flags', async () => {
    const { last } = renderEditor(ArtistFields, MARVIN);
    await pick(
      screen.getByRole('button', { name: 'Add an influence' }),
      'Ray Charles',
      /Ray Charles/,
    );
    expect(last()).toStrictEqual({
      ...MARVIN,
      influencedBy: [{ artistId: 'ray-charles' }],
    });
    fireEvent.change(
      within(screen.getByRole('group', { name: 'Influence 1' })).getByLabelText(
        'Source',
      ),
      { target: { value: 'wikipedia' } },
    );
    expect(last()).toStrictEqual({
      ...MARVIN,
      influencedBy: [{ artistId: 'ray-charles', source: 'wikipedia' }],
    });
  });

  it('changes an influence in its row, refusing a duplicate or itself', async () => {
    const body: Body = {
      ...MARVIN,
      influencedBy: [
        { artistId: 'ray-charles', source: 'wikipedia' },
        { artistId: 'sam-cooke' },
      ],
    };
    const { last, onChange } = renderEditor(ArtistFields, body);
    await pick(
      screen.getByRole('button', { name: 'Influence 2' }),
      'Stevie Wonder',
      /Stevie Wonder/,
    );
    const changed: Body = {
      ...body,
      influencedBy: [
        { artistId: 'ray-charles', source: 'wikipedia' },
        { artistId: 'stevie-wonder' },
      ],
    };
    expect(last()).toStrictEqual(changed);

    const calls = onChange.mock.calls.length;
    await pick(
      screen.getByRole('button', { name: 'Influence 2' }),
      'Ray Charles',
      /Ray Charles/,
    );
    expect(screen.getByText('Already listed.')).toBeTruthy();
    await pick(
      screen.getByRole('button', { name: 'Influence 1' }),
      'Marvin Gaye',
      /Marvin Gaye/,
    );
    expect(
      screen.getByText('An artist cannot influence themselves.'),
    ).toBeTruthy();
    expect(onChange.mock.calls.length).toBe(calls);
    expect(last()).toStrictEqual(changed);
  });

  it('keeps a stored external id it does not show', () => {
    const { last } = renderEditor(ArtistFields, MARVIN);
    expect(screen.queryByRole('link', { name: /Open/ })).toBeNull();
    type(screen.getByLabelText('Name'), 'Marvin Pentz Gay');
    expect(last()?.externalIds).toStrictEqual(MARVIN.externalIds);
  });
});

describe('BornFields', () => {
  it('writes a date and a birthplace, and goes when both are cleared', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      wrap(<BornFields value={undefined} group={false} onChange={onChange} />),
    );
    type(screen.getByLabelText('Date of birth'), '1939-04-02');
    expect(onChange).toHaveBeenLastCalledWith({ date: '1939-04-02' });

    rerender(
      wrap(
        <BornFields
          value={{ date: '1939-04-02', placeId: 'washington-dc' }}
          group={false}
          onChange={onChange}
        />,
      ),
    );
    type(screen.getByLabelText('Date of birth'), '');
    expect(onChange).toHaveBeenLastCalledWith({ placeId: 'washington-dc' });

    rerender(
      wrap(
        <BornFields
          value={{ date: '1939' }}
          group={false}
          onChange={onChange}
        />,
      ),
    );
    type(screen.getByLabelText('Date of birth'), '');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('goes with its date even when it carries a source', () => {
    // An import always writes `source` into born (suggestions/apply.ts).
    const onChange = vi.fn();
    const imported = { date: '1939', source: 'wikidata' };
    const { rerender } = render(
      wrap(<BornFields value={imported} group={false} onChange={onChange} />),
    );
    const born = within(screen.getByRole('group', { name: 'Born' }));
    fireEvent.click(born.getByLabelText('Unconfirmed'));
    expect(onChange).toHaveBeenLastCalledWith({
      ...imported,
      unverified: true,
    });

    rerender(
      wrap(<BornFields value={imported} group={false} onChange={onChange} />),
    );
    type(screen.getByLabelText('Date of birth'), '');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('asks a group for the year it formed', () => {
    render(
      wrap(<BornFields value={{ date: '19' }} group onChange={() => {}} />),
    );
    expect(screen.getByText('Formed')).toBeTruthy();
    expect(screen.getByLabelText('Year formed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Birthplace' })).toBeNull();
    expect(
      screen.getByText(
        'Write a year, a year and month, or a full date: 1939, 1939-04 or 1939-04-02.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'The year the band formed. Where it formed is its City.',
      ),
    ).toBeTruthy();
  });

  it.each([
    ['1939', null],
    ['1939-04', null],
    ['1939-04-02', null],
    ['1939-4-2', /^Write a year/],
    ['1939-13', /^Write a year/],
    [' 1939', /^Write a year/],
    ['1939-02-30', '1939-02-30 is not a date the calendar has.'],
    ['0000', '0000 is not a date the calendar has.'],
    ['2999', '2999 is still to come.'],
  ])('checks the date %j as the API and the calendar do', (date, problem) => {
    render(
      wrap(<BornFields value={{ date }} group={false} onChange={() => {}} />),
    );
    const field = screen.getByLabelText('Date of birth');
    if (problem === null) {
      expect(field.getAttribute('aria-invalid')).toBeNull();
    } else {
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('status').textContent).toMatch(problem);
    }
  });

  it('keeps its flags off until there is a date or a place', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      wrap(<BornFields value={undefined} group={false} onChange={onChange} />),
    );
    const born = () => within(screen.getByRole('group', { name: 'Born' }));
    expect(born().getByLabelText('Unconfirmed')).toHaveProperty(
      'disabled',
      true,
    );
    expect(born().getByLabelText('Source')).toHaveProperty('disabled', true);
    rerender(
      wrap(
        <BornFields
          value={{ placeId: 'washington-dc' }}
          group={false}
          onChange={onChange}
        />,
      ),
    );
    expect(born().getByLabelText('Unconfirmed')).toHaveProperty(
      'disabled',
      false,
    );
    fireEvent.click(born().getByLabelText('Unconfirmed'));
    expect(onChange).toHaveBeenLastCalledWith({
      placeId: 'washington-dc',
      unverified: true,
    });
  });

  it('anchors the field under born, born.date and born.placeId', () => {
    const { container } = render(
      wrap(<BornFields value={undefined} group={false} onChange={() => {}} />),
    );
    for (const path of ['born', 'born.date', 'born.placeId']) {
      expect(
        container.querySelector(fieldSelector(path))?.textContent,
        path,
      ).toContain('Born');
    }
  });

  it('tells a group that its birthplace is not read', () => {
    render(
      wrap(
        <BornFields
          value={{ date: '1977', placeId: 'los-angeles' }}
          group
          onChange={() => {}}
        />,
      ),
    );
    expect(
      screen.getByText(/birthplace is not read: where it formed is its City/),
    ).toBeTruthy();
  });

  it('is shown, not edited, on a server that refuses it', () => {
    caps.artistLevel = 1;
    const onChange = vi.fn();
    render(
      wrap(
        <BornFields
          value={{ date: '1939-04-02' }}
          group={false}
          onChange={onChange}
        />,
      ),
    );
    // Disabled by its fieldset, as the whole row is.
    expect(screen.getByLabelText('Date of birth').matches(':disabled')).toBe(
      true,
    );
    expect(screen.getByText(/artist schema 2; this one is at 1/)).toBeTruthy();
    expect(
      screen.getByText(
        'This server refuses an artist with Born: remove it to save.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Born' }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('asks nothing of an artist with no Born on such a server', () => {
    caps.artistLevel = 1;
    render(
      wrap(<BornFields value={undefined} group={false} onChange={() => {}} />),
    );
    // Disabled by its fieldset, as the whole row is.
    expect(screen.getByLabelText('Date of birth').matches(':disabled')).toBe(
      true,
    );
    expect(screen.queryByRole('button', { name: 'Remove Born' })).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');
  });
});

describe('Born beside Group', () => {
  it('says so when ticking Group turns a birth into a forming', () => {
    renderEditor(ArtistFields, { ...MARVIN, born: { date: '1939-04-02' } });
    fireEvent.click(screen.getByLabelText('A group or band, not one person'));
    expect(
      screen.getByText(
        'Born 1939-04-02 now reads as the year the band formed, and a birthplace is not read for a band.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Formed')).toBeTruthy();
  });

  it('reads a record with members as a group, as the graph does', () => {
    renderEditor(ArtistFields, {
      slug: 'toto',
      name: 'Toto',
      members: [{ artistId: 'jeff-porcaro' }],
      born: { date: '1977' },
    });
    expect(screen.getByText('Formed')).toBeTruthy();
    expect(
      screen.getByText(
        'It lists members, so the graph already reads it as a group.',
      ),
    ).toBeTruthy();
  });
});
