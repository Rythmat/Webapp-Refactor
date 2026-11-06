import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// Each guided lesson is its own chunk, by the id it has in the catalog.

export const LESSON_PAGES: Readonly<
  Record<string, LazyExoticComponent<ComponentType>>
> = {
  'physics-of-sound': lazy(() => import('./lessons/physics-of-sound')),
  'hear-the-kit': lazy(() => import('./lessons/hear-the-kit')),
  'decibels-and-faders': lazy(() => import('./lessons/decibels-and-faders')),
  'mic-to-speaker': lazy(() => import('./lessons/mic-to-speaker')),
  'gain-staging': lazy(() => import('./lessons/gain-staging')),
};
