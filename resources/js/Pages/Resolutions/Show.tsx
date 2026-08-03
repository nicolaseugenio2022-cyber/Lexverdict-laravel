import { Head, Link } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import OperationalTimestamp from '../../Components/OperationalTimestamp';
import PageHeader from '../../Components/PageHeader';
import StatusBadge from '../../Components/StatusBadge';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import type { ResolutionDecision, ResolutionRecord, ResolutionRevision } from './types';

type Props = {
    resolution: ResolutionRecord;
    revisions: ResolutionRevision[];
    decisions: ResolutionDecision[];
    can_revise: boolean;
};

export default function Show({ resolution, revisions, decisions, can_revise }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title={`Resolution ${resolution.docket_number}`} />
            <div className="page-stack">
                <PageHeader
                    eyebrow="Resolution"
                    title={resolution.docket_number}
                    description={
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="metadata-text">Status:</span>
                            <StatusBadge value={resolution.status} />
                            <span className="metadata-text">
                                | Revision {resolution.revision_number}
                            </span>
                        </span>
                    }
                    actions={
                        <>
                            <Link
                                href={`/cases/${resolution.case_id}`}
                                className="btn btn-secondary"
                            >
                                View Case
                            </Link>
                            {can_revise && (
                                <Link
                                    href={`/resolutions/${resolution.id}/edit`}
                                    className="btn btn-primary"
                                >
                                    Revise
                                </Link>
                            )}
                        </>
                    }
                />

                <section className="surface surface-body">
                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail label="Verdict" value={resolution.verdict} />
                        <Detail label="Court" value={resolution.court} />
                        <Detail label="Verdict Date" value={resolution.verdict_date} />
                        <Detail
                            label="Current Revision Submitted By"
                            value={resolution.submitted_by}
                        />
                    </dl>
                </section>

                <div className="grid gap-5 lg:grid-cols-2">
                    <Panel title="Revision History">
                        <ol className="space-y-3 text-sm">
                            {revisions.map((revision) => (
                                <li
                                    key={revision.revision_number}
                                    className="rounded-md border border-slate-200 p-4"
                                >
                                    <p className="font-semibold">
                                        Revision {revision.revision_number}: {revision.verdict}
                                    </p>
                                    <p className="mt-1 text-slate-600">
                                        Court: {revision.court || 'Not applicable'}
                                    </p>
                                    <p className="mt-1 text-slate-600">
                                        Verdict Date: {revision.verdict_date}
                                    </p>
                                    <p className="mt-1 text-slate-600">
                                        {revision.submitted_by} |{' '}
                                        <OperationalTimestamp value={revision.submitted_at} />
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </Panel>
                    <Panel title="Decision History">
                        {decisions.length === 0 ? (
                            <EmptyState title="No Resolution decision has been recorded." />
                        ) : (
                            <ol className="space-y-3 text-sm">
                                {decisions.map((decision) => (
                                    <li
                                        key={`${decision.revision_number}-${decision.decided_at}`}
                                        className="rounded-md border border-slate-200 p-4"
                                    >
                                        <p className="font-semibold">
                                            Revision {decision.revision_number}: {decision.decision}
                                        </p>
                                        <p className="mt-1 text-slate-600">
                                            {decision.decided_by} |{' '}
                                            <OperationalTimestamp value={decision.decided_at} />
                                        </p>
                                        {decision.comment && (
                                            <p className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
                                                {decision.comment}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Panel>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Detail({ label, value }: { label: string; value: string | null }) {
    return (
        <div>
            <dt className="meta-label uppercase">{label}</dt>
            <dd className="mt-1 text-sm text-slate-950">{value || 'Not applicable'}</dd>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="surface surface-body">
            <h2 className="section-title">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}
