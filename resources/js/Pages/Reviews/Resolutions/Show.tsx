import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import PageHeader from '../../../Components/PageHeader';
import StatusBadge from '../../../Components/StatusBadge';
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

export default function Show({
    resolution,
    currentRevision,
    previousRevision,
    decisionHistory,
    can_review,
}: Props) {
    const { flash } = usePage<PageProps>().props;
    const approval = useForm({ revision_number: resolution.revision_number });
    const denial = useForm({ revision_number: resolution.revision_number, comment: '' });
    const decisionErrors = flash.errors.decision ?? [];

    function approve(event: FormEvent) {
        event.preventDefault();
        approval.post(`/resolution-reviews/${resolution.id}/approve`, {
            preserveScroll: true,
            onBefore: () =>
                window.confirm(`Approve the Resolution for ${resolution.docket_number}?`),
        });
    }
    function deny(event: FormEvent) {
        event.preventDefault();
        denial.post(`/resolution-reviews/${resolution.id}/deny`, { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Review Resolution ${resolution.docket_number}`} />
            <section className="space-y-6">
                <PageHeader
                    eyebrow="Resolution Review"
                    title={resolution.docket_number}
                    description={`Revision ${resolution.revision_number}`}
                    actions={
                        <Link href="/resolution-reviews" className="btn btn-secondary">
                            Back to Queue
                        </Link>
                    }
                />
                <section className="surface p-5" aria-labelledby="resolution-summary-heading">
                    <div className="panel-header -mx-5 -mt-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <h2 id="resolution-summary-heading" className="panel-title">
                            Case Summary
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            <StatusBadge value={resolution.verdict} />
                            <StatusBadge value={resolution.status} />
                        </div>
                    </div>
                    <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail
                            label="Current Revision Submitted By"
                            value={currentRevision?.submitted_by ?? null}
                        />
                        <Detail
                            label="Assigned Prosecutor"
                            value={resolution.assigned_prosecutor}
                        />
                        <Detail label="Police Station" value={resolution.police_station} />
                        <Detail label="Crimes" value={resolution.offenses.join(', ')} />
                        <Detail label="Complainants" value={resolution.complainants.join(', ')} />
                        <Detail label="Respondents" value={resolution.respondents.join(', ')} />
                    </dl>
                </section>

                <section className="surface p-5">
                    <h2 className="section-title">Revision Comparison</h2>
                    <div
                        className="table-scroll mt-4 hidden md:block"
                        tabIndex={0}
                        role="region"
                        aria-label="Resolution revision comparison table"
                    >
                        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="w-44 px-4 py-3 font-semibold">Field</th>
                                    <RevisionHeading label="Previous" revision={previousRevision} />
                                    <RevisionHeading label="Current" revision={currentRevision} />
                                </tr>
                            </thead>
                            <tbody>
                                {(['verdict', 'court', 'verdict_date'] as const).map((field) => (
                                    <tr key={field} className="border-b border-slate-100">
                                        <th className="px-4 py-3 font-semibold capitalize text-slate-700">
                                            {field.replace('_', ' ')}
                                        </th>
                                        <td className="px-4 py-3 text-slate-600">
                                            {previousRevision?.[field] || 'Not applicable'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-950">
                                            {currentRevision?.[field] || 'Not applicable'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div
                        className="mt-4 grid gap-3 rounded-md bg-slate-50 p-3 md:hidden"
                        aria-label="Revision submission details"
                    >
                        <RevisionMeta label="Previous" revision={previousRevision} />
                        <RevisionMeta label="Current" revision={currentRevision} />
                    </div>
                    <div
                        className="mt-4 divide-y divide-slate-200 border-y border-slate-200 md:hidden"
                        aria-label="Resolution revision comparison"
                    >
                        {(['verdict', 'court', 'verdict_date'] as const).map((field) => (
                            <div key={field} className="py-4">
                                <h3 className="text-sm font-semibold capitalize text-slate-800">
                                    {field.replace('_', ' ')}
                                </h3>
                                <dl className="mt-3 grid gap-3">
                                    <ComparisonValue
                                        label={
                                            previousRevision
                                                ? `Previous Revision ${previousRevision.revision_number}`
                                                : 'Previous'
                                        }
                                        value={previousRevision?.[field] || 'Not applicable'}
                                        muted
                                    />
                                    <ComparisonValue
                                        label={
                                            currentRevision
                                                ? `Current Revision ${currentRevision.revision_number}`
                                                : 'Current'
                                        }
                                        value={currentRevision?.[field] || 'Not applicable'}
                                    />
                                </dl>
                            </div>
                        ))}
                    </div>
                </section>

                {decisionHistory.length > 0 && (
                    <section className="surface overflow-hidden">
                        <div className="panel-header px-5 py-4">
                            <h2 className="panel-title">Decision History</h2>
                        </div>
                        <ol className="divide-y divide-slate-200 text-sm">
                            {decisionHistory.map((decision) => (
                                <li
                                    key={`${decision.revision_number}-${decision.decided_at}`}
                                    className="px-5 py-4"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold">
                                            Revision {decision.revision_number}
                                        </p>
                                        <StatusBadge value={decision.decision} />
                                    </div>
                                    <p className="mt-1 text-slate-600">
                                        {decision.decided_by} | {decision.decided_at}
                                    </p>
                                    {decision.comment && (
                                        <p className="notice notice-danger mt-3 whitespace-pre-wrap">
                                            {decision.comment}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {decisionErrors.map((error) => (
                    <p key={error} role="alert" className="notice notice-danger">
                        {error}
                    </p>
                ))}
                {can_review && (
                    <section className="grid gap-5 lg:grid-cols-2" aria-label="Resolution decision">
                        <form
                            onSubmit={approve}
                            aria-busy={approval.processing}
                            className="surface border-t-4 border-t-emerald-700 p-5"
                        >
                            <h2 className="text-lg font-semibold">Approve</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                Approve the current pending Resolution revision.
                            </p>
                            <button
                                type="submit"
                                disabled={approval.processing || denial.processing}
                                className="btn btn-success mt-5"
                            >
                                {approval.processing ? 'Approving...' : 'Approve Resolution'}
                            </button>
                        </form>
                        <form
                            onSubmit={deny}
                            aria-busy={denial.processing}
                            className="surface border-t-4 border-t-red-700 p-5"
                        >
                            <h2 className="text-lg font-semibold">Deny</h2>
                            <label
                                htmlFor="resolution-denial-comment"
                                className="field-label mt-3 block"
                            >
                                Comment
                                <textarea
                                    id="resolution-denial-comment"
                                    required
                                    rows={4}
                                    value={denial.data.comment}
                                    onChange={(event) =>
                                        denial.setData('comment', event.target.value)
                                    }
                                    aria-invalid={denial.errors.comment ? true : undefined}
                                    aria-describedby={
                                        denial.errors.comment
                                            ? 'resolution-denial-comment-error'
                                            : undefined
                                    }
                                    className="input mt-2"
                                />
                            </label>
                            {denial.errors.comment && (
                                <p
                                    id="resolution-denial-comment-error"
                                    role="alert"
                                    className="field-error"
                                >
                                    {denial.errors.comment}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={approval.processing || denial.processing}
                                className="btn btn-danger mt-4"
                            >
                                {denial.processing ? 'Denying...' : 'Deny Resolution'}
                            </button>
                        </form>
                    </section>
                )}
            </section>
        </AuthenticatedLayout>
    );
}

function Detail({ label, value }: { label: string; value: string | null }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-950">{value || 'Not set'}</dd>
        </div>
    );
}
function RevisionHeading({
    label,
    revision,
}: {
    label: string;
    revision: ResolutionRevision | null;
}) {
    return (
        <th className="px-4 py-3 font-semibold">
            <span>
                {label} {revision ? `(Revision ${revision.revision_number})` : ''}
            </span>
            {revision && (
                <span className="mt-1 block text-xs font-normal">
                    {revision.submitted_by} | {revision.submitted_at}
                </span>
            )}
        </th>
    );
}
function ComparisonValue({
    label,
    value,
    muted = false,
}: {
    label: string;
    value: string;
    muted?: boolean;
}) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd
                className={`mt-1 break-words text-sm ${muted ? 'text-slate-600' : 'text-slate-950'}`}
            >
                {value}
            </dd>
        </div>
    );
}

function RevisionMeta({ label, revision }: { label: string; revision: ResolutionRevision | null }) {
    return (
        <div>
            <p className="text-xs font-semibold text-slate-600">
                {label} {revision ? `Revision ${revision.revision_number}` : 'Revision'}
            </p>
            <p className="mt-1 text-sm text-slate-800">
                Submitted by {revision?.submitted_by ?? 'Not set'} |{' '}
                {revision?.submitted_at ?? 'Not set'}
            </p>
        </div>
    );
}
