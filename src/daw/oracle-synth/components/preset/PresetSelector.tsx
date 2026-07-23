import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSynthStore } from '../../store';
import styles from './PresetSelector.module.css';

/**
 * Flip-aware fixed placement for the dropdown/save dialog, anchored to the
 * selector row. Rendered through a body portal because the selector lives
 * inside scroll containers (the DAW Controls strip) and transform-scaled
 * layouts (the pop-out) — an absolutely-positioned child would be clipped
 * by the former and a `position:fixed` child mis-anchored by the latter.
 * getBoundingClientRect returns post-transform screen coords, so anchoring
 * from it works in every host context.
 */
function computeMenuPlacement(anchor: DOMRect): React.CSSProperties {
  const spaceBelow = window.innerHeight - anchor.bottom;
  const spaceAbove = anchor.top;
  const openDown = spaceBelow >= 320 || spaceBelow >= spaceAbove;
  const maxHeight = Math.max(
    120,
    Math.min(360, (openDown ? spaceBelow : spaceAbove) - 8),
  );
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - 248));
  return openDown
    ? { position: 'fixed', left, top: anchor.bottom + 4, maxHeight }
    : {
        position: 'fixed',
        left,
        bottom: window.innerHeight - anchor.top + 4,
        maxHeight,
      };
}

export const PresetSelector: React.FC = React.memo(() => {
  const presetName = useSynthStore((s) => s.presetName);
  const isDirty = useSynthStore((s) => s.isDirty);
  const loadPreset = useSynthStore((s) => s.loadPreset);
  const savePreset = useSynthStore((s) => s.savePreset);
  const exportPreset = useSynthStore((s) => s.exportPreset);
  const importPreset = useSynthStore((s) => s.importPreset);
  const getPresetList = useSynthStore((s) => s.getPresetList);
  const initPreset = useSynthStore((s) => s.initPreset);

  const packDisplayName = useSynthStore((s) => s.packDisplayName);
  // Subscribe so the list refreshes when a pack registers after mount
  useSynthStore((s) => s.packPresets);

  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = getPresetList();
  const factoryPresets = presets.filter((p) => p.isFactory && !p.isPack);
  const packPresets = presets.filter((p) => p.isPack);
  const userPresets = presets.filter((p) => !p.isFactory);

  const placeMenu = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setMenuStyle(computeMenuPlacement(rect));
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((open) => {
      if (!open) placeMenu();
      return !open;
    });
  }, [placeMenu]);

  const openSaveDialog = useCallback(() => {
    placeMenu();
    setShowSaveDialog(true);
    setSaveName(presetName);
  }, [placeMenu, presetName]);

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
    <div
      data-tutorial-id="synth-preset-selector"
      className={styles.container}
      ref={containerRef}
    >
      {/* Preset name button */}
      <button className={styles.presetButton} onClick={toggleOpen}>
        <span className={styles.presetName}>
          {isDirty ? `${presetName} *` : presetName}
        </span>
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Action buttons */}
      <button
        className={styles.actionButton}
        onClick={openSaveDialog}
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

      {/* Dropdown menu — body portal (see computeMenuPlacement) */}
      {isOpen &&
        createPortal(
          <>
            <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
            <div className={styles.dropdown} style={menuStyle}>
              <div className={styles.sectionLabel}>FACTORY</div>
              {factoryPresets.map((p) => (
                <button
                  key={p.name}
                  className={`${styles.presetItem} ${p.name === presetName ? styles.active : ''}`}
                  onClick={() => handleSelect(p.name)}
                >
                  {p.name}
                </button>
              ))}

              {packPresets.length > 0 && (
                <>
                  <div className={styles.sectionLabel}>
                    {packDisplayName ?? 'PACK'}
                  </div>
                  {packPresets.map((p) => (
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

              {userPresets.length > 0 && (
                <>
                  <div className={styles.sectionLabel}>USER</div>
                  {userPresets.map((p) => (
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
          </>,
          document.body,
        )}

      {/* Save dialog — body portal */}
      {showSaveDialog &&
        createPortal(
          <>
            <div
              className={styles.backdrop}
              onClick={() => setShowSaveDialog(false)}
            />
            <div className={styles.saveDialog} style={menuStyle}>
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
          </>,
          document.body,
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
