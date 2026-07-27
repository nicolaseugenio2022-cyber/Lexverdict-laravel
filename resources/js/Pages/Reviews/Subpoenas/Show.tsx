import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import PageHeader from '../../../Components/PageHeader';
import StatusBadge from '../../../Components/StatusBadge';
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
    ['offenses', 'Crimes'],
    ['parties', 'Parties'],
] as const;

export default function Show({
    caseRecord,
    currentRevision,
    previousRevision,
    decisionHistory,
    can_review,
}: Props) {
    const { flash } = usePage<PageProps>().props;
    const approval = useForm({ revision_number: caseRecord.revision_number });
    const denial = useForm({ revision_number: caseRecord.revision_number, comment: '' });
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
            <section className="space-y-6">
                <PageHeader
                    eyebrow="Subpoena Review"
                    title={caseRecord.docket_number}
                    description={`Revision ${caseRecord.revision_number}`}
                    actions={
                        <Link href="/subpoena-reviews" className="btn btn-secondary">
                            Back to Queue
                        </Link>
                    }
                />

                <section className="surface p-5" aria-labelledby="subpoena-summary-heading">
                    <div className="panel-header -mx-5 -mt-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <h2 id="subpoena-summary-heading" className="panel-title">
                            Case Summary
                        </h2>
                        <StatusBadge value={caseRecord.subpoena_status} />
                    </div>
                    <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail
                            label="Current Revision Submitted By"
                            value={currentRevision?.submitted_by ?? null}
                        />
                        <Detail
                            label="Assigned Prosecutor"
                            value={caseRecord.assigned_prosecutor_name}
                        />
                        <Detail label="Police Station" value={caseRecord.police_station} />
                        <Detail label="Crimes" value={caseRecord.offenses.join(', ')} />
                        <Detail label="Complainants" value={caseRecord.complainants.join(', ')} />
                        <Detail label="Respondents" value={caseRecord.respondents.join(', ')} />
                        <Detail label="1st Hearing" value={caseRecord.hearing_date_1} />
                        <Detail label="2nd Hearing" value={caseRecord.hearing_date_2} />
                    </dl>
                </section>

                <section className="surface p-5">
                    <h2 className="section-title">Revision Comparison</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Current submission compared with the immediately preceding revision.
                    </p>
                    <div
                        className="table-scroll mt-4 hidden md:block"
                        tabIndex={0}
                        role="region"
                        aria-label="Subpoena revision comparison table"
                    >
                        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="w-44 px-4 py-3 font-semibold">Field</th>
                                    <th className="px-4 py-3 font-semibold">
                                        <span>
                                            Previous{' '}
                                            {previousRevision
                                                ? `(Revision ${previousRevision.revision_number})`
                                                : ''}
                                        </span>
                                        {previousRevision && (
                                            <span className="mt-1 block text-xs font-normal">
                                                {previousRevision.submitted_by} |{' '}
                                                {previousRevision.submitted_at}
                                            </span>
                                        )}
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        <span>
                                            Current{' '}
                                            {currentRevision
                                                ? `(Revision ${currentRevision.revision_number})`
                                                : ''}
                                        </span>
                                        {currentRevision && (
                                            <span className="mt-1 block text-xs font-normal">
                                                {currentRevision.submitted_by} |{' '}
                                                {currentRevision.submitted_at}
                                            </span>
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonFields.map(([field, label]) => (
                                    <tr key={field} className="border-b border-slate-100 align-top">
                                        <th className="px-4 py-3 font-semibold text-slate-700">
                                            {label}
                                        </th>
                                        <td className="whitespace-pre-wrap break-words px-4 py-3 text-slate-600">
                                            {formatRevisionValue(
                                                field,
                                                previousRevision?.payload[field],
                                            )}
                                        </td>
                                        <td className="whitespace-pre-wrap break-words px-4 py-3 text-slate-950">
                                            {formatRevisionValue(
                                                field,
                                                currentRevision?.payload[field],
                                            )}
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
                        aria-label="Subpoena revision comparison"
                    >
                        {comparisonFields.map(([field, label]) => (
                            <div key={field} className="py-4">
                                <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
                                <dl className="mt-3 grid gap-3">
                                    <ComparisonValue
                                        label={
                                            previousRevision
                                                ? `Previous Revision ${previousRevision.revision_number}`
                                                : 'Previous'
                                        }
                                        value={formatRevisionValue(
                                            field,
                                            previousRevision?.payload[field],
                                        )}
                                        muted
                                    />
                                    <ComparisonValue
                                        label={
                                            currentRevision
                                                ? `Current Revision ${currentRevision.revision_number}`
                                                : 'Current'
                                        }
                                        value={formatRevisionValue(
                                            field,
                                            currentRevision?.payload[field],
                                        )}
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
                        <ol className="divide-y divide-slate-200">
                            {decisionHistory.map((decision) => (
                                <li
                                    key={`${decision.revision_number}-${decision.decided_at}`}
                                    className="px-5 py-4 text-sm"
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
                                        <p className="notice notice-danger mt-2">
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
                    <section
                        className="grid gap-5 lg:grid-cols-2"
                        aria-labelledby="decision-heading"
                    >
                        <h2 id="decision-heading" className="sr-only">
                            Review decision
                        </h2>
                        <form
                            onSubmit={approve}
                            aria-busy={approval.processing}
                            className="surface border-t-4 border-t-emerald-700 p-5"
                        >
                            <h3 className="text-lg font-semibold">Approve</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                Approve the current pending revision.
                            </p>
                            <button
                                disabled={approval.processing || denial.processing}
                                type="submit"
                                className="btn btn-success mt-5"
                            >
                                {approval.processing ? 'Approving...' : 'Approve Subpoena'}
                            </button>
                        </form>

                        <form
                            onSubmit={deny}
                            aria-busy={denial.processing}
                            className="surface border-t-4 border-t-red-700 p-5"
                        >
                            <h3 className="text-lg font-semibold">Deny</h3>
                            <label htmlFor="denial-comment" className="field-label mt-3 block">
                                Comment
                                <textarea
                                    id="denial-comment"
                                    required
                                    rows={4}
                                    value={denial.data.comment}
                                    onChange={(event) =>
                                        denial.setData('comment', event.target.value)
                                    }
                                    aria-invalid={denial.errors.comment ? true : undefined}
                                    aria-describedby={
                                        denial.errors.comment ? 'denial-comment-error' : undefined
                                    }
                                    className="input mt-2"
                                />
                            </label>
                            {denial.errors.comment && (
                                <p id="denial-comment-error" role="alert" className="field-error">
                                    {denial.errors.comment}
                                </p>
                            )}
                            <button
                                disabled={approval.processing || denial.processing}
                                type="submit"
                                className="btn btn-danger mt-4"
                            >
                                {denial.processing ? 'Denying...' : 'Deny Subpoena'}
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
            <dd className="mt-1 break-words text-sm text-slate-950">{value || 'Not set'}</dd>
        </div>
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
                className={`mt-1 whitespace-pre-wrap break-words text-sm ${muted ? 'text-slate-600' : 'text-slate-950'}`}
            >
                {value}
            </dd>
        </div>
    );
}

function RevisionMeta({ label, revision }: { label: string; revision: Revision | null }) {
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

function formatRevisionValue(field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Not set';

    if (field === 'offenses' && Array.isArray(value)) {
        const labels = value.map((item) => {
            if (!isRecord(item)) return String(item);
            const name = typeof item.name === 'string' ? item.name : 'Unnamed crime';
            const lawReference =
                typeof item.law_reference === 'string' && item.law_reference
                    ? ` (${item.law_reference})`
                    : '';
            return `${name}${lawReference}`;
        });

        return labels.length > 0 ? labels.join('\n') : 'Not set';
    }

    if (field === 'parties' && Array.isArray(value)) {
        const labels = value.map((item) => {
            if (!isRecord(item)) return String(item);
            const role = typeof item.role === 'string' ? item.role : 'Party';
            const name = [item.first_name, item.middle_name, item.last_name, item.suffix]
                .filter((part): part is string => typeof part === 'string' && part.length > 0)
                .join(' ');
            const birthDate =
                typeof item.date_of_birth === 'string' && item.date_of_birth
                    ? item.date_of_birth
                    : 'Not set';
            const sex = typeof item.sex === 'string' && item.sex ? item.sex : 'Not set';
            const address = [
                item.street,
                item.barangay,
                item.municipality,
                item.province,
                item.region,
            ]
                .filter((part): part is string => typeof part === 'string' && part.length > 0)
                .join(', ');

            return `${role}: ${name || 'Name not set'}\nBirth date: ${birthDate}\nSex: ${sex}\nAddress: ${address || 'Not set'}`;
        });

        return labels.length > 0 ? labels.join('\n') : 'Not set';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    return JSON.stringify(value, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
