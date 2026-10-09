import { vi } from 'vitest';
import type {
  GisButtonConfiguration,
  GisId,
  GisIdConfiguration,
} from '@/auth/google/gis';

/** A fake `google.accounts.id` whose button draws an iframe, like the real one. */
export const installFakeGis = () => {
  const gis = {
    initialize: vi.fn<(config: GisIdConfiguration) => void>(),
    prompt: vi.fn(),
    cancel: vi.fn(),
    renderButton: vi.fn(
      (parent: HTMLElement, _options: GisButtonConfiguration) => {
        parent.appendChild(document.createElement('iframe'));
      },
    ),
    disableAutoSelect: vi.fn(),
  } satisfies GisId;
  window.google = { accounts: { id: gis } };
  return {
    gis,
    /** The config of the latest `initialize` call. */
    lastConfig: () => gis.initialize.mock.calls.at(-1)?.[0],
    /** Answers as GIS would after a pick. */
    respond: (credential: string, select_by = 'user') =>
      gis.initialize.mock.calls.at(-1)?.[0].callback?.({
        credential,
        select_by,
      }),
  };
};

/** An unsigned Google-ID-token-shaped credential. */
export const fakeCredential = (email: string, aud: string) =>
  [
    btoa(JSON.stringify({ alg: 'RS256' })),
    btoa(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        aud,
        email,
        email_verified: true,
      }),
    )
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_'),
    'sig',
  ].join('.');
