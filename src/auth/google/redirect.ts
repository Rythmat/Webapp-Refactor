/** Full-page navigation, in its own module so tests can mock it (jsdom's `location.assign` can't be spied on). */
export const redirectTo = (url: string) => {
  window.location.assign(url);
};
