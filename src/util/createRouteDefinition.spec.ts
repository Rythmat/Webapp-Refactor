import { describe, expect, it } from 'vitest';
import { createRouteDefinition } from './createRouteDefinition';

describe('createRouteDefinition', () => {
  it('should work', () => {
    const route = createRouteDefinition<{ id: string }, { page?: string }>(
      '/users/:id',
    );
    expect(route({ id: '123' })).toBe('/users/123');
    expect(
      route(
        { id: '123' },
        {
          page: '1',
        },
      ),
    ).toBe('/users/123?page=1');
  });

  it('leaves out query values that are undefined', () => {
    const route = createRouteDefinition<
      { id: string },
      { q?: string; page?: string }
    >('/users/:id');
    expect(route({ id: '123' }, { q: undefined, page: '2' })).toBe(
      '/users/123?page=2',
    );
    // Nothing left to say: no dangling "?".
    expect(route({ id: '123' }, { q: undefined })).toBe('/users/123');
    expect(route({ id: '123' }, {})).toBe('/users/123');
  });
});
