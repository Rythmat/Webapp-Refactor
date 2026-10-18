import { Copy, Mail } from 'lucide-react';
import { useId, useState } from 'react';
import { notice } from '@/daw/shell/notice';
import { Button } from '@/daw/ui/Button';
import { DawDialog } from '@/daw/ui/DawDialog';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { cn } from '@/components/utilities';
import {
  currentReportSource,
  formatReport,
  REPORT_EMAIL,
  reportDetails,
  reportMailto,
  type ReportSource,
} from './reportDetails';

// ── Report a problem (milestone 2.11) ──────────────────────────────────────
//
// '⋯' ▸ Report a problem… and the '?' sheet's footer open it. The student
// says what happened; the dialog adds the details (reportDetails.ts) and
// copies the lot for them to send. There is no reporting endpoint, so it
// sends nothing itself; "Email it" shows only once the app has an address
// to write to (REPORT_EMAIL).

export interface ReportProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where "Email it" writes to; none hides it. */
  email?: string | null;
  /** The session to describe (read when the dialog opens by default). */
  source?: ReportSource;
}

export function ReportProblemDialog({
  open,
  onOpenChange,
  email = REPORT_EMAIL,
  source,
}: ReportProblemDialogProps) {
  const [text, setText] = useState('');
  // Read once, as the dialog opens: the window, the view, the tracks then.
  const [details] = useState(() =>
    reportDetails(source ?? currentReportSource()),
  );
  const fieldId = useId();
  const detailsId = useId();
  const report = formatReport(text, details);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      notice({ title: 'Copied' });
    } catch {
      notice({
        title: 'Couldn’t copy the report',
        description: 'Select the text and copy it yourself.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DawDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Report a problem"
      description="Say what happened, then copy the report and paste it into your message. Nothing is sent from here."
      data={{ 'data-testid': 'report-problem-dialog' }}
      footer={
        <>
          {email && (
            <Button asChild variant="secondary">
              <a
                href={reportMailto(email, report)}
                data-testid="report-problem-email"
              >
                <Mail aria-hidden />
                Email it
              </a>
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => void copy()}
            data-testid="report-problem-copy"
          >
            <Copy aria-hidden />
            Copy report
          </Button>
        </>
      }
    >
      <label
        htmlFor={fieldId}
        className={cn(TYPE_CLASS.label, 'mb-1 block text-daw-text-2')}
      >
        What happened?
      </label>
      <textarea
        id={fieldId}
        data-testid="report-problem-text"
        rows={4}
        value={text}
        placeholder="What you did, what you expected, and what happened instead"
        onChange={(e) => setText(e.target.value)}
        className={cn(
          'block w-full resize-y rounded-[var(--daw-radius-sm)] border border-daw-outline bg-daw-surface-2 px-2 py-1.5 text-daw-text placeholder:text-daw-text-3',
          TYPE_CLASS.body,
          TRANSITION,
          FOCUS_RING,
        )}
      />
      <h3
        id={detailsId}
        className={cn(TYPE_CLASS.micro, 'mt-4 pb-1.5 text-daw-text-3')}
      >
        Added to the report
      </h3>
      <dl
        aria-labelledby={detailsId}
        data-testid="report-problem-details"
        className={cn(
          'grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-[var(--daw-radius-sm)] border border-daw-hairline bg-daw-surface-1 px-3 py-2',
          TYPE_CLASS.label,
        )}
      >
        {details.map((d) => (
          <div key={d.label} className="contents">
            <dt className="text-daw-text-3">{d.label}</dt>
            <dd className="min-w-0 break-words text-daw-text-2">{d.value}</dd>
          </div>
        ))}
      </dl>
    </DawDialog>
  );
}
