/* eslint-disable react/jsx-sort-props */
import {
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type GameId = 'board' | 'press' | 'connect';

interface GameOption {
  id: GameId;
  name: string;
  description: string;
}

const GAME_OPTIONS: GameOption[] = [
  {
    id: 'board',
    name: 'Board Choice Game',
    description: 'Identify the correct chord on the classroom board.',
  },
  {
    id: 'press',
    name: 'Chord Press Game',
    description: 'Play the prompted chord on the virtual keyboard.',
  },
  {
    id: 'connect',
    name: 'Chord Connection Game',
    description: 'Connect chord fragments to build full harmonies.',
  },
];

interface SelectGamesModalProps {
  children?: ReactNode;
  onSelect: (selection: { gameId: string; chords: string[] }) => void;
  open?: boolean;
  onOpenChange?: Dispatch<SetStateAction<boolean>>;
}

export const SelectGamesModal = ({
  children,
  onSelect,
  open,
  onOpenChange,
}: SelectGamesModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null);
  const [chordInput, setChordInput] = useState('');

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const selectedGame = useMemo(
    () => GAME_OPTIONS.find((option) => option.id === selectedGameId) ?? null,
    [selectedGameId],
  );

  const chords = useMemo(
    () =>
      chordInput
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean),
    [chordInput],
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedGameId(null);
      setChordInput('');
    }
  }, [isOpen]);

  const handleSelectGame = (gameId: GameId) => {
    setSelectedGameId(gameId);
  };

  const handleConfirm = () => {
    if (!selectedGame) return;

    onSelect({
      gameId: selectedGame.id,
      chords,
    });

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-[60vw]">
        <DialogHeader>
          <DialogTitle>
            {selectedGame ? 'Configure Game' : 'Select Game'}
          </DialogTitle>
        </DialogHeader>

        {!selectedGame ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {GAME_OPTIONS.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant="outline"
                className="h-auto flex-col items-start gap-1 whitespace-normal rounded-md border p-4 text-left"
                onClick={() => handleSelectGame(option.id)}
              >
                <span className="text-sm font-semibold">{option.name}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2 rounded-md border p-4">
              <div className="text-sm font-semibold">{selectedGame.name}</div>
              <p className="text-xs text-muted-foreground">
                {selectedGame.description}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chord-list">
                  Chords for this game (separate with commas or new lines)
                </Label>
                <Textarea
                  id="chord-list"
                  placeholder="Cmaj7, Fm9, G7"
                  value={chordInput}
                  onChange={(event) => setChordInput(event.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedGameId(null)}
              >
                Back to game options
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={chords.length === 0}
              >
                Use {selectedGame.name}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
