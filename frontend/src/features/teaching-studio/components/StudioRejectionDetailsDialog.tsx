import { CircleAlert, X } from 'lucide-react';
import type { StudioWorkflowStatus } from '../api/studioWorkflowApi';

type Props = {
  status: StudioWorkflowStatus;
  onClose: () => void;
};

const reviewedAtLabel = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function StudioRejectionDetailsDialog({ status, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Rejection details">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-red-700"><CircleAlert size={16} />Rejected</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Review feedback</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center text-slate-500 hover:text-slate-900" aria-label="Close rejection details"><X size={17} /></button>
        </header>
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Feedback</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{status.approval_comment || 'No feedback was provided.'}</p>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div><dt className="text-xs font-semibold text-slate-500">Reviewer</dt><dd className="mt-1 text-sm font-medium text-slate-800">{status.reviewer_name || (status.reviewed_by ? `Reviewer ${status.reviewed_by}` : 'Not available')}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-500">Rejected on</dt><dd className="mt-1 text-sm font-medium text-slate-800">{reviewedAtLabel(status.reviewed_at || status.approved_at)}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-500">Revision</dt><dd className="mt-1 text-sm font-medium text-slate-800">{status.revision_no}</dd></div>
        </dl>
        <div className="mt-6 flex justify-end"><button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Close</button></div>
      </div>
    </div>
  );
}
