import { Link } from 'react-router-dom';
import { ErrorBox } from '@/components/ErrorBox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminRoutes } from '@/constants/routes';
import { usePhraseMap } from '@/hooks/data';

type PhraseMapCardProps = {
  phraseMapId: string;
};

export const PhraseMapCard = ({ phraseMapId }: PhraseMapCardProps) => {
  const { data: phraseMap, isLoading, error } = usePhraseMap(phraseMapId);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !phraseMap) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <ErrorBox message="Error loading rhythm map" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Link to={AdminRoutes.phraseMap({ id: phraseMapId })}>
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div
              className="size-4 rounded-full"
              style={{ backgroundColor: phraseMap.color || undefined }}
            />
            {phraseMap.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {phraseMap.description || 'No description'}
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div>{phraseMap.PhraseBars.length} bars</div>
            <div>{phraseMap.beatsPerBar} beats/bar</div>
            <div>{phraseMap.beatsPerMinute} BPM</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
