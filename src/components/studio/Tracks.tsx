import { Track as TrackType, Clip } from "@/types";
import Track from "./Track";
import TimelineRuler from "./TimelineRuler";

type TracksProps = {
  tracks: TrackType[];
  totalMeasures: number;
  onTrackUpdate: (updatedTrack: Partial<TrackType> & { id: string }) => void;
  onTrackDelete: (trackId: string) => void;
  onClipAdd: (trackId: string, newClip: Clip) => void;
  onClipUpdate: (trackId: string, updatedClip: Clip) => void;
  onClipDuplicate: (trackId: string, clipId: string) => void;
  onClipDelete: (trackId: string, clipId: string) => void;
  onClipSplitAt: (trackId: string, clipId: string, splitMeasure: number) => void;
  progress: number;
  loopStart: number;
  loopEnd: number;
  isAudioReady: boolean;
  noteDuration: string;
  instruments: Map<string, any>;
  armedTrackId: string | null;
  onArmTrack: (trackId: string) => void;
  audioLevels: Record<string, number>;
  editTool: "select" | "pencil";
  measureWidth: number;
};

const Tracks = ({
  tracks,
  totalMeasures,
  onTrackUpdate,
  onTrackDelete,
  onClipAdd,
  onClipUpdate,
  onClipDuplicate,
  onClipDelete,
  onClipSplitAt,
  progress,
  loopStart,
  loopEnd,
  isAudioReady,
  noteDuration,
  instruments,
  armedTrackId,
  onArmTrack,
  audioLevels,
  editTool,
  measureWidth,
}: TracksProps) => {
  const timelineWidth = totalMeasures * measureWidth;
  const currentMeasure = progress * totalMeasures;

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/40">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Your studio is empty</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-muted/40 relative">
      <div
        className="relative"
        style={{
          width: `${24 * 16 + timelineWidth}px`, // 24rem header + timeline width
        }}
      >
        {/* Playhead and Loop Region Container */}
        <div
          className="absolute top-0 left-[24rem] h-full pointer-events-none z-10"
          style={{ width: `${timelineWidth}px` }}
        >
          {/* Loop region highlight */}
          <div
            className="absolute top-0 bottom-0 bg-primary/10 border-x border-primary/50"
            style={{
              left: `${(loopStart / totalMeasures) * 100}%`,
              width: `${((loopEnd - loopStart) / totalMeasures) * 100}%`,
            }}
          />
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500/75"
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="relative z-0">
          <TimelineRuler totalMeasures={totalMeasures} measureWidth={measureWidth} />
          <div className="space-y-0">
            {tracks.map((track) => (
              <Track
                key={track.id}
                trackData={track}
                onUpdate={onTrackUpdate}
                onDelete={onTrackDelete}
                onClipAdd={onClipAdd}
                onClipUpdate={onClipUpdate}
                onClipDuplicate={onClipDuplicate}
                onClipDelete={onClipDelete}
                onClipSplitAt={onClipSplitAt}
                isAudioReady={isAudioReady}
                noteDuration={noteDuration}
                measureWidth={measureWidth}
                timelineWidth={timelineWidth}
                instrument={instruments.get(track.id)}
                isArmed={track.id === armedTrackId}
                onArm={() => onArmTrack(track.id)}
                audioLevel={audioLevels[track.id]}
                currentMeasure={currentMeasure}
                editTool={editTool}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracks;