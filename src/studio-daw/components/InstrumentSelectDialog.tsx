import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Common GM instruments organized by category
const INSTRUMENT_CATEGORIES = [
  {
    name: 'Pads & Synths',
    instruments: [
      { program: 89, name: 'Warm Pad' },
      { program: 88, name: 'New Age Pad' },
      { program: 90, name: 'Polysynth' },
      { program: 91, name: 'Choir Pad' },
      { program: 92, name: 'Bowed Pad' },
      { program: 93, name: 'Metallic Pad' },
      { program: 94, name: 'Halo Pad' },
      { program: 95, name: 'Sweep Pad' },
    ],
  },
  {
    name: 'Strings',
    instruments: [
      { program: 48, name: 'String Ensemble' },
      { program: 49, name: 'Slow Strings' },
      { program: 50, name: 'Synth Strings 1' },
      { program: 51, name: 'Synth Strings 2' },
      { program: 40, name: 'Violin' },
      { program: 41, name: 'Viola' },
      { program: 42, name: 'Cello' },
      { program: 43, name: 'Contrabass' },
    ],
  },
  {
    name: 'Woodwinds & Brass',
    instruments: [
      { program: 73, name: 'Flute' },
      { program: 74, name: 'Recorder' },
      { program: 75, name: 'Pan Flute' },
      { program: 79, name: 'Ocarina' },
      { program: 68, name: 'Oboe' },
      { program: 71, name: 'Clarinet' },
      { program: 69, name: 'English Horn' },
      { program: 60, name: 'French Horn' },
    ],
  },
  {
    name: 'Keyboards',
    instruments: [
      { program: 0, name: 'Acoustic Piano' },
      { program: 1, name: 'Bright Piano' },
      { program: 2, name: 'Electric Grand' },
      { program: 4, name: 'Electric Piano 1' },
      { program: 5, name: 'Electric Piano 2' },
      { program: 6, name: 'Harpsichord' },
      { program: 7, name: 'Clavinet' },
      { program: 16, name: 'Drawbar Organ' },
    ],
  },
  {
    name: 'Plucked & Mallets',
    instruments: [
      { program: 46, name: 'Harp' },
      { program: 24, name: 'Nylon Guitar' },
      { program: 25, name: 'Steel Guitar' },
      { program: 11, name: 'Vibraphone' },
      { program: 12, name: 'Marimba' },
      { program: 13, name: 'Xylophone' },
      { program: 14, name: 'Tubular Bells' },
      { program: 8, name: 'Celesta' },
    ],
  },
  {
    name: 'Bass',
    instruments: [
      { program: 32, name: 'Acoustic Bass' },
      { program: 33, name: 'Electric Bass (finger)' },
      { program: 34, name: 'Electric Bass (pick)' },
      { program: 35, name: 'Fretless Bass' },
      { program: 36, name: 'Slap Bass 1' },
      { program: 37, name: 'Slap Bass 2' },
      { program: 38, name: 'Synth Bass 1' },
      { program: 39, name: 'Synth Bass 2' },
    ],
  },
  {
    name: 'Guitar',
    instruments: [
      { program: 24, name: 'Nylon Guitar' },
      { program: 25, name: 'Steel Guitar' },
      { program: 26, name: 'Jazz Guitar' },
      { program: 27, name: 'Clean Guitar' },
      { program: 28, name: 'Muted Guitar' },
      { program: 29, name: 'Overdriven Guitar' },
      { program: 30, name: 'Distortion Guitar' },
      { program: 31, name: 'Guitar Harmonics' },
    ],
  },
  {
    name: 'Lead Synths',
    instruments: [
      { program: 80, name: 'Square Lead' },
      { program: 81, name: 'Sawtooth Lead' },
      { program: 82, name: 'Calliope Lead' },
      { program: 83, name: 'Chiff Lead' },
      { program: 84, name: 'Charang Lead' },
      { program: 85, name: 'Voice Lead' },
      { program: 86, name: 'Fifths Lead' },
      { program: 87, name: 'Bass + Lead' },
    ],
  },
  {
    name: 'Drum Kits',
    instruments: [
      { program: 128, name: 'Standard Kit' },
      { program: 136, name: 'Room Kit' },
      { program: 144, name: 'Power Kit' },
      { program: 152, name: 'Electronic Kit' },
      { program: 153, name: 'TR-808 Kit' },
      { program: 160, name: 'Jazz Kit' },
      { program: 168, name: 'Brush Kit' },
      { program: 176, name: 'Orchestra Kit' },
      { program: 184, name: 'SFX Kit' },
    ],
  },
  {
    name: 'Percussion',
    instruments: [
      { program: 112, name: 'Tinkle Bell' },
      { program: 113, name: 'Agogo' },
      { program: 114, name: 'Steel Drums' },
      { program: 115, name: 'Woodblock' },
      { program: 116, name: 'Taiko Drum' },
      { program: 117, name: 'Melodic Tom' },
      { program: 118, name: 'Synth Drum' },
      { program: 119, name: 'Reverse Cymbal' },
    ],
  },
  {
    name: 'Ethnic & World',
    instruments: [
      { program: 104, name: 'Sitar' },
      { program: 105, name: 'Banjo' },
      { program: 106, name: 'Shamisen' },
      { program: 107, name: 'Koto' },
      { program: 108, name: 'Kalimba' },
      { program: 109, name: 'Bagpipe' },
      { program: 110, name: 'Fiddle' },
      { program: 111, name: 'Shanai' },
    ],
  },
];

interface InstrumentSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProgram?: number;
  onSelect: (program: number) => void;
  suggestedPrograms?: number[];
}

export default function InstrumentSelectDialog({
  open,
  onOpenChange,
  currentProgram,
  onSelect,
  suggestedPrograms,
}: InstrumentSelectDialogProps) {
  const handleSelect = (program: number) => {
    onSelect(program);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#333] text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium text-slate-200">
            Change Instrument
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Select an instrument or drum kit for this track.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-3">
          <div className="space-y-4">
            {/* Suggested instruments for the selected genre */}
            {suggestedPrograms && suggestedPrograms.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                  Suggested for Genre
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {suggestedPrograms.map((program) => {
                    const instrument = INSTRUMENT_CATEGORIES
                      .flatMap(c => c.instruments)
                      .find(i => i.program === program);
                    if (!instrument) return null;
                    return (
                      <button
                        key={instrument.program}
                        onClick={() => handleSelect(instrument.program)}
                        className={cn(
                          'px-2 py-1.5 text-left text-[11px] rounded transition-colors',
                          'hover:bg-purple-500/20 hover:text-purple-300',
                          currentProgram === instrument.program
                            ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50'
                            : 'bg-purple-500/10 text-purple-300/80 border border-purple-500/20'
                        )}
                      >
                        <span className="text-[9px] text-purple-400/50 mr-1.5">
                          {instrument.program}
                        </span>
                        {instrument.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {INSTRUMENT_CATEGORIES.map((category) => (
              <div key={category.name}>
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {category.name}
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {category.instruments.map((instrument) => (
                    <button
                      key={instrument.program}
                      onClick={() => handleSelect(instrument.program)}
                      className={cn(
                        'px-2 py-1.5 text-left text-[11px] rounded transition-colors',
                        'hover:bg-purple-500/20 hover:text-purple-300',
                        currentProgram === instrument.program
                          ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50'
                          : 'bg-[#252525] text-slate-300'
                      )}
                    >
                      <span className="text-[9px] text-slate-500 mr-1.5">
                        {instrument.program}
                      </span>
                      {instrument.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
