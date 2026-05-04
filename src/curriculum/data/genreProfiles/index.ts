import type { GenreProfile } from '../../types/genreProfile';
import { africanProfile } from './african';
import { bluesProfile } from './blues';
import { electronicProfile } from './electronic';
import { folkProfile } from './folk';
import { funkProfile } from './funk';
import { hipHopProfile } from './hiphop';
import { jamBandProfile } from './jamband';
import { jazzProfile } from './jazz';
import { latinProfile } from './latin';
import { neoSoulProfile } from './neosoul';
import { popProfile } from './pop';
import { reggaeProfile } from './reggae';
import { rnbProfile } from './rnb';
import { rockProfile } from './rock';

const GENRE_PROFILES: Record<string, GenreProfile> = {
  funk: funkProfile,
  jazz: jazzProfile,
  pop: popProfile,
  rock: rockProfile,
  blues: bluesProfile,
  rnb: rnbProfile,
  'neo-soul': neoSoulProfile,
  reggae: reggaeProfile,
  'hip hop': hipHopProfile,
  latin: latinProfile,
  african: africanProfile,
  electronic: electronicProfile,
  folk: folkProfile,
  'jam band': jamBandProfile,
};

export function getGenreProfile(slug: string): GenreProfile | null {
  return GENRE_PROFILES[slug] ?? null;
}
