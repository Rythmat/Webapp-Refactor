import type { AudioExportFormat, WavBitDepth } from '@/daw/audio/exportAudio';

export type RangeChoice = 'project' | 'loop' | 'custom';

/**
 * The format, bit depth and range the student picked. FileMenu holds them,
 * since the dialog is mounted only while open, so the next export starts from
 * the last one's choices. Apart from ExportAudioDialog, which loads on
 * first open (milestone 1.12a).
 */
export interface ExportChoices {
  format: AudioExportFormat;
  bitDepth: WavBitDepth;
  range: RangeChoice;
}

export const DEFAULT_EXPORT_CHOICES: ExportChoices = {
  format: 'wav',
  bitDepth: 16,
  range: 'project',
};
