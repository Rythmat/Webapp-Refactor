// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetSessionEntitiesForTests } from '../../entities/sessionEntities';
import { LabelFields } from '../LabelFields';
import {
  type Body,
  clearPicker,
  pick,
  renderEditor,
  seed,
  type,
  without,
} from './harness';

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: 'admin', token: null }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    isServed: () => false,
    isAuthoritative: () => false,
    feature: () => false,
    identityOf: () => 'slug',
  }),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  resetSessionEntitiesForTests();
});

const TAMLA: Body = {
  slug: 'tamla',
  name: 'Tamla',
  placeId: 'detroit',
  parentLabelId: 'motown',
  foundedYear: 1959,
  description: 'Motown’s first imprint.',
};

const seedLabels = () => {
  seed('label', 'motown', 'Motown');
  seed('label', 'tamla', 'Tamla');
  seed('label', 'gordy', 'Gordy');
};

describe('LabelFields', () => {
  it('renders a stored label without writing anything', () => {
    seedLabels();
    const { onChange } = renderEditor(LabelFields, TAMLA);
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Tamla');
    expect(screen.getByRole('button', { name: 'City' }).textContent).toBe(
      'Detroit',
    );
    expect(screen.getByRole('button', { name: 'Imprint of' }).textContent).toBe(
      'Motown',
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('patches only the edited field', () => {
    const { last, onChange } = renderEditor(LabelFields, TAMLA);
    type(screen.getByLabelText('Defunct'), '1988');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(last()).toStrictEqual({ ...TAMLA, defunctYear: 1988 });
  });

  it('removes cleared optional fields', async () => {
    seedLabels();
    const { last } = renderEditor(LabelFields, TAMLA);
    type(screen.getByLabelText('Description'), '');
    expect(last()).toStrictEqual(without(TAMLA, 'description'));
    await clearPicker(screen.getByRole('button', { name: 'Imprint of' }));
    expect(last()).toStrictEqual(
      without(TAMLA, 'description', 'parentLabelId'),
    );
  });

  it('writes the parent as a bare slug, and never itself', async () => {
    seedLabels();
    const { last, onChange } = renderEditor(LabelFields, TAMLA);
    await pick(
      screen.getByRole('button', { name: 'Imprint of' }),
      'Gordy',
      /Gordy/,
    );
    expect(last()).toStrictEqual({ ...TAMLA, parentLabelId: 'gordy' });

    const calls = onChange.mock.calls.length;
    await pick(
      screen.getByRole('button', { name: 'Imprint of' }),
      'Tamla',
      /Tamla/,
    );
    expect(onChange.mock.calls.length).toBe(calls);
    expect(
      screen.getByText('A label cannot be an imprint of itself.'),
    ).toBeTruthy();
  });

  it('writes its city as a bare place slug', async () => {
    const { last } = renderEditor(LabelFields, TAMLA);
    await pick(
      screen.getByRole('button', { name: 'City' }),
      'Memphis',
      /Memphis/,
    );
    expect(last()).toStrictEqual({ ...TAMLA, placeId: 'memphis' });
  });
});
