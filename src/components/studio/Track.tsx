import { useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { v4 as uuidv4 } from "uuid";
import { Track as TrackType, MidiClipType, Clip, AudioClipType, Note } from "@/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, Circle } from "lucide-react";
import MidiClip from "./MidiClip";
import AudioClip from "./AudioClip";
import { triggerPianoAttackRelease } from "@/audio/pianoSampler";

type TrackProps = {
  trackData: TrackType;
  onUpdate: (updatedTrack: Partial<TrackType> & { id: string }) => void;
  onDelete: (trackId: string) => void;
  onClipAdd: (trackId: string, newClip: Clip) => void;
  onClipUpdate: (trackId: string, updatedClip: Clip) => void;
  onClipDuplicate: (trackId: string, clipId: string) => void;
  onClipDelete: (trackId: string, clipId: string) => void;
  onClipSplitAt: (trackId: string, clipId: string, splitMeasure: number) => void;
  isAudioReady: boolean;
  noteDuration: string;
  measureWidth: number;
  timelineWidth: number;
  instrument: any;
  isArmed: boolean;
  onArm: () => void;
  audioLevel?: number;
  currentMeasure: number;
  editTool: "select" | "pencil";
};

type AudioObj = {
  player: Tone.Player;
  gain: Tone.Gain;
  start: number;
  audioUrl: string;
  gainDb: number;
  offsetSec: number;
  fadeInSec: number;
  fadeOutSec: number;
};

type MidiObj = {
  part: Tone.Part;
  notesHash: string;
};

function hashNotes(notes: any[]): string {
  return JSON.stringify(notes);
}

const dbToGain = (db: number) => Math.pow(10, db / 20);

// MIDI helpers
const timeToSixteenths = (time: string) => {
  const [m, b, s] = time.split(':').map(Number);
  return m * 16 + b * 4 + s;
};
const sixteenthsToTime = (six: number) => {
  const m = Math.floor(six / 16);
  const r1 = six % 16;
  const b = Math.floor(r1 / 4);
  const s = r1 % 4;
  return `${m}:${b}:${s}`;
};

const Track = ({
  trackData,
  onUpdate,
  onDelete,
  onClipAdd,
  onClipUpdate,
  onClipDuplicate,
  onClipDelete,
  onClipSplitAt,
  isAudioReady,
  noteDuration,
  measureWidth,
  timelineWidth,
  instrument,
  isArmed,
  onArm,
  audioLevel,
  currentMeasure,
  editTool,
}: TrackProps) => {
  const channel = useRef<Tone.Channel | null>(null);
  const audioObjs = useRef<Map<string, AudioObj>>(new Map());
  const midiObjs = useRef<Map<string, MidiObj>>(new Map());

  useEffect(() => {
    if (!isAudioReady || Tone.context.state !== "running") {
      for (const obj of audioObjs.current.values()) {
        obj.player.dispose();
        obj.gain.dispose();
      }
      audioObjs.current.clear();
      for (const obj of midiObjs.current.values()) {
        obj.part.dispose();
      }
      midiObjs.current.clear();
      channel.current?.dispose();
      channel.current = null;
      return;
    }

    channel.current = new Tone.Channel().toDestination();
    if (trackData.trackType === "midi" && instrument && channel.current) {
      instrument.connect(channel.current);
    }
    return () => {
      if (instrument && typeof instrument.disconnect === "function") {
        instrument.disconnect();
      }
      channel.current?.dispose();
    };
  }, [isAudioReady, instrument, trackData.trackType]);

  useEffect(() => {
    if (!isAudioReady || Tone.context.state !== "running" || !channel.current) return;
    channel.current.mute = !!trackData.isMuted;
    channel.current.solo = !!trackData.isSoloed;
    channel.current.volume.value = trackData.volume;
    channel.current.pan.value = trackData.pan;
  }, [trackData.isMuted, trackData.isSoloed, trackData.volume, trackData.pan, isAudioReady]);

  // Audio clips: player -> per-clip gain -> channel, with trim offset and fades
  useEffect(() => {
    if (!isAudioReady || Tone.context.state !== "running" || !channel.current) {
      for (const obj of audioObjs.current.values()) {
        obj.player.dispose();
        obj.gain.dispose();
      }
      audioObjs.current.clear();
      return;
    }
    if (trackData.trackType !== "audio") {
      for (const obj of audioObjs.current.values()) {
        obj.player.dispose();
        obj.gain.dispose();
      }
      audioObjs.current.clear();
      return;
    }

    // Dispose players that no longer exist
    const currentIds = new Set(trackData.clips.filter((c) => c.type === "audio").map((c) => c.id));
    for (const [clipId, obj] of audioObjs.current.entries()) {
      if (!currentIds.has(clipId)) {
        obj.player.dispose();
        obj.gain.dispose();
        audioObjs.current.delete(clipId);
      }
    }

    trackData.clips
      .filter((c) => c.type === "audio")
      .forEach((clip) => {
        const aClip = clip as AudioClipType;
        const gainDb = aClip.gainDb ?? 0;
        const offsetSec = aClip.offsetSec ?? 0;
        const fadeInSec = aClip.fadeInSec ?? 0;
        const fadeOutSec = aClip.fadeOutSec ?? 0;

        let obj = audioObjs.current.get(clip.id);
        const needsRecreate =
          !obj ||
          obj.audioUrl !== aClip.audioUrl ||
          obj.start !== aClip.start ||
          obj.offsetSec !== offsetSec ||
          obj.fadeInSec !== fadeInSec ||
          obj.fadeOutSec !== fadeOutSec;

        if (needsRecreate) {
          // Clean up old instance
          if (obj) {
            obj.player.dispose();
            obj.gain.dispose();
          }

          const startWhen = `${aClip.start}m`;
          const durSec = Tone.Time(`${aClip.duration}m`).toSeconds();

          // Loop-aware, load-safe scheduling
          const scheduleStart = (player: Tone.Player) => {
            const isStarted = Tone.Transport.state === "started";
            const isLooping = Tone.Transport.loop;
            if (isStarted && isLooping) {
              const loopStartSec = Tone.Time(Tone.Transport.loopStart).toSeconds();
              const loopEndSec = Tone.Time(Tone.Transport.loopEnd).toSeconds();
              const loopLen = Math.max(0, loopEndSec - loopStartSec);
              const cur = Tone.Transport.seconds;
              const clipStartAbs = Tone.Time(startWhen).toSeconds();
              // position of the clip start within the loop window
              const clipOffsetInLoop = loopLen > 0 ? (((clipStartAbs - loopStartSec) % loopLen) + loopLen) % loopLen : 0;
              const curOffset = loopLen > 0 ? (((cur - loopStartSec) % loopLen) + loopLen) % loopLen : 0;
              let delay = clipOffsetInLoop - curOffset;
              if (delay <= 0) delay += loopLen || 0;
              const scheduleAt = cur + Math.max(0, delay) + 0.01; // tiny epsilon
              player.sync();
              player.start(scheduleAt, offsetSec, durSec);
            } else {
              // Not looping or not started: schedule at absolute transport time
              player.sync();
              player.start(startWhen, offsetSec, durSec);
            }
          };

          const player = new Tone.Player({
            url: aClip.audioUrl,
            autostart: false,
            fadeIn: fadeInSec,
            fadeOut: fadeOutSec,
            onload: () => scheduleStart(player),
          });

          const gain = new Tone.Gain(dbToGain(gainDb));
          player.connect(gain);
          gain.connect(channel.current!);

          // If already loaded (cache), schedule immediately
          const maybeLoaded =
            (player as unknown as { loaded?: boolean }).loaded === true ||
            Boolean((player as unknown as { _buffer?: { _buffer?: unknown } })._buffer?._buffer);
          if (maybeLoaded) {
            scheduleStart(player);
          }

          audioObjs.current.set(aClip.id, {
            player,
            gain,
            start: aClip.start,
            audioUrl: aClip.audioUrl,
            gainDb,
            offsetSec,
            fadeInSec,
            fadeOutSec,
          });
        } else {
          // Update gain or fades if changed
          if (obj.gainDb !== gainDb) {
            obj.gain.gain.value = dbToGain(gainDb);
            obj.gainDb = gainDb;
          }
          if (obj.fadeInSec !== fadeInSec) {
            obj.player.fadeIn = fadeInSec;
            obj.fadeInSec = fadeInSec;
          }
          if (obj.fadeOutSec !== fadeOutSec) {
            obj.player.fadeOut = fadeOutSec;
            obj.fadeOutSec = fadeOutSec;
          }
        }
      });

    return () => {
      for (const obj of audioObjs.current.values()) {
        obj.player.dispose();
        obj.gain.dispose();
      }
      audioObjs.current.clear();
    };
  }, [trackData.clips, isAudioReady, trackData.trackType]);

  // MIDI clips
  useEffect(() => {
    if (!isAudioReady || Tone.context.state !== "running" || !channel.current || trackData.trackType !== "midi" || !instrument) {
      for (const obj of midiObjs.current.values()) {
        obj.part.dispose();
      }
      midiObjs.current.clear();
      return;
    }

    const currentIds = new Set(trackData.clips.filter((c) => c.type === "midi").map((c) => c.id));
    for (const [clipId, obj] of midiObjs.current.entries()) {
      if (!currentIds.has(clipId)) {
        obj.part.dispose();
        midiObjs.current.delete(clipId);
      }
    }

    trackData.clips
      .filter((c) => c.type === "midi")
      .forEach((clip) => {
        const notesHash = hashNotes((clip as MidiClipType).notes);
        let obj = midiObjs.current.get(clip.id);

        if (!obj || obj.notesHash !== notesHash) {
          if (obj) obj.part.dispose();

          const part = new Tone.Part((time, value) => {
            if (trackData.instrument === "drums" && instrument.kick) {
              const note = value.note.note;
              const durationSeconds = Tone.Time(value.note.duration).toSeconds();
              if (note.startsWith("C")) {
                void triggerPianoAttackRelease("C1", durationSeconds, undefined, time);
              } else if (note.startsWith("D")) {
                void triggerPianoAttackRelease("D1", durationSeconds, undefined, time);
              } else if (note.startsWith("F#")) {
                void triggerPianoAttackRelease("F#1", durationSeconds, undefined, time);
              }
            } else {
              const durationSeconds = Tone.Time(value.note.duration).toSeconds();
              void triggerPianoAttackRelease(value.note.note, durationSeconds, undefined, time);
            }
          },
          (clip as MidiClipType).notes.map((note) => ({
            time: `${(clip.start || 0) + Number(note.time.split(":")[0])}:${note.time.split(":")[1]}:${note.time.split(":")[2]}`,
            note: note,
          }))).start(0);

          midiObjs.current.set(clip.id, { part, notesHash });
        }
      });

    return () => {
      for (const obj of midiObjs.current.values()) {
        obj.part.dispose();
      }
      midiObjs.current.clear();
    };
  }, [trackData.clips, isAudioReady, instrument, trackData.trackType, trackData.instrument]);

  const handleUpdate = (key: keyof TrackType, value: any) => {
    onUpdate({ id: trackData.id, [key]: value });
  };

  // Trim logic for both audio and MIDI
  const trimClipLeft = useCallback((clip: Clip, deltaSixteenths: number) => {
    if (deltaSixteenths === 0) return clip;
    const deltaMeasures = deltaSixteenths / 16;
    if (clip.type === "audio") {
      const secondsPerMeasure = Tone.Time("1m").toSeconds();
      const newStart = Math.max(0, clip.start + deltaMeasures);
      const appliedDelta = newStart - clip.start;
      const newDuration = Math.max(1 / 16, clip.duration - appliedDelta);
      const prevOffset = (clip as AudioClipType).offsetSec || 0;
      const newOffset = Math.max(0, prevOffset + appliedDelta * secondsPerMeasure);
      return { ...(clip as AudioClipType), start: newStart, duration: newDuration, offsetSec: newOffset };
    } else {
      const newStart = Math.max(0, clip.start + deltaMeasures);
      const appliedDelta = newStart - clip.start;
      const newDuration = Math.max(1 / 16, clip.duration - appliedDelta);
      const shiftSix = Math.round(appliedDelta * 16);
      const newNotes: Note[] = (clip as MidiClipType).notes
        .map((n) => {
          const s = timeToSixteenths(n.time) - shiftSix;
          return s >= 0 ? { ...n, time: sixteenthsToTime(s) } : null;
        })
        .filter(Boolean) as Note[];
      return { ...(clip as MidiClipType), start: newStart, duration: newDuration, notes: newNotes };
    }
  }, []);

  const trimClipRight = useCallback((clip: Clip, deltaSixteenths: number) => {
    if (deltaSixteenths === 0) return clip;
    const deltaMeasures = deltaSixteenths / 16;
    const newDuration = Math.max(1 / 16, clip.duration + deltaMeasures);
    if (clip.type === "audio") {
      return { ...(clip as AudioClipType), duration: newDuration };
    } else {
      const maxSix = Math.round(newDuration * 16);
      const newNotes: Note[] = (clip as MidiClipType).notes.filter((n) => timeToSixteenths(n.time) < maxSix);
      return { ...(clip as MidiClipType), duration: newDuration, notes: newNotes };
    }
  }, []);

  const handleNormalize = async (clip: AudioClipType) => {
    try {
      const res = await fetch(clip.audioUrl, { cache: "force-cache" });
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      let peak = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i]);
          if (v > peak) peak = v;
        }
      }
      ctx.close?.();
      if (peak <= 0) return;
      const targetPeak = 0.8912509381337456; // -1 dBFS
      const gainFactor = targetPeak / peak;
      const gainDbAdd = Math.round(20 * Math.log10(gainFactor));
      const current = clip.gainDb ?? 0;
      const newDb = Math.max(-24, Math.min(24, current + gainDbAdd));
      onClipUpdate(trackData.id, { ...clip, gainDb: newDb });
    } catch (e) {
      console.error("Normalize failed", e);
    }
  };

  const onHandleDrag = (e: React.MouseEvent, side: "left" | "right", clip: Clip) => {
    e.stopPropagation();
    const startX = e.clientX;
    const initClip = clip;
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const deltaSixteenths = Math.round((dx / measureWidth) * 16);
      if (deltaSixteenths === 0) return;
      if (side === "left") {
        const trimmed = trimClipLeft(initClip, deltaSixteenths);
        onClipUpdate(trackData.id, trimmed);
      } else {
        const trimmed = trimClipRight(initClip, deltaSixteenths);
        onClipUpdate(trackData.id, trimmed);
      }
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const renderTrimHandles = (clip: Clip) => (
    <>
      <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-black/10 hover:bg-black/20" onMouseDown={(e) => onHandleDrag(e, "left", clip)} title="Trim start" />
      <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/10 hover:bg-black/20" onMouseDown={(e) => onHandleDrag(e, "right", clip)} title="Trim end" />
    </>
  );

  const handleTimelineDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAudioReady) return;
    if (trackData.trackType !== "midi") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedMeasure = Math.floor(x / measureWidth);

    const clipExists = trackData.clips.some((clip) => clickedMeasure >= clip.start && clickedMeasure < clip.start + clip.duration);
    if (!clipExists) {
      const newClip: MidiClipType = { id: uuidv4(), type: "midi", start: clickedMeasure, duration: 4, notes: [] };
      onClipAdd(trackData.id, newClip);
    }
  };

  return (
    <div className="flex border-b border-border h-28">
      <div className="w-[24rem] flex-none p-2 flex flex-col justify-between border-r bg-card">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold truncate" title={trackData.name}>
              {trackData.name}
            </h3>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete(trackData.id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground capitalize">{trackData.trackType === "midi" ? trackData.instrument : "Audio"}</p>
          {trackData.trackType === "audio" && isArmed && (
            <div className="w-full h-2 bg-muted rounded overflow-hidden mt-1">
              <div className="h-full bg-green-500 transition-all duration-50" style={{ width: `${Math.max(0, 100 + (audioLevel || -100))}%` }} />
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" className="w-8 h-8 p-0" onClick={onArm}>
            <Circle className={`h-4 w-4 transition-colors ${isArmed ? "text-red-500 fill-current" : "text-muted-foreground"}`} />
          </Button>
          <Button size="sm" variant={trackData.isMuted ? "secondary" : "outline"} className="w-8 h-8 p-0" onClick={() => handleUpdate("isMuted", !trackData.isMuted)}>
            M
          </Button>
          <Button size="sm" variant={trackData.isSoloed ? "secondary" : "outline"} className="w-8 h-8 p-0" onClick={() => handleUpdate("isSoloed", !trackData.isSoloed)}>
            S
          </Button>
          <div className="w-24">
            <span className="text-xs text-muted-foreground">Volume (dB)</span>
            <Slider defaultValue={[trackData.volume]} min={-40} max={6} step={1} onValueChange={([val]: number[]) => handleUpdate("volume", val)} />
          </div>
          <div className="w-24">
            <span className="text-xs text-muted-foreground">Pan</span>
            <Slider defaultValue={[trackData.pan]} min={-1} max={1} step={0.1} onValueChange={([val]: number[]) => handleUpdate("pan", val)} />
          </div>
        </div>
      </div>
      <div className="flex-grow bg-muted relative" style={{ minWidth: `${timelineWidth}px` }} onDoubleClick={handleTimelineDoubleClick}>
        {isAudioReady &&
          trackData.clips.map((clip) => {
            const left = clip.start * measureWidth;
            const width = Math.max(2, clip.duration * measureWidth);
            return (
              <div key={clip.id} className="absolute top-0 h-full p-1 group" style={{ left: `${left}px`, width: `${width}px` }}>
                <div className="relative h-full">
                  {renderTrimHandles(clip)}
                  {clip.type === "midi" && trackData.instrument ? (
                    <MidiClip
                      clipData={clip}
                      instrument={trackData.instrument}
                      onUpdate={(updatedClip) => onClipUpdate(trackData.id, updatedClip)}
                      onDuplicate={() => onClipDuplicate(trackData.id, clip.id)}
                      onDelete={() => onClipDelete(trackData.id, clip.id)}
                      onSplit={() => onClipSplitAt(trackData.id, clip.id, clip.start + clip.duration / 2)}
                      progress={0}
                      noteDuration={noteDuration}
                      isAudioReady={isAudioReady}
                      editTool={editTool}
                    />
                  ) : clip.type === "audio" ? (
                    <AudioClip
                      audioUrl={(clip as AudioClipType).audioUrl}
                      gainDb={(clip as AudioClipType).gainDb ?? 0}
                      fadeInSec={(clip as AudioClipType).fadeInSec ?? 0}
                      fadeOutSec={(clip as AudioClipType).fadeOutSec ?? 0}
                      onDelete={() => onClipDelete(trackData.id, clip.id)}
                      onDuplicate={() => onClipDuplicate(trackData.id, clip.id)}
                      onSplitAt={() => onClipSplitAt(trackData.id, clip.id, currentMeasure)}
                      onGainChange={(gainDb) => onClipUpdate(trackData.id, { ...(clip as AudioClipType), gainDb })}
                      onFadeChange={(fin, fout) => onClipUpdate(trackData.id, { ...(clip as AudioClipType), fadeInSec: fin, fadeOutSec: fout })}
                      onNormalize={() => handleNormalize(clip as AudioClipType)}
                      isAudioReady={isAudioReady}
                      currentMeasure={currentMeasure}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Track;
