import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminRoutes } from '@/constants/routes';
import { useCreatePlayAlong } from '@/hooks/data';

const createPlayAlongSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof createPlayAlongSchema>;

export const CreatePlayAlongModal = () => {
  const navigate = useNavigate();
  const createPlayAlong = useCreatePlayAlong();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(createPlayAlongSchema),
    defaultValues: {
      name: '',
      description: '',
      color: null,
    },
  });

  const color = watch('color');

  const onSubmit = useCallback(
    async (data: FormValues) => {
      try {
        const result = await createPlayAlong.mutateAsync({
          name: data.name,
          description: data.description || undefined,
          color: data.color,
        });

        // Navigate to the play along page
        navigate(AdminRoutes.playAlong({ id: result.id }));
      } catch (error) {
        console.error('Error creating play along:', error);
      }
    },
    [createPlayAlong, navigate],
  );

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create New Play Along</DialogTitle>
      </DialogHeader>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter play along name"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="description">
            Description
          </label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Enter description (optional)"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Color (optional)</label>
          <ColorPicker
            value={color || null}
            onChange={(value) => {
              setValue('color', value);
            }}
          />
        </div>

        <DialogFooter>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating...' : 'Create Play Along'}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
};
