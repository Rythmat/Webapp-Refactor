/**
 * Module-level store for the current app session ID.
 * Used by raw fetch-based API modules (progressApi, experienceApi) that
 * don't go through the Axios-based generated client.
 */

let currentAppSessionId: string | null = null;

export const setCurrentAppSessionId = (id: string | null) => {
  currentAppSessionId = id;
};

export const getCurrentAppSessionId = () => currentAppSessionId;
