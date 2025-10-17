type UTMParams = {
  /**
   * What part of the UI is the click coming from.
   */
  utm_medium: string;
  /**
   * Is the click coming from a specific campaign?
   */
  utm_campaign?: string;
};

/**
 * Creates a link definition that can be used to generate a link or a URL.
 * @param path The path to create the link definition for.
 * @returns A link definition that can be used to generate a link or a URL.
 *
 * @example
 * const link = createLinkDefinition<{ utm_source?: string }>(
 *   'https://music-atlas.io/help',
 * );
 * const link = link({ utm_source: 'google' }); // https://music-atlas.io/help?utm_source=google
 * const url = link({ utm_source: 'google' }); // https://music-atlas.io/help?utm_source=google
 */
export function createLinkDefinition<
  Query extends Record<string, string> = Record<string, string>,
>(path: string, options?: { prefix?: string }) {
  const { prefix } = options || {};

  let fullPath = prefix ? `${prefix}${path}` : path;

  fullPath = fullPath.replace(/\/{2,}/g, '/');

  if (fullPath.endsWith('/')) {
    fullPath = fullPath.slice(0, -1);
  }

  return Object.assign(
    (query: Query & UTMParams) => {
      return `${fullPath}?${new URLSearchParams({
        utm_source: 'webapp',
        ...query,
      }).toString()}`;
    },
    {
      definition: path,
    },
  );
}
