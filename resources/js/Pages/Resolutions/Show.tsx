import { Head, Link } from '@inertiajs/react';
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
            <section className="space-y-5">
                <header className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Resolution</p>
                            <h1 className="mt-1 text-xl font-semibold">{resolution.docket_number}</h1>
                            <p className="mt-1 text-sm text-slate-600">Status: {resolution.status} | Revision {resolution.revision_number}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href={`/cases/${resolution.case_id}`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">View Case</Link>
                            {can_revise && <Link href={`/resolutions/${resolution.id}/edit`} className="inline-flex min-h-11 items-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900">Revise</Link>}
                        </div>
                    </div>
                    <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail label="Verdict" value={resolution.verdict} />
                        <Detail label="Court" value={resolution.court} />
                        <Detail label="Verdict Date" value={resolution.verdict_date} />
                        <Detail label="Current Revision Submitted By" value={resolution.submitted_by} />
                    </dl>
                </header>

                <div className="grid gap-5 lg:grid-cols-2">
                    <Panel title="Revision History">
                        <ol className="space-y-3 text-sm">
                            {revisions.map((revision) => (
                                <li key={revision.revision_number} className="rounded-md border border-slate-200 p-4">
                                    <p className="font-semibold">Revision {revision.revision_number}: {revision.verdict}</p>
                                    <p className="mt-1 text-slate-600">Court: {revision.court || 'Not applicable'}</p>
                                    <p className="mt-1 text-slate-600">Verdict Date: {revision.verdict_date}</p>
                                    <p className="mt-1 text-slate-600">{revision.submitted_by} | {revision.submitted_at}</p>
                                </li>
                            ))}
                        </ol>
                    </Panel>
                    <Panel title="Decision History">
                        {decisions.length === 0 ? <p className="text-sm text-slate-600">No decision recorded.</p> : (
                            <ol className="space-y-3 text-sm">
                                {decisions.map((decision) => (
                                    <li key={`${decision.revision_number}-${decision.decided_at}`} className="rounded-md border border-slate-200 p-4">
                                        <p className="font-semibold">Revision {decision.revision_number}: {decision.decision}</p>
                                        <p className="mt-1 text-slate-600">{decision.decided_by} | {decision.decided_at}</p>
                                        {decision.comment && <p className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 text-red-900">{decision.comment}</p>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Panel>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}

function Detail({ label, value }: { label: string; value: string | null }) {
    return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-950">{value || 'Not applicable'}</dd></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">{title}</h2><div className="mt-4">{children}</div></section>;
}
