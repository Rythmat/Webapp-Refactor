interface ImageComponentProps {
  url: string;
  altText: string;
  width?: string;
}

export const ImageComponent: React.FC<ImageComponentProps> = ({
  url,
  altText,
  width,
}) => {
  if (!url) {
    return (
      <div className="my-4 text-red-500">Error: Image URL is missing.</div>
    );
  }

  const style = width ? { width: `${width}%` } : undefined;

  return (
    <img
      alt={altText || 'User uploaded image'}
      className="mx-auto my-4 block rounded"
      src={url}
      style={style}
    />
  );
};

ImageComponent.displayName = 'ImageComponent';
