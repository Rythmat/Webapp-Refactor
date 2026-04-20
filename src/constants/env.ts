const ENV_KEYS = [
  'VITE_MUSIC_ATLAS_API_URL',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_AUTH0_AUDIENCE',
  'VITE_AUTH0_REDIRECT_URI',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_PARTYKIT_HOST',
  'VITE_TELEMETRY_ENABLED',
  'VITE_TELEMETRY_AUDIO_ENABLED',
  'VITE_TELEMETRY_ROUTING_ENABLED',
  'VITE_TELEMETRY_SAMPLING_RATE',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];
type EnvValues = Record<EnvKey, string | undefined>;

const BUILD_TIME_ENV_VALUES: EnvValues = {
  VITE_MUSIC_ATLAS_API_URL: import.meta.env.VITE_MUSIC_ATLAS_API_URL,
  VITE_AUTH0_DOMAIN: import.meta.env.VITE_AUTH0_DOMAIN,
  VITE_AUTH0_CLIENT_ID: import.meta.env.VITE_AUTH0_CLIENT_ID,
  VITE_AUTH0_AUDIENCE: import.meta.env.VITE_AUTH0_AUDIENCE,
  VITE_AUTH0_REDIRECT_URI: import.meta.env.VITE_AUTH0_REDIRECT_URI,
  VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  VITE_PARTYKIT_HOST: import.meta.env.VITE_PARTYKIT_HOST,
  VITE_TELEMETRY_ENABLED: import.meta.env.VITE_TELEMETRY_ENABLED,
  VITE_TELEMETRY_AUDIO_ENABLED: import.meta.env.VITE_TELEMETRY_AUDIO_ENABLED,
  VITE_TELEMETRY_ROUTING_ENABLED: import.meta.env.VITE_TELEMETRY_ROUTING_ENABLED,
  VITE_TELEMETRY_SAMPLING_RATE: import.meta.env.VITE_TELEMETRY_SAMPLING_RATE,
};

export class Env {
  static get(key: EnvKey): string;
  static get(key: EnvKey, options: { nullable: true }): string | undefined;
  static get(key: EnvKey, options?: { nullable?: boolean }) {
    const value = BUILD_TIME_ENV_VALUES[key];

    if (!value && !options?.nullable) {
      throw new Error(`${key} is not set`);
    }

    return value?.replace(/\/+$/, '');
  }

  static isDevelopment() {
    return import.meta.env.MODE === 'development';
  }
}
