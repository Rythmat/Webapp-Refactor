import { AlertCircle } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAddMedia } from '@/hooks/data/media/useAddMedia';
import { useGetMediaUploadUrl } from '@/hooks/data/media/useGetMediaUploadUrl';

interface InsertImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (syntax: string) => void;
}

export const InsertImageModal: React.FC<InsertImageModalProps> = ({
  open,
  onOpenChange,
  onInsert,
}) => {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [width, setWidth] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: getUploadUrl, isPending: isGettingUrl } =
    useGetMediaUploadUrl();
  const { mutateAsync: addMedia, isPending: isAddingMedia } = useAddMedia();

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setImageUrl('');
    setAltText('');
    setWidth('');
    setUploadProgress(null);
    setError(null);
    setIsFetchingUrl(false);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImageUrl('');
      setError(null);
      setUploadProgress(null);
    }
  };

  const performUpload = useCallback(
    async (fileToUpload: File) => {
      setError(null);
      setUploadProgress(0);
      setIsFetchingUrl(false);

      try {
        const uploadUrlData = await getUploadUrl({
          fileName: fileToUpload.name,
          contentType: fileToUpload.type,
        });

        if (!uploadUrlData?.signedUrl || !uploadUrlData?.filePath) {
          throw new Error('Failed to get upload URL.');
        }

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrlData.signedUrl);
        xhr.setRequestHeader('Content-Type', fileToUpload.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        };

        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(100);
              resolve();
            } else {
              reject(
                new Error(
                  `Upload failed: ${xhr.statusText} (Status: ${xhr.status})`,
                ),
              );
            }
          };
          xhr.onerror = () =>
            reject(new Error('Upload failed due to network error.'));
          xhr.send(fileToUpload);
        });

        const mediaResult = await addMedia({
          filePath: uploadUrlData.filePath,
          name: fileToUpload.name,
          contentType: fileToUpload.type,
        });

        if (!mediaResult?.id) {
          throw new Error('Failed to finalize media upload.');
        }

        const syntax = width
          ? `_component:image(${mediaResult.filePath}, ${altText || fileToUpload.name}, ${width})_`
          : `_component:image(${mediaResult.filePath}, ${altText || fileToUpload.name})_`;
        onInsert(syntax);
        onOpenChange(false);
        resetState();
      } catch (err) {
        console.error('Upload failed:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'An unknown error occurred during upload.',
        );
        setUploadProgress(null);
        setIsFetchingUrl(false);
      }
    },
    [
      getUploadUrl,
      addMedia,
      altText,
      onInsert,
      onOpenChange,
      resetState,
      width,
    ],
  );

  const handleFileSelectAndUpload = useCallback(() => {
    if (!selectedFile) return;
    performUpload(selectedFile);
  }, [selectedFile, performUpload]);

  const handleUrlFetchAndUpload = useCallback(async () => {
    if (!imageUrl) return;

    setError(null);
    setUploadProgress(null);
    setIsFetchingUrl(true);

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
        );
      }

      const blob = await response.blob();

      const contentType =
        response.headers.get('Content-Type') || blob.type || 'image/jpeg';
      let fileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
      fileName = fileName.split('?')[0].split('#')[0] || 'image_from_url.jpg';

      const fetchedFile = new File([blob], fileName, { type: contentType });

      await performUpload(fetchedFile);
    } catch (err) {
      console.error('URL Fetch/Upload failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unknown error occurred while fetching the URL.',
      );
      setIsFetchingUrl(false);
    }
  }, [imageUrl, performUpload]);

  const isUploading =
    isGettingUrl || isAddingMedia || uploadProgress !== null || isFetchingUrl;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const isActionButtonDisabled =
    isUploading ||
    (uploadMethod === 'file' && !selectedFile) ||
    (uploadMethod === 'url' && !imageUrl);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>
        <Tabs
          className="pt-4"
          value={uploadMethod}
          onValueChange={(value) => setUploadMethod(value as 'file' | 'url')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger disabled={isUploading} value="file">
              Upload File
            </TabsTrigger>
            <TabsTrigger disabled={isUploading} value="url">
              From URL
            </TabsTrigger>
          </TabsList>
          <TabsContent className="space-y-4 pt-4" value="file">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="image-file">
                Image File
              </Label>
              <Input
                accept="image/*"
                className="col-span-3"
                disabled={isUploading}
                id="image-file"
                type="file"
                onChange={handleFileChange}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="alt-text-file">
                Alt Text
              </Label>
              <Input
                className="col-span-3"
                disabled={isUploading}
                id="alt-text-file"
                placeholder="Describe the image (optional)"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="width-file">
                Width
              </Label>
              <Input
                className="col-span-3"
                disabled={isUploading}
                id="width-file"
                placeholder="Width as percentage, e.g. 50 (optional)"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
          </TabsContent>
          <TabsContent className="space-y-4 pt-4" value="url">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="image-url">
                Image URL
              </Label>
              <Input
                className="col-span-3"
                disabled={isUploading}
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setSelectedFile(null);
                  setError(null);
                  setUploadProgress(null);
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="alt-text-url">
                Alt Text
              </Label>
              <Input
                className="col-span-3"
                disabled={isUploading}
                id="alt-text-url"
                placeholder="Describe the image (optional)"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="width-url">
                Width
              </Label>
              <Input
                className="col-span-3"
                disabled={isUploading}
                id="width-url"
                placeholder="Width as percentage, e.g. 50 (optional)"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-col gap-4 py-0">
          {uploadProgress !== null &&
            uploadProgress < 100 &&
            !isFetchingUrl && <Progress value={uploadProgress} />}
          {isFetchingUrl && (
            <p className="text-sm text-muted-foreground">
              Fetching image from URL...
            </p>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={isUploading}
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={isActionButtonDisabled}
            type="button"
            onClick={
              uploadMethod === 'file'
                ? handleFileSelectAndUpload
                : handleUrlFetchAndUpload
            }
          >
            {isFetchingUrl
              ? 'Fetching...'
              : isUploading
                ? 'Uploading...'
                : 'Upload & Insert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

InsertImageModal.displayName = 'InsertImageModal';
