import { describe, expect, it } from 'vitest';
import { emailFromCredential } from '../credential';

/** An unsigned JWT-shaped token: only the payload matters to the hint reader. */
const token = (payload: unknown) =>
  [
    Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.');

const AUD = 'client-123.apps.googleusercontent.com';
const claims = {
  iss: 'https://accounts.google.com',
  aud: AUD,
  email: 'ada@gmail.com',
  email_verified: true,
  name: 'Ada Lovelace — Ω',
};

describe('emailFromCredential', () => {
  it('reads the email from a Google ID token', () => {
    expect(emailFromCredential(token(claims), AUD)).toBe('ada@gmail.com');
    expect(
      emailFromCredential(
        token({ ...claims, iss: 'accounts.google.com' }),
        AUD,
      ),
    ).toBe('ada@gmail.com');
    // No expected audience: the audience isn't checked.
    expect(emailFromCredential(token({ ...claims, aud: 'other' }))).toBe(
      'ada@gmail.com',
    );
  });

  it('ignores tokens that are not for this client or not from Google', () => {
    expect(emailFromCredential(token({ ...claims, aud: 'other' }), AUD)).toBe(
      null,
    );
    expect(
      emailFromCredential(token({ ...claims, iss: 'https://evil.test' }), AUD),
    ).toBe(null);
    expect(emailFromCredential(token({ ...claims, iss: undefined }), AUD)).toBe(
      null,
    );
  });

  it('ignores missing, unverified or malformed emails', () => {
    expect(
      emailFromCredential(token({ ...claims, email: undefined }), AUD),
    ).toBe(null);
    expect(emailFromCredential(token({ ...claims, email: 42 }), AUD)).toBe(
      null,
    );
    expect(
      emailFromCredential(token({ ...claims, email_verified: false }), AUD),
    ).toBe(null);
  });

  it('returns null for anything that is not a decodable token', () => {
    for (const bad of ['', 'abc', 'a.b', 'a.!!!.c', null, undefined, 7]) {
      expect(emailFromCredential(bad, AUD)).toBe(null);
    }
    const notJson = `x.${Buffer.from('not json').toString('base64url')}.y`;
    expect(emailFromCredential(notJson, AUD)).toBe(null);
  });
});
