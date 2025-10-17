import { SearchIcon } from 'lucide-react';
import { useEffect, useState, useMemo, Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePhraseMaps } from '@/hooks/data';
import { PhraseMapRenderer } from './PhraseMapRenderer';

interface SelectPhraseMapModalProps {
  children?: React.ReactNode;
  onSelect: (phraseMapId: string) => void;
  open?: boolean;
  onOpenChange?: Dispatch<SetStateAction<boolean>>;
}

export const SelectPhraseMapModal = ({
  children,
  onSelect,
  open,
  onOpenChange,
}: SelectPhraseMapModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const { data, isLoading, error } = usePhraseMaps({ pageSize: 20 });

  // Flatten all phrase maps from all pages
  const allPhraseMaps = useMemo(
    () => data?.pages.flatMap((page) => page.data) || [],
    [data],
  );

  // Filter phrase maps based on search term
  const filteredPhraseMaps = useMemo(
    () =>
      allPhraseMaps.filter((map) =>
        map.label?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [allPhraseMaps, searchTerm],
  );

  const handleSelectPhraseMap = (phraseMapId: string) => {
    onSelect(phraseMapId);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-[60vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Rhythm Map</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search rhythm maps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-lg text-muted-foreground">
                Loading rhythm maps...
              </div>
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-lg text-destructive">
                Error loading rhythm maps. Please try again.
              </div>
            </div>
          ) : filteredPhraseMaps.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-lg text-muted-foreground">
                No rhythm maps found
              </div>
            </div>
          ) : (
            <div className="max-h-[400px] max-w-[80vw] space-y-4 overflow-y-auto">
              {filteredPhraseMaps.map((phraseMap) => (
                <PhraseMapCard
                  key={phraseMap.id}
                  phraseMapId={phraseMap.id}
                  onSelect={handleSelectPhraseMap}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PhraseMapCardProps {
  phraseMapId: string;
  onSelect: (phraseMapId: string) => void;
}

const PhraseMapCard = ({ phraseMapId, onSelect }: PhraseMapCardProps) => {
  return (
    <div onClick={() => onSelect(phraseMapId)}>
      <PhraseMapRenderer id={phraseMapId} />
    </div>
  );
};
