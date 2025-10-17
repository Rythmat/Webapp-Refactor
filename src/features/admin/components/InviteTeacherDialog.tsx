import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
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
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AuthRoutes } from '@/constants/routes';
import { useCreateTeacherInvitation } from '@/hooks/data';

const invitationFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

interface CopyButtonProps {
  value: string;
}

const CopyButton = ({ value }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const url = new URL(window.location.href);
      url.pathname = AuthRoutes.signUpAsTeacher({ code: value });
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      toast.success('Invitation link copied to clipboard');

      // Reset copied state after a delay
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" onClick={handleCopy}>
            {copied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy invitation link</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface InviteTeacherDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InviteTeacherDialog = ({
  isOpen,
  onOpenChange,
}: InviteTeacherDialogProps) => {
  const form = useForm<z.infer<typeof invitationFormSchema>>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const createInvitation = useCreateTeacherInvitation();
  const [invitation, setInvitation] = useState<string | null>(null);

  const handleSubmit = async (data: z.infer<typeof invitationFormSchema>) => {
    try {
      const invitation = await createInvitation.mutateAsync({
        email: data.email,
      });
      toast.success('Invitation link created successfully');
      setInvitation(invitation.code);
      form.reset();
    } catch (error) {
      toast.error('Failed to create invitation');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Teacher</DialogTitle>
          <DialogDescription>
            Create an invitation link for a new teacher. You will receive a link
            to share with them.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      disabled={!!invitation}
                      placeholder="teacher@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!invitation && (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button disabled={createInvitation.isPending} type="submit">
                  {createInvitation.isPending
                    ? 'Creating...'
                    : 'Create Invitation'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
        {invitation && (
          <div className="flex flex-col items-center justify-center rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              Share this link with the teacher:
            </p>
            <div className="flex max-w-[350px] items-center gap-2">
              <span className="truncate font-mono text-sm">
                {window.location.origin +
                  AuthRoutes.signUpAsTeacher({ code: invitation })}
              </span>
              <CopyButton value={invitation} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
