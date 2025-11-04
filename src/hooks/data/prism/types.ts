import type { Api } from '@/contexts/MusicAtlasContext';

type MusicRoutes = Api<unknown>['music'];

export type PrismChordName = Parameters<MusicRoutes['getPrismChordsByName']>[0];
export type PrismModeSlug = Parameters<MusicRoutes['getPrismModesByMode']>[0];
export type PrismModeFamily = Parameters<MusicRoutes['getPrismModesFamilyByFamily']>[0];
