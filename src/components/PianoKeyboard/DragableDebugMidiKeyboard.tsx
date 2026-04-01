import Draggable from 'react-draggable';
import { PianoKeyboard } from './PianoKeyboard';

export const DragableDebugMidiKeyboard = ({
  eventTarget,
}: {
  eventTarget: EventTarget;
}) => {
  return (
    <Draggable>
      <div className="fixed inset-x-0 bottom-0 flex h-20 w-[80vw] items-center justify-center bg-black">
        <PianoKeyboard
          onKeyClick={(midiNumber) => {
            const noteOn = new MIDIMessageEvent('midimessage', {
              data: new Uint8Array([0x90, midiNumber, 100]),
            });
            const noteOff = new MIDIMessageEvent('midimessage', {
              data: new Uint8Array([0x80, midiNumber, 0]),
            });

            eventTarget?.dispatchEvent(noteOn);
            setTimeout(() => eventTarget?.dispatchEvent(noteOff), 500);
          }}
        />
      </div>
    </Draggable>
  );
};
