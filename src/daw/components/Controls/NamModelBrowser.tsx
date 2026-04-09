import { useState, useCallback, useRef } from 'react';
import { ChevronDown, Upload } from 'lucide-react';
import {
  BUNDLED_MODELS,
  fetchBundledModel,
  loadModelFromFile,
  type NamModelEntry,
} from '@/daw/audio/nam/NamModelStore';
import type { NamModelFile } from '@/daw/audio/nam/NamModelParser';

// ── NamModelBrowser ──────────────────────────────────────────────────────

export function NamModelBrowser({
  selectedModelId,
  onModelLoaded,
}: {
  selectedModelId: string | null;
  onModelLoaded: (model: NamModelFile, entry: NamModelEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedLabel =
    BUNDLED_MODELS.find((m) => m.id === selectedModelId)?.name ??
    'Select Model';

  const handleSelectBundled = useCallback(
    async (entry: NamModelEntry) => {
      if (!entry.url) return;
      setLoading(true);
      setError(null);
      setOpen(false);
      try {
        const model = await fetchBundledModel(entry.url);
        onModelLoaded(model, entry);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load model');
      } finally {
        setLoading(false);
      }
    },
    [onModelLoaded],
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.nam')) {
        setError('Please select a .nam file');
        return;
      }
      setLoading(true);
      setError(null);
      setOpen(false);
      try {
        const model = await loadModelFromFile(file);
        const entry: NamModelEntry = {
          id: `user-${Date.now()}`,
          name: file.name.replace('.nam', ''),
          toneType: model.metadata?.tone_type ?? 'unknown',
          architecture: model.architecture,
          source: 'user',
          forInstrument: 'guitar',
          file: model,
        };
        onModelLoaded(model, entry);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load model');
      } finally {
        setLoading(false);
      }
    },
    [onModelLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span
          className="truncate text-[10px]"
          style={{
            color: loading ? 'var(--color-text-dim)' : 'var(--color-text)',
          }}
        >
          {loading ? 'Loading...' : selectedLabel}
        </span>
        <ChevronDown
          size={12}
          className="ml-1 shrink-0"
          style={{ color: 'var(--color-text-dim)' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="mt-1 rounded px-2 py-1 text-[9px]"
          style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}
        >
          {error}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute inset-x-0 z-50 overflow-hidden rounded-lg"
          style={{
            top: '100%',
            marginTop: 2,
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {/* Bundled models */}
          <div
            className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Bundled Models
          </div>
          {BUNDLED_MODELS.map((entry) => (
            <div
              key={entry.id}
              onClick={() => handleSelectBundled(entry)}
              className="flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-white/10"
            >
              <span
                className="truncate text-[10px]"
                style={{
                  color:
                    entry.id === selectedModelId
                      ? 'var(--color-accent)'
                      : 'var(--color-text)',
                }}
              >
                {entry.name}
              </span>
              <span
                className="ml-2 shrink-0 text-[8px] uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {entry.architecture}
              </span>
            </div>
          ))}

          {/* Separator */}
          <div
            className="mx-3 my-1"
            style={{ borderTop: '1px solid var(--color-border)' }}
          />

          {/* Load custom */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-white/10"
          >
            <Upload size={10} style={{ color: 'var(--color-text-dim)' }} />
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-text)' }}
            >
              Load Custom .nam
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".nam"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
          />

          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="mx-3 mb-2 mt-1 flex items-center justify-center rounded-lg py-3"
            style={{
              border: '1px dashed rgba(255,255,255,0.15)',
            }}
          >
            <span
              className="text-[9px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Drop .nam file here
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
