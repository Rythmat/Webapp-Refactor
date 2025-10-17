declare const __COMMIT_SHA__: string;

export function BetaHelp() {
  return (
    <div className="overflow-hidden whitespace-nowrap text-xs text-zinc-400">
      <div className="opacity-50">MusicAtlas Inc.</div>
      <div className="opacity-30">
        Alpha Version {__COMMIT_SHA__.slice(0, 7)}
      </div>
    </div>
  );
}
