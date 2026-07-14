import { zodResolver } from '@hookform/resolvers/zod';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PostClassroomsData } from '@/contexts/MusicAtlasContext/musicAtlas.generated';
import { useCreateClassroom } from '@/hooks/data';

const currentYear = new Date().getFullYear();

const classroomFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Classroom name must be at least 2 characters',
  }),
  year: z.coerce
    .number()
    .int()
    .min(currentYear - 1, {
      message: `Year must be at least ${currentYear - 1}`,
    })
    .max(currentYear + 1, {
      message: `Year must be at most ${currentYear + 1}`,
    }),
  description: z.string().optional(),
});

interface CreateClassroomDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (classroom: PostClassroomsData) => void;
}

export const CreateClassroomDialog = ({
  isOpen,
  onOpenChange,
  onCreated,
}: CreateClassroomDialogProps) => {
  const createClassroom = useCreateClassroom();

  const form = useForm<z.infer<typeof classroomFormSchema>>({
    resolver: zodResolver(classroomFormSchema),
    defaultValues: {
      name: '',
      year: currentYear,
      description: '',
    },
  });

  const handleSubmit = async (data: z.infer<typeof classroomFormSchema>) => {
    try {
      const created = await createClassroom.mutateAsync({
        name: data.name,
        year: data.year,
        description: data.description || undefined,
      });
      toast.success('Classroom created successfully');
      form.reset();
      onOpenChange(false);
      onCreated?.(created);
    } catch (error) {
      toast.error('Failed to create classroom');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.06] bg-[#141416] text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Classroom</DialogTitle>
          <DialogDescription className="text-white/60">
            Add a new classroom for your students
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
                      placeholder="e.g. Piano Class A"
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
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/85">School Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="border-white/10 bg-white/[0.02] text-white placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-0"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-white/50">
                    The academic year for this classroom
                  </FormDescription>
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
                  <FormDescription className="text-white/50">
                    Optional details about this classroom
                  </FormDescription>
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
                disabled={createClassroom.isPending}
                type="submit"
                className="rounded-full bg-white text-black hover:bg-white/85"
              >
                {createClassroom.isPending ? 'Creating…' : 'Create Classroom'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
