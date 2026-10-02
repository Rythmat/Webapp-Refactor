/**
 * An unsigned JWT with the claims the app's tokens carry (decodeToken.ts
 * reads `role` and `user_id`). The mock, like jwt-decode, never checks the
 * signature, so this is enough to act as a given role in a test.
 */
export const sessionToken = (claims: { role: string; user_id: string }) => {
  const part = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${part({ alg: 'none', typ: 'JWT' })}.${part(claims)}.test`;
};
