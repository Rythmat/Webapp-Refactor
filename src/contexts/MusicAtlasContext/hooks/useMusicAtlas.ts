import { useContext } from 'react';
import { MusicAtlasContext } from '../MusicAtlasContext';

export const useMusicAtlas = () => {
  return useContext(MusicAtlasContext);
};
