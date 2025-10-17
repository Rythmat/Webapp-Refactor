const ENV_VALUES = {
  VITE_MUSIC_ATLAS_API_URL: import.meta.env.VITE_MUSIC_ATLAS_API_URL,
};

export class Env {
  static get(key: keyof typeof ENV_VALUES, options?: { nullable?: boolean }) {
    const value = ENV_VALUES[key];

    if (!value && !options?.nullable) {
      throw new Error(`${key} is not set`);
    }

    return value;
  }

  static isDevelopment() {
    return import.meta.env.MODE === 'development';
  }
}
