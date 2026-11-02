import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// Each guided lesson is its own chunk, by the id it has in the catalog.

export const LESSON_PAGES: Readonly<
  Record<string, LazyExoticComponent<ComponentType>>
> = {
  'hear-the-kit': lazy(() => import('./lessons/hear-the-kit')),
  'decibels-and-faders': lazy(() => import('./lessons/decibels-and-faders')),
  'gain-staging': lazy(() => import('./lessons/gain-staging')),
};
