// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateEntityDialog } from '../CreateEntityDialog';
import type { PickerKind } from '../entityKinds';

/**
 * What the create dialog decides for the author, which should be nothing: a
 * place is a pin only where the picker says so (a birthplace is not), Format
 * and Region are chosen, not defaulted, and a kind the console cannot see in
 * full is not created without the server's create-only save.
 */

const api = vi.hoisted(() => ({
  saves: [] as {
    kind: string;
    body: Record<string, unknown>;
    status?: string;
  }[],
  create: true,
  store: 'api' as 'api' | 'repo',
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: null }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    isServed: () => true,
    isAuthoritative: () => false,
    feature: (name: string) => name === 'create' && api.create,
    identityOf: (kind: string) => (kind === 'globe_city' ? 'id' : 'slug'),
    store: api.store,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/data/admin/useAdminContent')
  >()),
  useSaveContentItem: () => ({
    mutateAsync: async (save: {
      kind: string;
      body: Record<string, unknown>;
    }) => {
      api.saves.push(save);
    },
    isPending: false,
    error: null,
  }),
}));

afterEach(() => {
  cleanup();
  api.saves = [];
  api.create = true;
  api.store = 'api';
});

const open = (kind: PickerKind, name: string, pin?: boolean) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CreateEntityDialog
        kind={kind}
        initialName={name}
        existing={[]}
        pin={pin}
        onCreated={() => {}}
        onClose={() => {}}
      />
    </QueryClientProvider>,
  );

const createButton = (label: string) =>
  screen.getByRole('button', { name: `Create ${label}` }) as HTMLButtonElement;

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: label }), {
    target: { value },
  });

describe('creating a place', () => {
  const fillPlace = () => {
    fill('Country', 'USA');
    fill('Latitude', '38.9');
    fill('Longitude', '-77.0');
  };

  it('asks for the region rather than assuming one', () => {
    open('place', 'Washington');
    fillPlace();
    expect((screen.getByLabelText('Region') as HTMLSelectElement).value).toBe(
      '',
    );
    expect(createButton('place').disabled).toBe(true);
    expect(createButton('place').title).toBe('Needs the region');
    fireEvent.change(screen.getByLabelText('Region'), {
      target: { value: 'north-america' },
    });
    expect(createButton('place').disabled).toBe(false);
  });

  it('starts as a pin by default, and not when the picker says so', async () => {
    open('place', 'Washington', false);
    const pin = screen.getByLabelText(
      'Show it as a pin on the globe',
    ) as HTMLInputElement;
    expect(pin.checked).toBe(false);
    fillPlace();
    fireEvent.change(screen.getByLabelText('Region'), {
      target: { value: 'north-america' },
    });
    fireEvent.click(createButton('place'));
    await vi.waitFor(() => expect(api.saves).toHaveLength(1));
    expect(api.saves[0].body).toMatchObject({ pin: false });

    cleanup();
    open('place', 'Detroit');
    expect(
      (
        screen.getByLabelText(
          'Show it as a pin on the globe',
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });
});

describe('creating a record', () => {
  it('asks for the format rather than assuming an album', () => {
    open('release', 'Toto IV');
    expect((screen.getByLabelText('Format') as HTMLSelectElement).value).toBe(
      '',
    );
    expect(createButton('record').title).toContain('a format');
  });
});

describe('a kind with no code registry', () => {
  it.each([
    ['studio', 'studio'],
    ['label', 'label'],
    ['release', 'record'],
  ] as const)(
    'is not created as a %s without a create-only save',
    (kind, label) => {
      api.create = false;
      open(kind, 'Sunset Sound');
      expect(
        screen.getByText(/without the risk of\s+overwriting one/),
      ).toBeTruthy();
      expect(createButton(label).disabled).toBe(true);
    },
  );

  it('is created as a label with one', async () => {
    open('label', 'Tamla');
    fireEvent.click(createButton('label'));
    await vi.waitFor(() => expect(api.saves).toHaveLength(1));
    expect(api.saves[0]).toMatchObject({
      kind: 'label',
      body: { slug: 'tamla', name: 'Tamla' },
      create: true,
    });
  });
});

describe('in repo mode', () => {
  it('says the record is written at once, and saves it published', async () => {
    api.store = 'repo';
    open('studio', 'Muscle Shoals Sound');
    expect(screen.getByText(/Written into its repo file at once/)).toBeTruthy();
    expect(screen.queryByText(/Saved as a draft/)).toBeNull();

    cleanup();
    open('place', 'Detroit');
    expect(
      screen.getByText(/as a pin in the globe’s cities: students see it/),
    ).toBeTruthy();
    fill('Country', 'USA');
    fill('Latitude', '42.3');
    fill('Longitude', '-83.0');
    fireEvent.change(screen.getByLabelText('Region'), {
      target: { value: 'north-america' },
    });
    fireEvent.click(createButton('place'));
    await vi.waitFor(() => expect(api.saves).toHaveLength(1));
    expect(api.saves[0].status).toBe('published');
  });

  it('keeps the draft wording against the content API', () => {
    open('studio', 'Muscle Shoals Sound');
    expect(screen.getByText(/Saved as a draft/)).toBeTruthy();
  });
});
