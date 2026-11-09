import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { LabTopicProps } from './lab/LabLesson';

// Each topic is its own chunk, by the id it has in the catalog.

export const LAB_TOPIC_PAGES: Readonly<
  Record<string, LazyExoticComponent<ComponentType<LabTopicProps>>>
> = {
  waves: lazy(() => import('./labs/WavesLab')),
  compression: lazy(() => import('./labs/CompressionLab')),
  frequency: lazy(() => import('./labs/FrequencyLab')),
  amplitude: lazy(() => import('./labs/AmplitudeLab')),
  'strings-and-pipes': lazy(() => import('./labs/StringsAndPipesLab')),
  timbre: lazy(() => import('./labs/TimbreLab')),
  envelope: lazy(() => import('./labs/EnvelopeLab')),
  interference: lazy(() => import('./labs/InterferenceLab')),
  spectrum: lazy(() => import('./labs/SpectrumLab')),
  intervals: lazy(() => import('./labs/IntervalsLab')),
  ear: lazy(() => import('./labs/EarLab')),
  brain: lazy(() => import('./labs/BrainLab')),
  emotion: lazy(() => import('./labs/EmotionLab')),
  electricity: lazy(() => import('./labs/ElectricityLab')),
  electromagnetism: lazy(() => import('./labs/ElectromagnetismLab')),
  transducers: lazy(() => import('./labs/TransducersLab')),
  preamps: lazy(() => import('./labs/PreampsLab')),
  digital: lazy(() => import('./labs/DigitalLab')),
  amps: lazy(() => import('./labs/AmpsLab')),
  loudspeakers: lazy(() => import('./labs/LoudspeakersLab')),
  cables: lazy(() => import('./labs/CablesLab')),
};
