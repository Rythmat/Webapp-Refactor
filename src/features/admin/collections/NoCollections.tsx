import { Button } from '@/components/ui/button';
import { CollectionsIcon } from '@/components/ui/icons/collections-icon';

export const NoCollections = ({
  openInviteDialog,
}: {
  openInviteDialog: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-2 rounded-full bg-black p-4">
        <CollectionsIcon className="size-10 text-muted-foreground" />
      </div>
      <p className="text-3xl text-white">No collections yet</p>
      <p className="text-muted-foreground">
        Your library’s still in silence. Start a collection to organize your
        chapters, pages, and all the other bits and bobs.
      </p>
      <Button className="mt-5" onClick={openInviteDialog}>
        Create your first collection
      </Button>
    </div>
  );
};
