import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useClassroomDetailsByCode, useJoinClassroom } from '@/hooks/data';

const codeFormSchema = z.object({
  classroomCode: z
    .string()
    .length(8, 'Classroom code must be exactly 8 characters')
    .regex(
      new RegExp(REGEXP_ONLY_DIGITS_AND_CHARS),
      'Invalid classroom code format',
    ),
});

type JoinClassroomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const JoinClassroomDialog = ({
  open,
  onOpenChange,
}: JoinClassroomDialogProps) => {
  const [classroomCode, setClassroomCode] = useState<string>();
  const {
    data: classroom,
    error: classroomError,
    isFetching: isFetchingClassroom,
  } = useClassroomDetailsByCode(classroomCode);

  const {
    mutate: joinClassroom,
    isPending: isJoining,
    error: joinError,
    reset: resetJoinMutation, // Function to clear mutation state
  } = useJoinClassroom();

  const codeForm = useForm<z.infer<typeof codeFormSchema>>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: {
      classroomCode: '',
    },
  });

  const handleOpenChange = (newOpenState: boolean) => {
    if (!newOpenState) {
      // Reset state when closing
      codeForm.reset();
      setClassroomCode(undefined);
      resetJoinMutation(); // Clear join mutation state
    }
    onOpenChange(newOpenState);
  };

  const onCodeSubmit = useCallback(
    async (data: z.infer<typeof codeFormSchema>) => {
      setClassroomCode(data.classroomCode);
    },
    [],
  );

  const handleJoin = () => {
    if (!classroomCode) return;
    joinClassroom(
      { code: classroomCode },
      {
        onSuccess: () => {
          handleOpenChange(false); // Close dialog on success
        },
      },
    );
  };

  // Automatically trigger validation/fetch when 8 chars are entered
  useEffect(() => {
    const subscription = codeForm.watch((value, { name }) => {
      if (name === 'classroomCode' && value.classroomCode?.length === 8) {
        codeForm.handleSubmit(onCodeSubmit)();
      } else if (
        name === 'classroomCode' &&
        value.classroomCode?.length !== 8
      ) {
        // Clear details if code changes and is no longer valid
        setClassroomCode(undefined);
        resetJoinMutation();
      }
    });
    return () => subscription.unsubscribe();
  }, [codeForm, onCodeSubmit, resetJoinMutation]);

  const isValidCodeEntered = codeForm.formState.isValid && classroomCode;
  const showDetails = isValidCodeEntered && !isFetchingClassroom && classroom;
  const showError =
    (isValidCodeEntered && !isFetchingClassroom && classroomError) || joinError;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-white/[0.06] bg-[#141416] text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white">Join a Classroom</DialogTitle>
          <DialogDescription className="text-white/60">
            Enter the 8-character code provided by your teacher.
          </DialogDescription>
        </DialogHeader>
        <Form {...codeForm}>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <FormField
              control={codeForm.control}
              name="classroomCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/85">Class Code</FormLabel>
                  <FormControl>
                    <InputOTP
                      maxLength={8}
                      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                      {...field}
                      autoFocus
                      disabled={isJoining}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                      <InputOTPGroup>
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                        <InputOTPSlot index={6} />
                        <InputOTPSlot index={7} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {isFetchingClassroom && (
          <div className="mt-4 flex items-center justify-center text-white/60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying code…
          </div>
        )}

        {showDetails && (
          <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
            <h3 className="text-lg font-medium text-white">
              Join {classroom.name}?
            </h3>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span>Teacher: {classroom.teacherName}</span>
              <span>Year: {classroom.year}</span>
              {classroom.description && <span>{classroom.description}</span>}
            </div>
          </div>
        )}

        {showError && (
          <Alert className="mt-4" variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              {classroomError
                ? 'Invalid or expired classroom code.'
                : joinError
                  ? `Failed to join classroom. ${joinError.message || ''}`
                  : 'An error occurred.'}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4">
          <Button
            disabled={isJoining}
            variant="outline"
            className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!showDetails || isJoining || !!joinError}
            type="button"
            className="rounded-full bg-white text-black hover:bg-white/85"
            onClick={handleJoin}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining…
              </>
            ) : (
              'Join Classroom'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
