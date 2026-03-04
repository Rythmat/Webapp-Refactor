import { useAudioEngine } from './hooks/useAudioEngine';
import { SynthLayout } from './components/layout/SynthLayout';
import styles from './App.module.css';

function App() {
  const { engineRef, isReady, initEngine } = useAudioEngine();

  if (!isReady) {
    return (
      <div className={styles.splash} onClick={initEngine}>
        <h1>ORACLE</h1>
        <p>Click to initialize audio engine</p>
      </div>
    );
  }

  return (
    <SynthLayout engine={engineRef.current!} engineRef={engineRef} />
  );
}

export default App;
