import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import ConfirmationDialog from '../../../Components/ConfirmationDialog';
import PageHeader from '../../../Components/PageHeader';
import {
    ReviewDecisionHistory,
    ReviewRevisionComparison,
    ReviewSummary,
    type ReviewDecisionItem,
    type ReviewRevisionMetadata,
} from '../../../Components/ReviewPresentation';
import StatusBadge from '../../../Components/StatusBadge';
import { useToast } from '../../../Components/toast';
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

type Revision = ReviewRevisionMetadata & {
    payload: Record<string, unknown>;
};

type Props = {
    caseRecord: ReviewCase;
    currentRevision: Revision | null;
    previousRevision: Revision | null;
    decisionHistory: ReviewDecisionItem[];
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
    const toast = useToast();
    const [approvalOpen, setApprovalOpen] = useState(false);
    const { flash } = usePage<PageProps>().props;
    const approval = useForm({ revision_number: caseRecord.revision_number });
    const denial = useForm({ revision_number: caseRecord.revision_number, comment: '' });
    const decisionErrors = flash.errors.decision ?? [];
    const comparisonRows = comparisonFields.map(([field, label]) => ({
        key: field,
        label,
        previousValue: formatRevisionValue(field, previousRevision?.payload[field]),
        currentValue: formatRevisionValue(field, currentRevision?.payload[field]),
    }));

    function approve(event: FormEvent) {
        event.preventDefault();
        setApprovalOpen(true);
    }

    function confirmApproval() {
        approval.post(`/subpoena-reviews/${caseRecord.id}/approve`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Subpoena approved.'),
            onFinish: () => setApprovalOpen(false),
        });
    }

    function deny(event: FormEvent) {
        event.preventDefault();
        denial.post(`/subpoena-reviews/${caseRecord.id}/deny`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Subpoena denied.'),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Review ${caseRecord.docket_number}`} />
            <section className="page-stack">
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

                <ReviewSummary
                    headingId="subpoena-summary-heading"
                    status={<StatusBadge value={caseRecord.subpoena_status} />}
                    items={[
                        {
                            label: 'Current Revision Submitted By',
                            value: currentRevision?.submitted_by ?? null,
                        },
                        {
                            label: 'Assigned Prosecutor',
                            value: caseRecord.assigned_prosecutor_name,
                        },
                        { label: 'Police Station', value: caseRecord.police_station },
                        { label: 'Crimes', value: caseRecord.offenses.join(', ') },
                        { label: 'Complainants', value: caseRecord.complainants.join(', ') },
                        { label: 'Respondents', value: caseRecord.respondents.join(', ') },
                        { label: '1st Hearing', value: caseRecord.hearing_date_1 },
                        { label: '2nd Hearing', value: caseRecord.hearing_date_2 },
                    ]}
                />

                <ReviewRevisionComparison
                    subject="Subpoena"
                    previousRevision={previousRevision}
                    currentRevision={currentRevision}
                    rows={comparisonRows}
                    description="Current submission compared with the immediately preceding revision."
                />

                <ReviewDecisionHistory decisions={decisionHistory} />

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
                            className="surface surface-body border-t-4 border-t-emerald-700"
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
                            className="surface surface-body border-t-4 border-t-red-700"
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
                <ConfirmationDialog
                    open={approvalOpen}
                    title="Approve Subpoena"
                    description={`Approve ${caseRecord.docket_number}?`}
                    confirmLabel="Approve Subpoena"
                    busy={approval.processing}
                    onCancel={() => setApprovalOpen(false)}
                    onConfirm={confirmApproval}
                />
            </section>
        </AuthenticatedLayout>
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
