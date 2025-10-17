import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreatePage } from '@/hooks/data';

interface AddPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
}

const newPageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required'),
  color: z.string().optional(),
});

export const AddPageDialog = ({
  open,
  onOpenChange,
  chapterId,
}: AddPageDialogProps) => {
  const createPage = useCreatePage();

  const form = useForm<z.infer<typeof newPageSchema>>({
    resolver: zodResolver(newPageSchema),
    defaultValues: {
      name: 'New Page',
      content: 'Write your content here...',
      color: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof newPageSchema>) => {
    try {
      await createPage.mutateAsync({
        chapterId,
        content: values.content,
        color: values.color,
        name: values.name,
      });

      toast.success('Page created successfully');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create page');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form state when dialog closes
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Page</DialogTitle>
          <DialogDescription>
            Create a new page for this chapter.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-2">
                    <FormLabel>
                      Color{' '}
                      <span className="text-xs text-muted-foreground">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        value={field.value || null}
                        onChange={(color) => field.onChange(color || undefined)}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={createPage.isPending} type="submit">
                {createPage.isPending ? 'Creating...' : 'Create Page'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
