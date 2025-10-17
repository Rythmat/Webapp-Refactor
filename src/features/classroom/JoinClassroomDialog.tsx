import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Classroom</DialogTitle>
          <DialogDescription>
            Enter the 8-character code provided by your teacher.
          </DialogDescription>
        </DialogHeader>
        <Form {...codeForm}>
          <form
            className="space-y-4"
            onSubmit={(e) => e.preventDefault()} // Prevent default form submission
          >
            <FormField
              control={codeForm.control}
              name="classroomCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Code</FormLabel>
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
          <div className="mt-4 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Verifying code...
          </div>
        )}

        {showDetails && (
          <Card className="mt-4 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Join {classroom.name}?</CardTitle>
              <CardDescription>
                Teacher: {classroom.teacherName}
                <br />
                Year: {classroom.year}
                {classroom.description && (
                  <>
                    <br />
                    {classroom.description}
                  </>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {showError && (
          <Alert className="mt-4" variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              {classroomError
                ? 'Invalid or expired classroom code.'
                : joinError
                  ? `Failed to join classroom. ${joinError.message || ''}` // Display specific API error if available
                  : 'An error occurred.'}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4">
          <Button
            disabled={isJoining}
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!showDetails || isJoining || !!joinError}
            type="button"
            onClick={handleJoin}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Joining...
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
