import { Chapter } from '@/hooks/data';

export const ChapterCard = (props: { chapter: Chapter }) => {
  const { chapter } = props;

  return (
    <div key={chapter.id} className="relative">
      <div
        className="absolute inset-y-0 w-2"
        style={{
          backgroundColor: chapter.color || '#ffffff',
        }}
      />
      <div className="relative z-10">
        <h3 className="text-xl font-semibold">{chapter.name}</h3>
        <p className="text-sm text-muted-foreground">{chapter.description}</p>
      </div>
    </div>
  );
};
