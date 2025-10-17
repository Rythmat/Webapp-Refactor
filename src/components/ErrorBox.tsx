import { X } from 'lucide-react';
import { useState } from 'react';

export const ErrorBox = (props: { message: string; dismissible?: boolean }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="relative rounded bg-red-50 p-2 text-xs text-red-500">
      {props.message}

      {props.dismissible && (
        <button
          className="absolute right-2 top-3"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDismissed(true);
          }}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
};
