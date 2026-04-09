import { Check, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/components/utilities';
import { KEY_OF_COLORS } from '@/constants/theme';
import { Button } from './button';
import { Input } from './input';

// Convert KEY_OF_COLORS object to array format for the color picker
const colorOptions = Object.entries(KEY_OF_COLORS).map(([key, value]) => {
  // Format the key for display with proper musical notation
  const formattedKey = key
    .replace('_SHARP', '#')
    .replace('_FLAT', 'b')
    .replace(/_/g, ' ');
  return {
    name: formattedKey,
    value,
  };
});

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close the picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorSelect = (colorValue: string | null) => {
    onChange(colorValue);
    setIsOpen(false);
  };

  const handleHexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic hex color validation
    const hexRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(hexInput)) {
      const formattedHex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
      handleColorSelect(formattedHex);
      setHexInput('');
    }
  };

  return (
    <div ref={pickerRef} className={cn('relative', className)}>
      {/* Color display button */}
      <button
        aria-label="Select color"
        className="flex size-8 items-center justify-center rounded-full border border-gray-300 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ backgroundColor: value || 'white' }}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {!value && <X className="size-4 text-gray-500" />}
      </button>

      {/* Color picker popup */}
      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-2 min-w-[280px] rounded-3xl border bg-surface-box p-6 shadow-lg">
          <div className="mb-2">
            <h3 className="mb-3 text-sm font-medium text-white">
              Musical Key Colors
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    value === null && 'ring-2 ring-offset-2',
                  )}
                  title="Clear color"
                  type="button"
                  onClick={() => handleColorSelect(null)}
                >
                  <X className="size-4 text-gray-500" />
                </button>
              </div>

              {colorOptions.map((color) => (
                <div
                  key={color.value}
                  className="flex flex-col items-center gap-1"
                >
                  <button
                    className={cn(
                      'relative flex h-10 w-10 items-center justify-center rounded-full border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
                      value === color.value &&
                        `ring ring-${color.name} ring-offset-2`,
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    type="button"
                    onClick={() => handleColorSelect(color.value)}
                  >
                    <span className="text-[14px] font-semibold text-grey-darkest">
                      {color.name}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Hex Color Input */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="mb-3 text-sm font-medium text-white">
              Custom Color
            </h3>
            <form className="flex gap-2" onSubmit={handleHexSubmit}>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
                  #
                </span>
                <Input
                  className="pl-7"
                  maxLength={6}
                  placeholder="Hex color"
                  type="text"
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="size-8 rounded-full border border-gray-300 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: hexInput.match(
                      /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
                    )
                      ? hexInput.startsWith('#')
                        ? hexInput
                        : `#${hexInput}`
                      : 'white',
                  }}
                />
                <Button type="submit">
                  <Check className="text-gray-500" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
