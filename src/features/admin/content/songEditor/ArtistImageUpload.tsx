import { ImagePlus, Link2, Loader2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/utilities';
import type { ArtistImageSource, Song } from '@/curriculum/types/songLibrary';
import { useAdminAssetUpload } from '@/hooks/data/admin/useAdminAssetUpload';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';

/**
 * The artist-artwork square from the published page (`SongArtwork`) turned into
 * a drag-and-drop uploader. A dropped file is center-cropped to a square,
 * previewed instantly, and uploaded; the returned URL is stored in
 * `artistImageRef` exactly like the existing `/artists/...` paths. Until the
 * upload endpoint exists the upload fails gracefully and a pasted URL is offered.
 */
const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = src;
  });

/** Center-crop a file to a square and re-encode small; returns preview + File. */
async function fileToSquare(
  file: File,
  size = 320,
): Promise<{ dataUrl: string; file: File }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(
      img,
      (img.width - side) / 2,
      (img.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob) throw new Error('Could not process image');
    return {
      dataUrl,
      file: new File([blob], 'artist.jpg', { type: 'image/jpeg' }),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const ArtistImageUpload = ({
  song,
  onPatch,
}: {
  song: Song;
  onPatch: (patch: Partial<Song>) => void;
}) => {
  const upload = useAdminAssetUpload();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const avatarConfig = useMemo(
    () => defaultAvatarConfig(song.genreTags[0] ?? song.artist ?? 'song'),
    [song.genreTags, song.artist],
  );
  const initials = useMemo(
    () =>
      (song.artist || '')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [song.artist],
  );

  const setImage = (ref: string | undefined) => {
    onPatch({
      artistImageRef: ref,
      artistImageSource: (ref ? 'manual' : 'none') as ArtistImageSource,
    });
    setBroken(false);
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const { dataUrl, file: squared } = await fileToSquare(file);
      setPreview(dataUrl);
      const { url } = await upload.mutateAsync(squared);
      setImage(url);
      setPreview(null);
    } catch (caught) {
      // Endpoint not live yet (or a bad file): keep the preview visible and let
      // the admin paste a URL instead of silently embedding base64.
      setError(
        caught instanceof Error && /process|Canvas/.test(caught.message)
          ? caught.message
          : 'Upload failed — the image endpoint may not be live yet. Paste an image URL below instead.',
      );
      setShowUrl(true);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    multiple: false,
    noKeyboard: true,
    onDrop: (files) => {
      if (files[0]) void handleFile(files[0]);
    },
  });

  const shownSrc =
    preview ?? (song.artistImageRef && !broken ? song.artistImageRef : null);
  const hasImage = !!song.artistImageRef || !!preview;

  return (
    <div className="flex flex-col gap-1">
      <div
        {...getRootProps()}
        className={cn(
          'group relative aspect-square h-36 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl md:h-40',
          isDragActive && 'ring-2 ring-[#7ecfcf]',
        )}
        title="Drop or click to upload artist image"
      >
        <input {...getInputProps()} />

        {shownSrc ? (
          <img
            src={shownSrc}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <>
            <HexAvatarSVG
              config={avatarConfig}
              circular={false}
              className="absolute left-0 top-0 size-[120%] opacity-60"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="font-bold text-white/20"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
              >
                {initials || '?'}
              </span>
            </div>
          </>
        )}

        {/* Hover / empty affordance */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-xs text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
          {upload.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <ImagePlus className="size-5" />
              <span>{hasImage ? 'Replace' : 'Upload'}</span>
            </>
          )}
        </div>

        {hasImage && !upload.isPending && (
          <button
            type="button"
            aria-label="Remove image"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              setImage(undefined);
            }}
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white/80 opacity-0 transition hover:text-white group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowUrl((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white"
      >
        <Link2 className="size-3" />
        {showUrl ? 'Hide URL' : 'Paste URL'}
      </button>

      {showUrl && (
        <Input
          className="h-7 text-xs"
          placeholder="/artists/svg/name.webp or https://…"
          defaultValue={song.artistImageRef ?? ''}
          onChange={(e) => setImage(e.target.value.trim() || undefined)}
        />
      )}

      {error && <p className="max-w-40 text-[11px] text-amber-400">{error}</p>}
    </div>
  );
};
