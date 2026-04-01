import { X } from 'lucide-react';
import { cn } from '../utilities';
import { Dialog, DialogContent } from './dialog';

interface LightboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
  className?: string;
}

export function LightboxDialog({
  open,
  onOpenChange,
  src,
  alt,
  className,
}: LightboxDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-[95vw] border-none bg-transparent p-0 shadow-none',
          className,
        )}
      >
        <button
          className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-6 text-white" />
          <span className="sr-only">Close</span>
        </button>
        <div className="flex items-center justify-center">
          <img
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            src={src}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
