import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import type { PageProps } from '../../../types/page';
import type { ResolutionDecision, ResolutionRevision } from '../../Resolutions/types';

type ReviewResolution = {
    id: string;
    case_id: string;
    docket_number: string;
    verdict: 'For Filing' | 'Dismissed';
    court: string | null;
    verdict_date: string;
    status: 'Pending' | 'Approved' | 'Denied';
    revision_number: number;
    submitted_by: string | null;
    assigned_prosecutor: string | null;
    police_station: string;
    offenses: string[];
    complainants: string[];
    respondents: string[];
};
type Props = {
    resolution: ReviewResolution;
    currentRevision: ResolutionRevision | null;
    previousRevision: ResolutionRevision | null;
    decisionHistory: ResolutionDecision[];
    can_review: boolean;
};

export default function Show({ resolution, currentRevision, previousRevision, decisionHistory, can_review }: Props) {
    const { flash } = usePage<PageProps>().props;
    const approval = useForm({ revision_number: resolution.revision_number });
    const denial = useForm({ revision_number: resolution.revision_number, comment: '' });
    const decisionErrors = flash.errors.decision ?? [];

    function approve(event: FormEvent) {
        event.preventDefault();
        approval.post(`/resolution-reviews/${resolution.id}/approve`, { preserveScroll: true, onBefore: () => window.confirm(`Approve the Resolution for ${resolution.docket_number}?`) });
    }
    function deny(event: FormEvent) {
        event.preventDefault();
        denial.post(`/resolution-reviews/${resolution.id}/deny`, { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Review Resolution ${resolution.docket_number}`} />
            <section className="space-y-5">
                <header className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div><p className="text-sm font-semibold text-blue-900">Resolution Review</p><h1 className="mt-1 text-xl font-semibold">{resolution.docket_number}</h1><p className="mt-1 text-sm text-slate-600">Status: {resolution.status} | Revision {resolution.revision_number}</p></div>
                        <Link href="/resolution-reviews" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">Back to Queue</Link>
                    </div>
                    <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail label="Current Revision Submitted By" value={currentRevision?.submitted_by ?? null} />
                        <Detail label="Assigned Prosecutor" value={resolution.assigned_prosecutor} />
                        <Detail label="Police Station" value={resolution.police_station} />
                        <Detail label="Crimes" value={resolution.offenses.join(', ')} />
                        <Detail label="Complainants" value={resolution.complainants.join(', ')} />
                        <Detail label="Respondents" value={resolution.respondents.join(', ')} />
                    </dl>
                </header>

                <section className="rounded-md border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Revision Comparison</h2>
                    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] table-fixed text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr><th className="w-44 px-4 py-3 font-semibold">Field</th><RevisionHeading label="Previous" revision={previousRevision} /><RevisionHeading label="Current" revision={currentRevision} /></tr></thead>
                        <tbody>{(['verdict', 'court', 'verdict_date'] as const).map((field) => <tr key={field} className="border-b border-slate-100"><th className="px-4 py-3 font-semibold capitalize text-slate-700">{field.replace('_', ' ')}</th><td className="px-4 py-3 text-slate-600">{previousRevision?.[field] || 'Not applicable'}</td><td className="px-4 py-3 text-slate-950">{currentRevision?.[field] || 'Not applicable'}</td></tr>)}</tbody>
                    </table></div>
                </section>

                {decisionHistory.length > 0 && <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">Decision History</h2><ol className="mt-4 space-y-3 text-sm">{decisionHistory.map((decision) => <li key={`${decision.revision_number}-${decision.decided_at}`} className="rounded-md border border-slate-200 p-4"><p className="font-semibold">Revision {decision.revision_number}: {decision.decision}</p><p className="mt-1 text-slate-600">{decision.decided_by} | {decision.decided_at}</p>{decision.comment && <p className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 text-red-900">{decision.comment}</p>}</li>)}</ol></section>}

                {decisionErrors.map((error) => <p key={error} role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>)}
                {can_review && <section className="grid gap-5 lg:grid-cols-2" aria-label="Resolution decision">
                    <form onSubmit={approve} className="rounded-md border border-emerald-300 bg-white p-5"><h2 className="text-lg font-semibold">Approve</h2><p className="mt-1 text-sm text-slate-600">Approve the current pending Resolution revision.</p><button type="submit" disabled={approval.processing || denial.processing} className="mt-5 min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{approval.processing ? 'Approving...' : 'Approve Resolution'}</button></form>
                    <form onSubmit={deny} className="rounded-md border border-red-300 bg-white p-5"><h2 className="text-lg font-semibold">Deny</h2><label htmlFor="resolution-denial-comment" className="mt-3 block text-sm font-medium text-slate-700">Comment<textarea id="resolution-denial-comment" required rows={4} value={denial.data.comment} onChange={(event) => denial.setData('comment', event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-700" /></label>{denial.errors.comment && <p role="alert" className="mt-2 text-sm text-red-800">{denial.errors.comment}</p>}<button type="submit" disabled={approval.processing || denial.processing} className="mt-4 min-h-11 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 disabled:cursor-not-allowed disabled:opacity-50">{denial.processing ? 'Denying...' : 'Deny Resolution'}</button></form>
                </section>}
            </section>
        </AuthenticatedLayout>
    );
}

function Detail({ label, value }: { label: string; value: string | null }) { return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-950">{value || 'Not set'}</dd></div>; }
function RevisionHeading({ label, revision }: { label: string; revision: ResolutionRevision | null }) { return <th className="px-4 py-3 font-semibold"><span>{label} {revision ? `(Revision ${revision.revision_number})` : ''}</span>{revision && <span className="mt-1 block text-xs font-normal">{revision.submitted_by} | {revision.submitted_at}</span>}</th>; }
