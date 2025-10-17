import { Check, Clipboard } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { YouTubePlayer } from './YouTubePlayer';

interface YouTubeMarkdownHelperProps {
  onInsert?: (syntax: string) => void;
}

export const YouTubeMarkdownHelper = ({
  onInsert,
}: YouTubeMarkdownHelperProps) => {
  const [videoId, setVideoId] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [minimalUI, setMinimalUI] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [error, setError] = useState('');

  // Function to extract video ID from various YouTube URL formats
  const extractVideoId = (url: string): string | null => {
    // Handle youtube.com URLs
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return match[2];
    }

    // If it's already just the ID (11 characters)
    if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const extractedId = extractVideoId(value);

    if (extractedId) {
      setVideoId(extractedId);
      setError('');
    } else {
      setVideoId(value);
      setError('Invalid YouTube URL or ID');
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWidth(e.target.value);
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHeight(e.target.value);
  };

  // Generate the markdown syntax based on the provided values
  const generateMarkdownSyntax = () => {
    if (!videoId) return '';

    let syntax = `_component:youtube(${videoId}`;

    if (width) {
      syntax += `, ${width}`;

      if (height) {
        syntax += `, ${height}`;
      }
    } else if (height) {
      // If height is specified but width isn't, add a placeholder
      syntax += `, ,${height}`;
    }

    // Add minimal UI parameter if enabled
    if (minimalUI) {
      syntax += `, minimal`;
    }

    syntax += ')_';

    return syntax;
  };

  const handleCopyToClipboard = () => {
    const syntax = generateMarkdownSyntax();
    if (syntax) {
      navigator.clipboard.writeText(syntax);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const handleInsert = () => {
    const syntax = generateMarkdownSyntax();
    if (syntax && onInsert) {
      onInsert(syntax);
    }
  };

  const markdownSyntax = generateMarkdownSyntax();
  const isValidVideo = videoId && !error;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add YouTube Video to Markdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="youtube-url">YouTube URL or Video ID</Label>
          <Input
            id="youtube-url"
            placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ or dQw4w9WgXcQ"
            value={videoId}
            onChange={handleInputChange}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width">Width (optional)</Label>
            <Input
              id="width"
              placeholder="560"
              type="number"
              value={width}
              onChange={handleWidthChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (optional)</Label>
            <Input
              id="height"
              placeholder="315"
              type="number"
              value={height}
              onChange={handleHeightChange}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={minimalUI}
            id="minimal-ui"
            onCheckedChange={setMinimalUI}
          />
          <Label htmlFor="minimal-ui">
            Minimal UI (hide controls and branding)
          </Label>
        </div>

        {isValidVideo && (
          <div className="rounded-md border p-4">
            <div className="mb-2 font-medium">Preview</div>
            <YouTubePlayer
              height={height ? parseInt(height) : undefined}
              minimalUI={minimalUI}
              showControls={!minimalUI}
              videoId={videoId}
              width={width ? parseInt(width) : undefined}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Markdown Syntax</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={markdownSyntax || 'Enter a valid YouTube URL or video ID'}
            />
            <Button
              disabled={!isValidVideo}
              size="icon"
              variant="outline"
              onClick={handleCopyToClipboard}
            >
              {hasCopied ? (
                <Check className="size-4" />
              ) : (
                <Clipboard className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy this syntax and paste it into your markdown content.
          </p>
        </div>

        {onInsert && (
          <Button
            className="w-full"
            disabled={!isValidVideo}
            onClick={handleInsert}
          >
            Insert into Document
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
