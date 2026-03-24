interface YouTubePlayerProps {
  videoId: string;
  width?: number;
  height?: number;
  showControls?: boolean;
  minimalUI?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  width = 560,
  height = 315,
  showControls = true,
  minimalUI = false,
}) => {
  // Build YouTube embed URL with parameters to hide controls/branding
  const buildEmbedUrl = () => {
    let url = `https://www.youtube.com/embed/${videoId}?`;

    // Control UI elements
    if (!showControls) url += 'controls=0&';
    if (minimalUI) {
      url += 'modestbranding=1&rel=0&showinfo=0&fs=0&iv_load_policy=3&';
    }

    // Remove trailing & or ?
    return url.endsWith('&') ? url.slice(0, -1) : url;
  };

  return (
    <div className="aspect-video">
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={!minimalUI}
        className="size-full rounded border-0"
        height={height}
        src={buildEmbedUrl()}
        title="YouTube video player"
        width={width}
      ></iframe>
    </div>
  );
};
