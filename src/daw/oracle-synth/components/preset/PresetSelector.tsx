import React, { useState, useCallback, useRef } from 'react';
import { useSynthStore } from '../../store';
import styles from './PresetSelector.module.css';

export const PresetSelector: React.FC = React.memo(() => {
  const presetName = useSynthStore((s) => s.presetName);
  const isDirty = useSynthStore((s) => s.isDirty);
  const loadPreset = useSynthStore((s) => s.loadPreset);
  const savePreset = useSynthStore((s) => s.savePreset);
  const exportPreset = useSynthStore((s) => s.exportPreset);
  const importPreset = useSynthStore((s) => s.importPreset);
  const getPresetList = useSynthStore((s) => s.getPresetList);
  const initPreset = useSynthStore((s) => s.initPreset);

  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = getPresetList();

  const handleSelect = useCallback(
    (name: string) => {
      loadPreset(name);
      setIsOpen(false);
    },
    [loadPreset],
  );

  const handleSave = useCallback(() => {
    if (saveName.trim()) {
      savePreset(saveName.trim().toUpperCase());
      setShowSaveDialog(false);
      setSaveName('');
    }
  }, [saveName, savePreset]);

  const handleExport = useCallback(() => {
    const json = exportPreset();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presetName.toLowerCase().replace(/\s+/g, '-')}.oracle.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }, [exportPreset, presetName]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const json = reader.result as string;
        importPreset(json);
      };
      reader.readAsText(file);
      e.target.value = '';
      setIsOpen(false);
    },
    [importPreset],
  );

  return (
    <div className={styles.container}>
      {/* Preset name button */}
      <button
        className={styles.presetButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.presetName}>
          {isDirty ? `${presetName} *` : presetName}
        </span>
        <span className={styles.arrow}>{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {/* Action buttons */}
      <button
        className={styles.actionButton}
        onClick={() => {
          setShowSaveDialog(true);
          setSaveName(presetName);
        }}
        title="Save preset"
      >
        SAVE
      </button>
      <button
        className={styles.actionButton}
        onClick={initPreset}
        title="Initialize preset"
      >
        INIT
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.sectionLabel}>FACTORY</div>
          {presets
            .filter((p) => p.isFactory)
            .map((p) => (
              <button
                key={p.name}
                className={`${styles.presetItem} ${p.name === presetName ? styles.active : ''}`}
                onClick={() => handleSelect(p.name)}
              >
                {p.name}
              </button>
            ))}

          {presets.some((p) => !p.isFactory) && (
            <>
              <div className={styles.sectionLabel}>USER</div>
              {presets
                .filter((p) => !p.isFactory)
                .map((p) => (
                  <button
                    key={p.name}
                    className={`${styles.presetItem} ${p.name === presetName ? styles.active : ''}`}
                    onClick={() => handleSelect(p.name)}
                  >
                    {p.name}
                  </button>
                ))}
            </>
          )}

          <div className={styles.divider} />
          <button className={styles.presetItem} onClick={handleExport}>
            EXPORT...
          </button>
          <button className={styles.presetItem} onClick={handleImport}>
            IMPORT...
          </button>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setShowSaveDialog(false)}
          />
          <div className={styles.saveDialog}>
            <span className={styles.sectionLabel}>SAVE PRESET</span>
            <input
              className={styles.saveInput}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              placeholder="Preset name..."
              autoFocus
            />
            <div className={styles.saveActions}>
              <button
                className={styles.actionButton}
                onClick={() => setShowSaveDialog(false)}
              >
                CANCEL
              </button>
              <button
                className={`${styles.actionButton} ${styles.primary}`}
                onClick={handleSave}
              >
                SAVE
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.oracle.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
});
