import React from 'react';
import { SynthEngine } from '../../audio/SynthEngine';
import { SubOscillatorModule } from '../modules/SubOscillatorModule';
import { OscillatorModule } from '../modules/OscillatorModule';
import { FilterModule } from '../modules/FilterModule';
import { EnvelopeModule } from '../modules/EnvelopeModule';
import { NoiseModule } from '../modules/NoiseModule';
import styles from './SourceRow.module.css';

interface SourceRowProps {
  engine: SynthEngine;
}

export const SourceRow: React.FC<SourceRowProps> = React.memo(({ engine }) => {
  const osc1Analyser = engine.getOscAnalyser(0);
  const osc2Analyser = engine.getOscAnalyser(1);
  const noiseAnalyser = engine.getNoiseAnalyser();
  const liveFilter1 = engine.getFilter(0);
  const liveFilter2 = engine.getFilter(1);

  return (
    <div className={styles.row}>
      <SubOscillatorModule />
      <OscillatorModule index={0} accent="#e87070" analyser={osc1Analyser} />
      <OscillatorModule index={1} accent="#d05050" analyser={osc2Analyser} />
      <FilterModule index={0} accent="#e8a040" liveFilter={liveFilter1} />
      <FilterModule index={1} accent="#d08830" liveFilter={liveFilter2} />
      <EnvelopeModule index={0} accent="#e8c840" />
      <EnvelopeModule index={1} accent="#d0b030" />
      <NoiseModule analyser={noiseAnalyser} />
    </div>
  );
});
