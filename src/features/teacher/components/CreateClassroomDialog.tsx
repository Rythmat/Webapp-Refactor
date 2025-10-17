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
}

export const CreateClassroomDialog = ({
  isOpen,
  onOpenChange,
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
      await createClassroom.mutateAsync({
        name: data.name,
        year: data.year,
        description: data.description || undefined,
      });
      toast.success('Classroom created successfully');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create classroom');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Classroom</DialogTitle>
          <DialogDescription>
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
                  <FormLabel>Classroom Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Piano Class A" {...field} />
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
                  <FormLabel>School Year</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      placeholder="Brief description of this classroom"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
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
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button disabled={createClassroom.isPending} type="submit">
                {createClassroom.isPending ? 'Creating...' : 'Create Classroom'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
