import { zodResolver } from '@hookform/resolvers/zod';
import { Midi } from '@tonejs/midi';
import axios from 'axios';
import { CheckIcon, CloudUploadIcon, XIcon } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAddFileToPlayAlong, useGetPlayAlongUploadUrl } from '@/hooks/data';

interface UploadPlayAlongFilesModalProps {
  id: string;
  onSuccess?: () => void;
}

export const UploadPlayAlongFilesModal = ({
  id,
  onSuccess,
}: UploadPlayAlongFilesModalProps) => {
  const getPlayAlongUploadUrl = useGetPlayAlongUploadUrl({ id });
  const addFileToPlayAlong = useAddFileToPlayAlong({ id });

  const [midiFile, setMidiFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ midi: 0, audio: 0 });
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [isDetectingBpm, setIsDetectingBpm] = useState(false);

  const formSchema = z.object({
    beatsPerMinute: z.number().min(1).max(300).optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const { handleSubmit, control, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      beatsPerMinute: 120,
    },
  });

  const beatsPerMinute = watch('beatsPerMinute');

  // Detect BPM from MIDI file when it's loaded
  useEffect(() => {
    if (!midiFile) {
      return;
    }

    const extractBpmFromTempos = (midi: Midi): number | null => {
      if (midi.header?.tempos?.length > 0) {
        return Math.round(midi.header.tempos[0].bpm);
      }
      return null;
    };

    const extractBpmFromTrackNames = (midi: Midi): number | null => {
      if (!midi.tracks?.length) return null;

      for (const track of midi.tracks) {
        if (track.name?.toLowerCase().includes('tempo')) {
          const tempoMatch = track.name.match(/\b(\d+)\s*bpm\b/i);
          if (tempoMatch && tempoMatch[1]) {
            return parseInt(tempoMatch[1]);
          }
        }
      }
      return null;
    };

    const detectBpm = async () => {
      try {
        setIsDetectingBpm(true);
        const arrayBuffer = await midiFile.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        // Try different methods to extract BPM
        let bpm = extractBpmFromTempos(midi);

        // If no BPM found in tempos, try track names
        if (!bpm) {
          bpm = extractBpmFromTrackNames(midi);
        }

        // Default fallback if no BPM detected by any method
        if (!bpm) {
          bpm = 120; // Standard default BPM
        }

        if (bpm > 0 && bpm <= 300) {
          setDetectedBpm(bpm);
          setValue('beatsPerMinute', bpm);
        }
      } catch (error) {
        console.error('Error detecting BPM:', error);
      } finally {
        setIsDetectingBpm(false);
      }
    };

    detectBpm();
  }, [midiFile, setValue]);

  const onMidiDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setMidiFile(acceptedFiles[0]);
    }
  }, []);

  const onAudioDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setAudioFile(acceptedFiles[0]);
    }
  }, []);

  const midiDropzone = useDropzone({
    onDrop: onMidiDrop,
    accept: { 'audio/midi': ['.mid', '.midi'] },
    maxFiles: 1,
  });

  const audioDropzone = useDropzone({
    onDrop: onAudioDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'] },
    maxFiles: 1,
  });

  const handleRemoveMidiFile = useCallback(() => {
    setMidiFile(null);
    setDetectedBpm(null);
  }, []);

  const handleRemoveAudioFile = useCallback(() => {
    setAudioFile(null);
  }, []);

  const uploadFile = useCallback(
    async (file: File, type: 'midi' | 'audio') => {
      // Get upload URL
      const uploadUrlResult = await getPlayAlongUploadUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type,
        type: type,
      });

      // Upload file to the provided URL
      await axios.put(uploadUrlResult.signedUrl, file, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1),
          );
          setUploadProgress((prev) => ({
            ...prev,
            [type]: percentCompleted,
          }));
        },
      });

      // Add file reference to play along
      await addFileToPlayAlong.mutateAsync({
        name: file.name,
        type: type,
        filePath: uploadUrlResult.filePath,
        ...(type === 'midi' && beatsPerMinute ? { beatsPerMinute } : {}),
      });
    },
    [getPlayAlongUploadUrl, addFileToPlayAlong, beatsPerMinute],
  );

  const onSubmit = useCallback(
    async (_data: FormValues) => {
      if (!midiFile && !audioFile) {
        alert('Please select at least one file to upload');
        return;
      }

      try {
        setIsUploading(true);

        const uploadPromises = [];

        if (midiFile) {
          uploadPromises.push(uploadFile(midiFile, 'midi'));
        }

        if (audioFile) {
          uploadPromises.push(uploadFile(audioFile, 'audio'));
        }

        await Promise.all(uploadPromises);

        // Call success callback
        onSuccess?.();
      } catch (error) {
        console.error('Error uploading files:', error);
        alert('Failed to upload files. Please try again.');
      } finally {
        setIsUploading(false);
        setUploadProgress({ midi: 0, audio: 0 });
      }
    },
    [midiFile, audioFile, onSuccess, uploadFile],
  );

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Upload Play Along Files</DialogTitle>
      </DialogHeader>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <label className="block text-sm font-medium">MIDI File</label>
          {midiFile ? (
            <div className="flex items-center justify-between rounded-md border border-dashed p-4">
              <div className="flex items-center gap-2">
                <CheckIcon className="size-5 text-green-500" />
                <span className="max-w-[200px] truncate text-sm">
                  {midiFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(midiFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleRemoveMidiFile}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <div
              {...midiDropzone.getRootProps()}
              className={`cursor-pointer rounded-md border-2 border-dashed p-6 text-center transition-colors ${
                midiDropzone.isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary'
              }`}
            >
              <input {...midiDropzone.getInputProps()} />
              <CloudUploadIcon className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm">
                Drag and drop a MIDI file here, or click to select
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supported formats: .mid, .midi
              </p>
            </div>
          )}

          {midiFile && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Beats Per Minute (BPM)
                {isDetectingBpm && ' - Detecting...'}
                {detectedBpm &&
                  !isDetectingBpm &&
                  ` - Detected: ${detectedBpm}`}
              </label>
              <Controller
                control={control}
                name="beatsPerMinute"
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      disabled={isDetectingBpm}
                      max={300}
                      min={1}
                      placeholder="Enter BPM (e.g. 120)"
                      type="number"
                      {...field}
                      value={`${field.value || ''}`}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*$/.test(value)) {
                          field.onChange(parseInt(value));
                        }
                      }}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-500">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
              <p className="text-xs text-muted-foreground">
                BPM determines playback speed. Range: 1-300
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium">Audio File</label>
          {audioFile ? (
            <div className="flex items-center justify-between rounded-md border border-dashed p-4">
              <div className="flex items-center gap-2">
                <CheckIcon className="size-5 text-green-500" />
                <span className="max-w-[200px] truncate text-sm">
                  {audioFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleRemoveAudioFile}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <div
              {...audioDropzone.getRootProps()}
              className={`cursor-pointer rounded-md border-2 border-dashed p-6 text-center transition-colors ${
                audioDropzone.isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary'
              }`}
            >
              <input {...audioDropzone.getInputProps()} />
              <CloudUploadIcon className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm">
                Drag and drop an audio file here, or click to select
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supported formats: .mp3, .wav, .ogg, .m4a
              </p>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="space-y-4">
            {midiFile && (
              <div className="space-y-2">
                <div className="text-sm">
                  Uploading MIDI... {uploadProgress.midi}%
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${uploadProgress.midi}%` }}
                  ></div>
                </div>
              </div>
            )}
            {audioFile && (
              <div className="space-y-2">
                <div className="text-sm">
                  Uploading Audio... {uploadProgress.audio}%
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${uploadProgress.audio}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            disabled={isUploading || (!midiFile && !audioFile)}
            type="submit"
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
};
