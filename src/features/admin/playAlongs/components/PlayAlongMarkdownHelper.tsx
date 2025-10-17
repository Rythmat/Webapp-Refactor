import { Check, Clipboard } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePlayAlongs } from '@/hooks/data';
import { PlayAlongPlayer } from './PlayAlongPlayer';

interface PlayAlongMarkdownHelperProps {
  onInsert?: (syntax: string) => void;
}

export const PlayAlongMarkdownHelper = ({
  onInsert,
}: PlayAlongMarkdownHelperProps) => {
  const [selectedPlayAlongId, setSelectedPlayAlongId] = useState<string>('');
  const [isCompact, setIsCompact] = useState(false);
  const [color, setColor] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);

  const playAlongs = usePlayAlongs();

  // Generate the markdown syntax based on the selected options
  const generateMarkdownSyntax = () => {
    if (!selectedPlayAlongId) return '';

    let syntax = `_component:playalong(${selectedPlayAlongId}`;

    if (isCompact) {
      syntax += `,compact`;
    }

    if (color) {
      syntax += `,${color}`;
    } else if (isCompact) {
      // If compact is true but no color, we need a comma placeholder
      syntax += `,`;
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Play-Along to Markdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="play-along-select">Select Play-Along</Label>
          <Select
            value={selectedPlayAlongId}
            onValueChange={setSelectedPlayAlongId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a play-along" />
            </SelectTrigger>
            <SelectContent>
              {playAlongs.isLoading ? (
                <SelectItem disabled value="loading">
                  Loading...
                </SelectItem>
              ) : playAlongs.isError ? (
                <SelectItem disabled value="error">
                  Error loading play-alongs
                </SelectItem>
              ) : (
                playAlongs.data?.pages.flatMap((page) =>
                  page.data.map((playAlong) => (
                    <SelectItem key={playAlong.id} value={playAlong.id}>
                      {playAlong.name}
                    </SelectItem>
                  )),
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={isCompact}
            id="compact-mode"
            onCheckedChange={setIsCompact}
          />
          <Label htmlFor="compact-mode">Compact Mode</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color (hex format, e.g. #ff0000)</Label>
          <Input
            id="color"
            placeholder="#ff0000"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        {selectedPlayAlongId && (
          <div className="rounded-md border p-4">
            <div className="mb-2 font-medium">Preview</div>
            <PlayAlongPlayer
              color={color || undefined}
              id={selectedPlayAlongId}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Markdown Syntax</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={markdownSyntax || 'Select a play-along to generate syntax'}
            />
            <Button
              disabled={!markdownSyntax}
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
            disabled={!markdownSyntax}
            onClick={handleInsert}
          >
            Insert into Document
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
