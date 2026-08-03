import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import EmptyState from '../../Components/EmptyState';
import OperationalTimestamp from '../../Components/OperationalTimestamp';
import PageHeader from '../../Components/PageHeader';
import StatusBadge from '../../Components/StatusBadge';
import { useToast } from '../../Components/toast';
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
    documents: Array<{
        id: string;
        version: number;
        template_version: string;
        requested_by: string | null;
        requested_at: string | null;
        generated_at: string | null;
        failed_at: string | null;
        sha256: string | null;
    }>;
    can_generate_subpoena: boolean;
    back_url: string;
};

export default function Show({
    caseRecord,
    timeline,
    can_revise,
    case_pin,
    decision_history,
    resolution,
    can_submit_resolution,
    can_revise_resolution,
    documents,
    can_generate_subpoena,
    back_url,
}: Props) {
    const toast = useToast();
    const [generating, setGenerating] = useState(false);
    const hasPendingDocument = documents.some(
        (document) => document.generated_at === null && document.failed_at === null,
    );

    useEffect(() => {
        if (!hasPendingDocument) return;

        let timeout: number | undefined;
        let cancelled = false;

        const poll = () => {
            router.reload({
                only: ['documents'],
                onFinish: () => {
                    if (!cancelled) {
                        timeout = window.setTimeout(poll, 2000);
                    }
                },
            });
        };

        timeout = window.setTimeout(poll, 2000);

        return () => {
            cancelled = true;
            if (timeout !== undefined) {
                window.clearTimeout(timeout);
            }
        };
    }, [hasPendingDocument]);

    function generateSubpoena() {
        if (generating) return;
        setGenerating(true);
        router.post(
            `/cases/${caseRecord.id}/documents/subpoena`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.info('Subpoena PDF generation requested.'),
                onHttpException: () => toast.error('Unable to request the Subpoena PDF.'),
                onNetworkError: () => toast.error('Unable to request the Subpoena PDF.'),
                onFinish: () => setGenerating(false),
            },
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title={caseRecord.docket_number} />
            <section className="page-stack">
                {case_pin && (
                    <div
                        className="notice notice-warning flex flex-wrap items-center justify-between gap-3"
                        role="status"
                    >
                        <p className="font-semibold">PIN</p>
                        <p className="font-mono text-xl font-semibold">{case_pin}</p>
                    </div>
                )}

                <PageHeader
                    eyebrow="Case Review"
                    title={caseRecord.docket_number}
                    actions={
                        <>
                            <Link href={back_url} className="btn btn-secondary">
                                Back to Cases
                            </Link>
                            {can_revise && (
                                <Link
                                    href={`/cases/${caseRecord.id}/edit`}
                                    className="btn btn-primary"
                                >
                                    Revise
                                </Link>
                            )}
                        </>
                    }
                />

                <section
                    className="surface overflow-hidden"
                    aria-labelledby="case-overview-heading"
                >
                    <div className="panel-header flex flex-wrap items-center justify-between gap-3">
                        <h2 id="case-overview-heading" className="panel-title">
                            Case Overview
                        </h2>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-600">Subpoena Status</span>
                            <StatusBadge value={caseRecord.subpoena_status} />
                        </div>
                    </div>
                    <dl className="surface-body grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <Detail label="Date" value={caseRecord.date} />
                        <Detail label="1st Hearing" value={caseRecord.hearing_date_1 ?? ''} />
                        <Detail label="2nd Hearing" value={caseRecord.hearing_date_2 ?? ''} />
                        <Detail label="Police Station" value={caseRecord.police_station} />
                        <Detail
                            label="Prosecutor"
                            value={caseRecord.assigned_prosecutor_name ?? ''}
                        />
                        <Detail label="Created By" value={caseRecord.created_by_name ?? ''} />
                    </dl>
                </section>

                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-5">
                        <Panel title="Crimes">
                            <ul className="divide-y divide-slate-200 border-y border-slate-200 text-sm">
                                {caseRecord.offenses.map((offense) => (
                                    <li key={offense} className="py-3 font-medium">
                                        {offense}
                                    </li>
                                ))}
                            </ul>
                        </Panel>

                        <Panel title="Parties">
                            <div className="divide-y divide-slate-200 border-y border-slate-200">
                                {(caseRecord.parties ?? []).map((party, index) => (
                                    <article
                                        key={`${party.role}-${party.last_name}-${index}`}
                                        className="grid gap-2 py-4 text-sm md:grid-cols-[140px_minmax(0,1fr)]"
                                    >
                                        <p className="font-medium text-slate-700">{party.role}</p>
                                        <div>
                                            <p className="font-medium">
                                                {[
                                                    party.first_name,
                                                    party.middle_name,
                                                    party.last_name,
                                                    party.suffix,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                            </p>
                                            <p className="mt-1 text-slate-600">{party.sex}</p>
                                            <p className="mt-1 text-slate-600">
                                                {[
                                                    party.street,
                                                    party.barangay,
                                                    party.municipality,
                                                    party.province,
                                                    party.region,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </Panel>

                        {decision_history.length > 0 && (
                            <Panel title="Subpoena Decision History">
                                <ol className="divide-y divide-slate-200 border-y border-slate-200 text-sm">
                                    {decision_history.map((decision) => (
                                        <li
                                            key={`${decision.revision_number}-${decision.decided_at}`}
                                            className="py-4"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium text-slate-950">
                                                    Revision {decision.revision_number}
                                                </p>
                                                <StatusBadge value={decision.decision} />
                                            </div>
                                            <p className="mt-1 text-slate-600">
                                                {decision.decided_by} |{' '}
                                                <OperationalTimestamp value={decision.decided_at} />
                                            </p>
                                            {decision.comment && (
                                                <p className="notice notice-danger mt-3 whitespace-pre-wrap">
                                                    {decision.comment}
                                                </p>
                                            )}
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
                                        <Detail
                                            label="Verdict Date"
                                            value={resolution.verdict_date}
                                        />
                                    </dl>
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href={`/resolutions/${resolution.id}`}
                                            className="btn btn-secondary"
                                        >
                                            View Resolution
                                        </Link>
                                        {can_revise_resolution && (
                                            <Link
                                                href={`/resolutions/${resolution.id}/edit`}
                                                className="btn btn-primary"
                                            >
                                                Revise Resolution
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ) : can_submit_resolution ? (
                                <Link
                                    href={`/cases/${caseRecord.id}/resolution/create`}
                                    className="btn btn-primary"
                                >
                                    Submit Resolution
                                </Link>
                            ) : (
                                <p className="text-sm text-slate-600">No Resolution submitted.</p>
                            )}
                        </Panel>

                        <Panel title="Subpoena PDF">
                            <div className="space-y-4 text-sm">
                                {can_generate_subpoena && (
                                    <button
                                        type="button"
                                        onClick={generateSubpoena}
                                        disabled={generating}
                                        className="btn btn-primary"
                                    >
                                        {generating ? 'Generating' : 'Generate Subpoena PDF'}
                                    </button>
                                )}
                                {documents.length === 0 ? (
                                    <EmptyState
                                        title="No generated Subpoena PDF is available."
                                        description="Generated document versions will appear here."
                                    />
                                ) : (
                                    <ol
                                        className="divide-y divide-slate-200 border-y border-slate-200"
                                        aria-live="polite"
                                    >
                                        {documents.map((document) => (
                                            <li key={document.id} className="py-4">
                                                <p className="font-medium text-slate-950">
                                                    Version {document.version}
                                                </p>
                                                <p className="mt-1 text-slate-600">
                                                    Requested by{' '}
                                                    {document.requested_by || 'Unknown'} |{' '}
                                                    <OperationalTimestamp
                                                        value={document.requested_at}
                                                    />
                                                </p>
                                                {document.generated_at ? (
                                                    <a
                                                        href={`/cases/${caseRecord.id}/documents/${document.id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="action-link mt-3 min-h-11"
                                                    >
                                                        View PDF
                                                    </a>
                                                ) : document.failed_at ? (
                                                    <p
                                                        className="mt-2 font-medium text-red-700"
                                                        role="status"
                                                    >
                                                        Generation failed
                                                    </p>
                                                ) : (
                                                    <div className="mt-2" role="status">
                                                        <StatusBadge value="Generating" />
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        </Panel>
                    </div>

                    <Panel title="Timeline">
                        <ol className="relative border-l border-slate-300 text-sm">
                            {timeline.map((item, index) => (
                                <li
                                    key={`${item.label}-${index}`}
                                    className="relative pb-5 pl-5 last:pb-0 before:absolute before:-left-1.5 before:top-1.5 before:size-3 before:rounded-full before:border-2 before:border-white before:bg-institution-800"
                                >
                                    <p className="font-medium text-slate-950">{item.label}</p>
                                    <p className="mt-1 text-slate-600">
                                        <OperationalTimestamp value={item.at} />
                                    </p>
                                    {item.actor && (
                                        <p className="mt-1 text-slate-600">{item.actor}</p>
                                    )}
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
            <dt className="meta-label uppercase">{label}</dt>
            <dd className="mt-1 text-sm text-slate-950">{value || 'Not set'}</dd>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="surface overflow-hidden">
            <div className="panel-header">
                <h2 className="panel-title">{title}</h2>
            </div>
            <div className="surface-body">{children}</div>
        </section>
    );
}
