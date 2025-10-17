import { generatePath } from 'react-router';

/**
 * Creates a route definition that can be used to generate a path or a URL.
 * @param path The path to create the route definition for.
 * @returns A route definition that can be used to generate a path or a URL.
 *
 * @example
 * const route = createRouteDefinition<{ id: string }, { page?: string }>(
 *   '/users/:id',
 * );
 * const path = route({ id: '123' }); // /users/123
 * const url = route({ id: '123' }, { page: '1' }); // /users/123?page=1
 */
export function createRouteDefinition<
  Params extends Record<string, string> | void = void,
  Query extends Record<string, string> = Record<string, string>,
>(path: string, options?: { prefix?: string }) {
  const { prefix } = options || {};

  let fullPath = prefix ? `${prefix}${path}` : path;

  fullPath = fullPath.replace(/\/{2,}/g, '/');

  return Object.assign(
    (params: Params, query?: Query) => {
      const generated = generatePath(fullPath, params || {});

      if (query) {
        return `${generated}?${new URLSearchParams(query).toString()}`;
      }

      return generated;
    },
    {
      definition: fullPath,
    },
  );
}
