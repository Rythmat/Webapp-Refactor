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
});
