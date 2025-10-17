import { sortBy, uniqBy } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PhraseMap } from '@/components/PhraseMap/PhraseMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { DeleteIcon } from '@/components/ui/icons/delete-icon';
import { Input } from '@/components/ui/input';
import {
  useNotes,
  useUpdatePhraseMap,
  useDeletePhraseMap,
  useCreatePhraseBar,
  useUpdatePhraseBar,
  useDeletePhraseBar,
  usePhraseMap,
  PhraseBar,
  PhraseBarNote,
  UpdatePhraseBarData,
} from '@/hooks/data';
import { useDebounce } from '@/hooks/useDebounce';
import { PhraseBarItem } from './PhraseBarItem';

const mapPhraseBarNotesToPayload = (
  notes: PhraseBarNote[],
): UpdatePhraseBarData['notes'] => {
  return notes.map((note) => ({
    noteNumbers: note.noteNumbers,
    noteDuration: note.noteDuration,
    noteType: note.noteType,
    color: note.color || undefined,
    order: note.order,
  }));
};

type PhraseMapFormData = {
  id: string;
  label: string | null;
  color: string | null;
  description: string;
  beatsPerBar: number;
  beatsPerMinute: number;
  createdAt: Date;
  updatedAt: Date;
  PhraseBars: PhraseBar[];
};

export const PhraseMapEditor = ({ id }: { id: string }) => {
  const { data: notes } = useNotes();
  const { data: phraseMapData, isLoading, refetch } = usePhraseMap(id);
  const [localPhraseMap, setLocalPhraseMap] =
    useState<PhraseMapFormData | null>(null);

  const isInitializedRef = useRef(false);

  const { mutate: _updatePhraseMap } = useUpdatePhraseMap(id);
  const { mutate: _createPhraseBar } = useCreatePhraseBar(id);
  const { mutate: _updatePhraseBar } = useUpdatePhraseBar({ mapId: id });
  const { mutate: _deletePhraseBar } = useDeletePhraseBar({ mapId: id });
  const { mutate: _deletePhraseMap } = useDeletePhraseMap(id);

  const updatePhraseMap = useDebounce(_updatePhraseMap, 1000);
  const deletePhraseMap = useDebounce(_deletePhraseMap, 1000);
  const createPhraseBar = useDebounce(_createPhraseBar, 1000);
  const updatePhraseBar = useDebounce(_updatePhraseBar, 1000);
  const deletePhraseBar = useDebounce(_deletePhraseBar, 1000);

  // Initialize local state from query data
  useEffect(() => {
    if (phraseMapData && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setLocalPhraseMap({
        id: phraseMapData.id,
        label: phraseMapData.label || null,
        color: phraseMapData.color || null,
        description: phraseMapData.description || '',
        beatsPerBar: phraseMapData.beatsPerBar || 4,
        beatsPerMinute: phraseMapData.beatsPerMinute || 120,
        PhraseBars: phraseMapData.PhraseBars || [],
        createdAt: phraseMapData.createdAt || new Date(),
        updatedAt: phraseMapData.updatedAt || new Date(),
      });
    }
  }, [phraseMapData]);

  const handleDeletePhraseMap = () => {
    deletePhraseMap();
  };

  const handleUpdatePhraseMap = (data: {
    label?: string;
    color?: string | null;
    description?: string;
    beatsPerBar?: number;
    beatsPerMinute?: number;
  }) => {
    if (!localPhraseMap) return;

    // Optimistically update local state
    const updatedMap = {
      ...localPhraseMap,
      ...data,
    };
    setLocalPhraseMap(updatedMap);

    // Send update to server
    updatePhraseMap(data);
  };

  const handleCreateBar = () => {
    if (!localPhraseMap) return;

    // Generate a temporary ID for optimistic update
    const newBar: PhraseBar = {
      id: uuidv4(),
      label: null,
      color: null,
      order: localPhraseMap.PhraseBars.length,
      startRepeat: false,
      endRepeat: false,
      PhraseBarNotes: [
        {
          id: uuidv4(),
          noteNumbers: [60, 64, 67], // C, E, G for a major C chord
          noteDuration: 'quarter',
          noteType: 'note',
          color: null,
          order: 0,
          label: null,
        },
        {
          id: uuidv4(),
          noteNumbers: [62], // D
          noteDuration: 'quarter',
          noteType: 'note',
          color: null,
          order: 1,
          label: null,
        },
        {
          id: uuidv4(),
          noteNumbers: [64], // E
          noteDuration: 'quarter',
          noteType: 'note',
          color: null,
          order: 2,
          label: null,
        },
        {
          id: uuidv4(),
          noteNumbers: [65], // F
          noteDuration: 'quarter',
          noteType: 'note',
          color: null,
          order: 3,
          label: null,
        },
      ],
    };

    // Optimistically update local state
    setLocalPhraseMap({
      ...localPhraseMap,
      PhraseBars: [...localPhraseMap.PhraseBars, newBar],
    });

    // Send to server
    createPhraseBar(
      {
        id: newBar.id,
        notes: newBar.PhraseBarNotes.map((note) => ({
          ...note,
          color: note.color || undefined,
          label: note.label || undefined,
        })),
        label: newBar.label || undefined,
        color: newBar.color || undefined,
        order: newBar.order || localPhraseMap.PhraseBars.length,
      },
      {
        onError: () => {
          // Rollback optimistic update
          setLocalPhraseMap({
            ...localPhraseMap,
            PhraseBars: localPhraseMap.PhraseBars.filter(
              (bar) => bar.id !== newBar.id,
            ),
          });
        },
        onSuccess: () => {
          // refetch();
        },
      },
    );
  };

  const handleUpdateBar = (barId: string, updatedBar: PhraseBar) => {
    if (!localPhraseMap) return;

    const barBeforeUpdate = localPhraseMap.PhraseBars.find(
      (bar) => bar.id === barId,
    );

    if (!barBeforeUpdate) return;

    // Optimistically update local state
    setLocalPhraseMap({
      ...localPhraseMap,
      PhraseBars: localPhraseMap.PhraseBars.map((bar) =>
        bar.id === barId
          ? {
              ...updatedBar,
              PhraseBarNotes: updatedBar.PhraseBarNotes.sort(
                (a, b) => a.order - b.order,
              ),
            }
          : bar,
      ),
    });

    // Send update to server if it's the selected bar
    updatePhraseBar(
      {
        id: barId,
        label: updatedBar.label || undefined,
        color: updatedBar.color || undefined,
        notes: mapPhraseBarNotesToPayload(
          updatedBar.PhraseBarNotes.sort((a, b) => a.order - b.order),
        ),
      },
      {
        onError: () => {
          // Rollback optimistic update
          setLocalPhraseMap((current) =>
            current
              ? {
                  ...current,
                  PhraseBars: current?.PhraseBars.map((bar) =>
                    bar.id === barId ? { ...barBeforeUpdate } : bar,
                  ),
                }
              : null,
          );
        },
        onSuccess: () => {
          // refetch();
        },
      },
    );
  };

  const handleDuplicateBar = (barId: string) => {
    if (!localPhraseMap) return;

    const barToDuplicateIndex = localPhraseMap.PhraseBars.findIndex(
      (bar) => bar.id === barId,
    );

    const barToDuplicate = localPhraseMap.PhraseBars.at(barToDuplicateIndex);
    if (!barToDuplicate) return;

    const newBar = {
      ...barToDuplicate,
      id: uuidv4(),
      PhraseBarNotes: barToDuplicate.PhraseBarNotes.map((note) => ({
        ...note,
        id: uuidv4(),
      })),
    };

    setLocalPhraseMap({
      ...localPhraseMap,
      PhraseBars: [
        ...localPhraseMap.PhraseBars.slice(0, barToDuplicateIndex + 1),
        newBar,
        ...localPhraseMap.PhraseBars.slice(barToDuplicateIndex + 1),
      ],
    });

    createPhraseBar(
      {
        ...newBar,
        color: newBar.color || undefined,
        label: newBar.label || undefined,
        order: newBar.order || localPhraseMap.PhraseBars.length,
        notes: mapPhraseBarNotesToPayload(newBar.PhraseBarNotes).map(
          (note) => ({
            ...note,
            color: note.color || undefined,
            label: note.label || undefined,
            order: note.order || 0,
          }),
        ),
      },
      { onSuccess: () => refetch() },
    );
  };

  const handleDeleteBar = (barId: string) => {
    if (!localPhraseMap) return;

    const barToDelete = localPhraseMap.PhraseBars.find(
      (bar) => bar.id === barId,
    );

    if (!barToDelete) return;

    // Optimistically update local state
    setLocalPhraseMap({
      ...localPhraseMap,
      PhraseBars: localPhraseMap.PhraseBars.filter((bar) => bar.id !== barId),
    });

    // Send delete to server
    deletePhraseBar(
      { id: barId },
      {
        onError: () => {
          // Rollback optimistic update
          setLocalPhraseMap((current) =>
            current
              ? {
                  ...current,
                  PhraseBars: [...current.PhraseBars, barToDelete],
                }
              : null,
          );
        },
      },
    );
  };

  if (isLoading || !localPhraseMap) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex gap-6">
          <div>
            <label className="text-sm font-medium">Color</label>
            <ColorPicker
              value={localPhraseMap.color || null}
              onChange={(newColor) =>
                handleUpdatePhraseMap({ color: newColor || null })
              }
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Label</label>
            <Input
              placeholder="Label"
              value={localPhraseMap.label || ''}
              onChange={(e) => handleUpdatePhraseMap({ label: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Beats Per Minute</label>
          <Input
            max={240}
            min={0}
            type="number"
            value={localPhraseMap.beatsPerMinute}
            onChange={(e) =>
              handleUpdatePhraseMap({
                beatsPerMinute: parseInt(e.target.value),
              })
            }
          />
        </div>
        <Button
          className="text-destructive hover:text-destructive"
          size="icon"
          variant="ghost"
          onClick={() => handleDeletePhraseMap()}
        >
          <DeleteIcon className="size-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>

      <Card className="p-4">
        <PhraseMap phraseMap={localPhraseMap} />
      </Card>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Bars</h3>
          <Button onClick={handleCreateBar}>Add Bar</Button>
        </div>

        <div className="space-y-4">
          {sortBy(localPhraseMap.PhraseBars, 'order').map((bar, index) => (
            <PhraseBarItem
              key={bar.id}
              bar={bar}
              beatsPerBar={localPhraseMap.beatsPerBar}
              index={index}
              notes={uniqBy(notes, 'midi') || []}
              onDelete={() => handleDeleteBar(bar.id)}
              onDuplicate={() => handleDuplicateBar(bar.id)}
              onUpdate={(updatedBar) => handleUpdateBar(bar.id, updatedBar)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
