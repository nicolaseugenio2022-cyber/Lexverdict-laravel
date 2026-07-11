import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import type { PageProps } from '../../../types/page';

type ReviewCase = {
    id: string;
    docket_number: string;
    date: string;
    police_station: string;
    revision_number: number;
    subpoena_status: 'Pending' | 'Approved' | 'Denied';
    assigned_prosecutor_name: string | null;
    created_by_name: string | null;
    offenses: string[];
    complainants: string[];
    respondents: string[];
    hearing_date_1: string | null;
    hearing_date_2: string | null;
};

type Revision = {
    revision_number: number;
    submitted_by: string | null;
    submitted_at: string | null;
    payload: Record<string, unknown>;
};

type Decision = {
    revision_number: number;
    decision: 'Approved' | 'Denied';
    comment: string | null;
    decided_by: string | null;
    decided_at: string | null;
};

type Props = {
    caseRecord: ReviewCase;
    currentRevision: Revision | null;
    previousRevision: Revision | null;
    decisionHistory: Decision[];
    can_review: boolean;
};

const comparisonFields = [
    ['date', 'Date'],
    ['hearing_date_1', '1st Hearing'],
    ['hearing_date_2', '2nd Hearing'],
    ['police_station', 'Police Station'],
    ['offense_ids', 'Crime IDs'],
    ['parties', 'Parties'],
] as const;

export default function Show({ caseRecord, currentRevision, previousRevision, decisionHistory, can_review }: Props) {
    const { flash } = usePage<PageProps>().props;
    const approval = useForm({});
    const denial = useForm({ comment: '' });
    const decisionErrors = flash.errors.decision ?? [];

    function approve(event: FormEvent) {
        event.preventDefault();
        approval.post(`/subpoena-reviews/${caseRecord.id}/approve`, {
            preserveScroll: true,
            onBefore: () => window.confirm(`Approve ${caseRecord.docket_number}?`),
        });
    }

    function deny(event: FormEvent) {
        event.preventDefault();
        denial.post(`/subpoena-reviews/${caseRecord.id}/deny`, { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Review ${caseRecord.docket_number}`} />
            <section className="space-y-5">
                <header className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Subpoena Review</p>
                            <h1 className="mt-1 text-xl font-semibold">{caseRecord.docket_number}</h1>
                            <p className="mt-1 text-sm text-slate-600">Status: {caseRecord.subpoena_status} | Revision {caseRecord.revision_number}</p>
                        </div>
                        <Link href="/subpoena-reviews" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            Back to Queue
                        </Link>
                    </div>

                    <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail label="Submitted By" value={caseRecord.created_by_name} />
                        <Detail label="Assigned Prosecutor" value={caseRecord.assigned_prosecutor_name} />
                        <Detail label="Police Station" value={caseRecord.police_station} />
                        <Detail label="Crimes" value={caseRecord.offenses.join(', ')} />
                        <Detail label="Complainants" value={caseRecord.complainants.join(', ')} />
                        <Detail label="Respondents" value={caseRecord.respondents.join(', ')} />
                        <Detail label="1st Hearing" value={caseRecord.hearing_date_1} />
                        <Detail label="2nd Hearing" value={caseRecord.hearing_date_2} />
                    </dl>
                </header>

                <section className="rounded-md border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Revision Comparison</h2>
                    <p className="mt-1 text-sm text-slate-600">Current submission compared with the immediately preceding revision.</p>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="w-44 px-4 py-3 font-semibold">Field</th>
                                    <th className="px-4 py-3 font-semibold">Previous {previousRevision ? `(Revision ${previousRevision.revision_number})` : ''}</th>
                                    <th className="px-4 py-3 font-semibold">Current {currentRevision ? `(Revision ${currentRevision.revision_number})` : ''}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonFields.map(([field, label]) => (
                                    <tr key={field} className="border-b border-slate-100 align-top">
                                        <th className="px-4 py-3 font-semibold text-slate-700">{label}</th>
                                        <td className="whitespace-pre-wrap break-words px-4 py-3 text-slate-600">{formatValue(previousRevision?.payload[field])}</td>
                                        <td className="whitespace-pre-wrap break-words px-4 py-3 text-slate-950">{formatValue(currentRevision?.payload[field])}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {decisionHistory.length > 0 && (
                    <section className="rounded-md border border-slate-200 bg-white p-5">
                        <h2 className="text-lg font-semibold">Decision History</h2>
                        <ol className="mt-4 space-y-3">
                            {decisionHistory.map((decision) => (
                                <li key={`${decision.revision_number}-${decision.decided_at}`} className="rounded-md border border-slate-200 p-4 text-sm">
                                    <p className="font-semibold">Revision {decision.revision_number}: {decision.decision}</p>
                                    <p className="mt-1 text-slate-600">{decision.decided_by} | {decision.decided_at}</p>
                                    {decision.comment && <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-900">{decision.comment}</p>}
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {can_review && (
                    <section className="grid gap-5 lg:grid-cols-2" aria-labelledby="decision-heading">
                        <h2 id="decision-heading" className="sr-only">Review decision</h2>
                        <form onSubmit={approve} className="rounded-md border border-emerald-300 bg-white p-5">
                            <h3 className="text-lg font-semibold">Approve</h3>
                            <p className="mt-1 text-sm text-slate-600">Approve the current pending revision.</p>
                            <button disabled={approval.processing || denial.processing} type="submit" className="mt-5 min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                                {approval.processing ? 'Approving...' : 'Approve Subpoena'}
                            </button>
                        </form>

                        <form onSubmit={deny} className="rounded-md border border-red-300 bg-white p-5">
                            <h3 className="text-lg font-semibold">Deny</h3>
                            <label htmlFor="denial-comment" className="mt-3 block text-sm font-medium text-slate-700">
                                Comment
                                <textarea
                                    id="denial-comment"
                                    required
                                    rows={4}
                                    value={denial.data.comment}
                                    onChange={(event) => denial.setData('comment', event.target.value)}
                                    aria-describedby={denial.errors.comment ? 'denial-comment-error' : undefined}
                                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-700"
                                />
                            </label>
                            {denial.errors.comment && <p id="denial-comment-error" role="alert" className="mt-2 text-sm text-red-800">{denial.errors.comment}</p>}
                            <button disabled={approval.processing || denial.processing} type="submit" className="mt-4 min-h-11 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                                {denial.processing ? 'Denying...' : 'Deny Subpoena'}
                            </button>
                        </form>
                    </section>
                )}

                {decisionErrors.map((error) => <p key={error} role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>)}
            </section>
        </AuthenticatedLayout>
    );
}

function Detail({ label, value }: { label: string; value: string | null }) {
    return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-950">{value || 'Not set'}</dd></div>;
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Not set';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value, null, 2);
}
