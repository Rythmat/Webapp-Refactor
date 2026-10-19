/** Focus back to the Library's search, where a cleared query leaves it. */
export function focusSearch(): void {
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>('[data-testid="library-search"]')
      ?.focus(),
  );
}
