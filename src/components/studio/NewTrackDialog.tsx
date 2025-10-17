import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InstrumentType } from '@/types';

type NewTrackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, type: 'midi' | 'audio', instrument?: InstrumentType) => void;
};

const instrumentOptions: InstrumentType[] = ['synth', 'bass', 'drums', 'keys', 'guitar'];

const NewTrackDialog = ({ open, onOpenChange, onCreate }: NewTrackDialogProps) => {
  const [name, setName] = useState('');
  const [trackType, setTrackType] = useState<'midi' | 'audio'>('midi');
  const [instrument, setInstrument] = useState<InstrumentType | ''>('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Please provide a track name.');
      return;
    }
    if (trackType === 'midi' && !instrument) {
      setError('Please select an instrument for the MIDI track.');
      return;
    }
    onCreate(name.trim(), trackType, trackType === 'midi' ? instrument as InstrumentType : undefined);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setName('');
    setTrackType('midi');
    setInstrument('');
    setError('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Track</DialogTitle>
          <DialogDescription>
            Choose the type of track you want to create.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="track-type" className="text-right">Type</Label>
            <RadioGroup
              value={trackType}
              onValueChange={(value) => setTrackType(value as 'midi' | 'audio')}
              className="col-span-3 flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="midi" id="midi" />
                <Label htmlFor="midi">MIDI</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="audio" id="audio" />
                <Label htmlFor="audio">Audio</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="track-name" className="text-right">Name</Label>
            <Input
              id="track-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder={trackType === 'midi' ? "My New Synth" : "Vocal Recording"}
            />
          </div>
          {trackType === 'midi' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="instrument" className="text-right">Instrument</Label>
              <Select value={instrument} onValueChange={(value) => setInstrument(value as InstrumentType)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select an instrument" />
                </SelectTrigger>
                <SelectContent>
                  {instrumentOptions.map(opt => (
                    <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-red-500 text-sm text-center col-span-4">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleCreate}>Create Track</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewTrackDialog;