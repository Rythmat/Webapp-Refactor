const ENV_KEYS = [
  'VITE_MUSIC_ATLAS_API_URL',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_AUTH0_AUDIENCE',
  'VITE_AUTH0_REDIRECT_URI',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];
type EnvValues = Record<EnvKey, string | undefined>;

const BUILD_TIME_ENV_VALUES: EnvValues = {
  VITE_MUSIC_ATLAS_API_URL: import.meta.env.VITE_MUSIC_ATLAS_API_URL,
  VITE_AUTH0_DOMAIN: import.meta.env.VITE_AUTH0_DOMAIN,
  VITE_AUTH0_CLIENT_ID: import.meta.env.VITE_AUTH0_CLIENT_ID,
  VITE_AUTH0_AUDIENCE: import.meta.env.VITE_AUTH0_AUDIENCE,
  VITE_AUTH0_REDIRECT_URI: import.meta.env.VITE_AUTH0_REDIRECT_URI,
};

export class Env {
  static get(key: EnvKey): string;
  static get(key: EnvKey, options: { nullable: true }): string | undefined;
  static get(key: EnvKey, options?: { nullable?: boolean }) {
    const value = BUILD_TIME_ENV_VALUES[key];

    if (!value && !options?.nullable) {
      throw new Error(`${key} is not set`);
    }

    return value;
  }

  static isDevelopment() {
    return import.meta.env.MODE === 'development';
  }
}
