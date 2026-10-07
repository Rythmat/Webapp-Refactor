/**
 * validateConnection's DEV-only path for local `partykit dev`: the web app's
 * dev bypass token is accepted only when the room vars set PARTYKIT_DEV_AUTH=1
 * AND the socket was opened to a loopback host. Anything else still needs a
 * verified Auth0 token (none is configured here, so those cases fail closed).
 */
import { describe, expect, it } from 'vitest';
import { validateConnection } from './auth';

const DEV_ENV = { PARTYKIT_DEV_AUTH: '1' };

const urlFor = (host: string, token: string) =>
  `http://${host}/parties/main/studio-abc12345?role=editor&token=${token}`;

describe('validateConnection — DEV auth path', () => {
  it('accepts the dev bypass token on a local partykit dev', async () => {
    for (const host of ['localhost:1999', '127.0.0.1:1999', '[::1]:1999']) {
      await expect(
        validateConnection(urlFor(host, 'dev-bypass-token'), DEV_ENV),
      ).resolves.toEqual({ userId: 'dev-bypass-user', role: 'editor' });
    }
  });

  it('ignores the flag on a deployed host', async () => {
    await expect(
      validateConnection(
        urlFor('music-atlas-collab.example.partykit.dev', 'dev-bypass-token'),
        DEV_ENV,
      ),
    ).resolves.toBeNull();
  });

  it('rejects the dev bypass token when the flag is not set', async () => {
    await expect(
      validateConnection(urlFor('localhost:1999', 'dev-bypass-token'), {}),
    ).resolves.toBeNull();
    await expect(
      validateConnection(urlFor('localhost:1999', 'dev-bypass-token'), {
        PARTYKIT_DEV_AUTH: '0',
      }),
    ).resolves.toBeNull();
  });

  it('accepts no other token through the flag', async () => {
    await expect(
      validateConnection(urlFor('localhost:1999', 'forged'), DEV_ENV),
    ).resolves.toBeNull();
    await expect(
      validateConnection(
        'http://localhost:1999/parties/main/studio-abc12345?role=editor',
        DEV_ENV,
      ),
    ).resolves.toBeNull();
  });
});
