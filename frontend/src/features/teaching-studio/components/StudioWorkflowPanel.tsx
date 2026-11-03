import { CheckCircle2, CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react';
import type { StudioWorkflowStatus, StudioValidationProblem } from '../api/studioWorkflowApi';

type Action = 'submit' | 'approve' | 'publish';

interface Props {
  status: StudioWorkflowStatus | null;
  problems: StudioValidationProblem[];
  loading: boolean;
  action: Action | null;
  onRefresh: () => void;
  onAction: (action: Action) => void;
}

export default function StudioWorkflowPanel({ status, problems, loading, action, onRefresh, onAction }: Props) {
  const visibleProblems = problems.length ? problems : status?.validation.errors || [];
  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Publication readiness">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Publication readiness</h2>
          <p className="mt-1 text-sm text-slate-500">
            Server validation checks the current Session Plan, every Screen Script and the exact saved revision.
          </p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading || Boolean(action)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
          {loading ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Check status
        </button>
      </div>
      {status ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold capitalize text-slate-700">{status.status}</span>
          <span className="text-slate-500">Session revision {status.revision_no}</span>
          <span className="text-slate-500">· {status.validation.screen_count} Screens</span>
          {status.validation.valid
            ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 size={16} />Ready</span>
            : <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><CircleAlert size={16} />Action required</span>}
        </div>
      ) : null}
      {visibleProblems.length > 0 ? (
        <ul className="mt-4 space-y-2" role="alert">
          {visibleProblems.map((problem, index) => (
            <li key={`${problem.code}-${problem.screen_id || index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <strong>{problem.code.replaceAll('_', ' ')}:</strong> {problem.message}
            </li>
          ))}
        </ul>
      ) : null}
      {status ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!status.can_submit || Boolean(action)} onClick={() => onAction('submit')} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{action === 'submit' ? 'Submitting...' : 'Submit for review'}</button>
          <button type="button" disabled={!status.can_review || Boolean(action)} onClick={() => onAction('approve')} className="rounded-lg border border-blue-900 px-4 py-2 text-sm font-semibold text-blue-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">{action === 'approve' ? 'Approving...' : 'Approve revision'}</button>
          <button type="button" disabled={!status.can_publish || Boolean(action)} onClick={() => onAction('publish')} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{action === 'publish' ? 'Publishing...' : 'Publish'}</button>
        </div>
      ) : null}
    </section>
  );
}
