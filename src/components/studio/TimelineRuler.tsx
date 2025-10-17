type TimelineRulerProps = {
  totalMeasures: number;
  measureWidth: number;
};

const TimelineRuler = ({ totalMeasures, measureWidth }: TimelineRulerProps) => {
  return (
    <div className="flex h-10 sticky top-0 z-20 bg-background">
      {/* Spacer for track controls */}
      <div
        className="w-[24rem] flex-none border-r border-b border-border bg-background"
      />
      {/* Ruler markings */}
      <div className="flex-grow flex relative border-b border-border">
        {[...Array(totalMeasures)].map((_, i) => (
          <div
            key={i}
            className="border-r border-border flex items-center justify-start pl-2 text-sm text-muted-foreground bg-muted/50"
            style={{
              width: `${measureWidth}px`,
              minWidth: `${measureWidth}px`,
            }}
          >
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineRuler;