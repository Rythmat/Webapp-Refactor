import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { useUpdateClassroom } from '@/hooks/data';

const schema = z.object({
  name: z.string().min(2, {
    message: 'Classroom name must be at least 2 characters',
  }),
  description: z.string().optional(),
});

interface EditClassroomDialogProps {
  classroom: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditClassroomDialog = ({
  classroom,
  isOpen,
  onOpenChange,
}: EditClassroomDialogProps) => {
  const updateClassroom = useUpdateClassroom();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: classroom?.name ?? '',
      description: classroom?.description ?? '',
    },
  });

  useEffect(() => {
    if (isOpen && classroom) {
      form.reset({
        name: classroom.name,
        description: classroom.description ?? '',
      });
    }
  }, [isOpen, classroom, form]);

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    if (!classroom) return;
    try {
      await updateClassroom.mutateAsync({
        id: classroom.id,
        data: {
          name: data.name,
          description: data.description || undefined,
        },
      });
      toast.success('Classroom updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update classroom',
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.06] bg-[#141416] text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Classroom</DialogTitle>
          <DialogDescription className="text-white/60">
            Rename or update this classroom&apos;s description.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/85">
                    Classroom Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="border-white/10 bg-white/[0.02] text-white placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/85">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this classroom"
                      className="resize-none border-white/10 bg-white/[0.02] text-white placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={updateClassroom.isPending}
                type="submit"
                className="rounded-full bg-white text-black hover:bg-white/85"
              >
                {updateClassroom.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
