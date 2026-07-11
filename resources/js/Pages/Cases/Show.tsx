import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import type { CaseRecord } from './types';

type TimelineItem = {
    type: string;
    label: string;
    at: string | null;
    actor: string | null;
};

type Props = {
    caseRecord: CaseRecord;
    timeline: TimelineItem[];
    can_revise: boolean;
    case_pin: string | null;
    decision_history: Array<{
        revision_number: number;
        decision: 'Approved' | 'Denied';
        comment: string | null;
        decided_by: string | null;
        decided_at: string | null;
    }>;
    resolution: {
        id: string;
        verdict: 'For Filing' | 'Dismissed' | 'Pending';
        court: string | null;
        verdict_date: string;
        status: 'Pending' | 'Approved' | 'Denied';
        revision_number: number;
        report_eligible: boolean;
    } | null;
    can_submit_resolution: boolean;
    can_revise_resolution: boolean;
};

export default function Show({ caseRecord, timeline, can_revise, case_pin, decision_history, resolution, can_submit_resolution, can_revise_resolution }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title={caseRecord.docket_number} />
            <section className="space-y-5">
                {case_pin && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
                        <p className="font-semibold">PIN</p>
                        <p className="mt-1 font-mono text-lg">{case_pin}</p>
                    </div>
                )}

                <div className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">{caseRecord.docket_number}</h1>
                            <p className="text-sm text-slate-600">Subpoena Status: {caseRecord.subpoena_status}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/cases" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                                Back
                            </Link>
                            {can_revise && (
                                <Link href={`/cases/${caseRecord.id}/edit`} className="inline-flex min-h-11 items-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900">
                                    Revise
                                </Link>
                            )}
                        </div>
                    </div>

                    <dl className="mt-5 grid gap-4 md:grid-cols-3">
                        <Detail label="Date" value={caseRecord.date} />
                        <Detail label="1st Hearing" value={caseRecord.hearing_date_1 ?? ''} />
                        <Detail label="2nd Hearing" value={caseRecord.hearing_date_2 ?? ''} />
                        <Detail label="Police Station" value={caseRecord.police_station} />
                        <Detail label="Prosecutor" value={caseRecord.assigned_prosecutor_name ?? ''} />
                        <Detail label="Created By" value={caseRecord.created_by_name ?? ''} />
                    </dl>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-5">
                        <Panel title="Crimes">
                            <ul className="space-y-2 text-sm">
                                {caseRecord.offenses.map((offense) => (
                                    <li key={offense} className="rounded-md border border-slate-200 px-3 py-2">
                                        {offense}
                                    </li>
                                ))}
                            </ul>
                        </Panel>

                        <Panel title="Parties">
                            <div className="grid gap-3 md:grid-cols-2">
                                {(caseRecord.parties ?? []).map((party, index) => (
                                    <article key={`${party.role}-${party.last_name}-${index}`} className="rounded-md border border-slate-200 p-4 text-sm">
                                        <p className="font-semibold">{party.role}</p>
                                        <p className="mt-2">{[party.first_name, party.middle_name, party.last_name, party.suffix].filter(Boolean).join(' ')}</p>
                                        <p className="mt-1 text-slate-600">{party.sex}</p>
                                        <p className="mt-2 text-slate-600">
                                            {[party.street, party.barangay, party.municipality, party.province, party.region].filter(Boolean).join(', ')}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </Panel>

                        {decision_history.length > 0 && (
                            <Panel title="Subpoena Decision History">
                                <ol className="space-y-3 text-sm">
                                    {decision_history.map((decision) => (
                                        <li key={`${decision.revision_number}-${decision.decided_at}`} className="rounded-md border border-slate-200 p-4">
                                            <p className="font-semibold">Revision {decision.revision_number}: {decision.decision}</p>
                                            <p className="mt-1 text-slate-600">{decision.decided_by} | {decision.decided_at}</p>
                                            {decision.comment && <p className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 text-red-900">{decision.comment}</p>}
                                        </li>
                                    ))}
                                </ol>
                            </Panel>
                        )}

                        <Panel title="Resolution">
                            {resolution ? (
                                <div className="space-y-4 text-sm">
                                    <dl className="grid gap-3 sm:grid-cols-2">
                                        <Detail label="Verdict" value={resolution.verdict} />
                                        <Detail label="Status" value={resolution.status} />
                                        <Detail label="Court" value={resolution.court ?? ''} />
                                        <Detail label="Verdict Date" value={resolution.verdict_date} />
                                    </dl>
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={`/resolutions/${resolution.id}`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">View Resolution</Link>
                                        {can_revise_resolution && <Link href={`/resolutions/${resolution.id}/edit`} className="inline-flex min-h-11 items-center rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900">Revise Resolution</Link>}
                                    </div>
                                </div>
                            ) : can_submit_resolution ? (
                                <Link href={`/cases/${caseRecord.id}/resolution/create`} className="inline-flex min-h-11 items-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900">Submit Resolution</Link>
                            ) : <p className="text-sm text-slate-600">No Resolution submitted.</p>}
                        </Panel>
                    </div>

                    <Panel title="Timeline">
                        <ol className="space-y-3 text-sm">
                            {timeline.map((item, index) => (
                                <li key={`${item.label}-${index}`} className="rounded-md border border-slate-200 p-3">
                                    <p className="font-semibold">{item.label}</p>
                                    <p className="mt-1 text-slate-600">{item.at ?? ''}</p>
                                    {item.actor && <p className="mt-1 text-slate-600">{item.actor}</p>}
                                </li>
                            ))}
                        </ol>
                    </Panel>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-950">{value || 'Not set'}</dd>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}
