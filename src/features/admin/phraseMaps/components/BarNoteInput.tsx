import { useMemo, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { Note } from '@/hooks/data';

export const BarNoteInput = ({
  noteNumbers,
  noteByMidi,
  onChange,
  className,
  currentNoteIndex,
}: {
  noteNumbers: number[];
  noteByMidi: Map<number, Note>;
  onChange: (currentNoteIndex: number, noteNumbers: number[]) => void;
  className?: string;
  currentNoteIndex: number;
}) => {
  const [noteInput, setNoteInput] = useState<string>(
    noteNumbers.length > 0
      ? noteNumbers
          .map((n) => noteByMidi.get(n)?.key)
          .filter(Boolean)
          .join(', ')
      : '',
  );

  useUpdateEffect(() => {
    setNoteInput(
      noteNumbers.length > 0
        ? noteNumbers.map((n) => noteByMidi.get(n)?.key).join(', ')
        : '',
    );
  }, [noteNumbers]);

  const midiByKey = useMemo(() => {
    return new Map(
      Array.from(noteByMidi.entries()).map(([midi, note]) => [note.key, midi]),
    );
  }, [noteByMidi]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNoteInput(e.target.value);

    const notes = e.target.value.split(',').map((n) => n.trim());
    const parsedNotes = notes
      .map((n) => midiByKey.get(n))
      .filter(Boolean) as number[];

    if (notes.length === parsedNotes.length) {
      onChange(currentNoteIndex, parsedNotes);
    }
  };

  return (
    <input className={className} value={noteInput} onChange={handleChange} />
  );
};
