import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import ConfirmationDialog from '../../../Components/ConfirmationDialog';
import PageHeader from '../../../Components/PageHeader';
import {
    ReviewDecisionHistory,
    ReviewRevisionComparison,
    ReviewSummary,
} from '../../../Components/ReviewPresentation';
import StatusBadge from '../../../Components/StatusBadge';
import { useToast } from '../../../Components/toast';
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

const comparisonFields = [
    ['verdict', 'Verdict'],
    ['court', 'Court'],
    ['verdict_date', 'Verdict Date'],
] as const;

export default function Show({
    resolution,
    currentRevision,
    previousRevision,
    decisionHistory,
    can_review,
}: Props) {
    const toast = useToast();
    const [approvalOpen, setApprovalOpen] = useState(false);
    const { flash } = usePage<PageProps>().props;
    const approval = useForm({ revision_number: resolution.revision_number });
    const denial = useForm({ revision_number: resolution.revision_number, comment: '' });
    const decisionErrors = flash.errors.decision ?? [];
    const comparisonRows = comparisonFields.map(([field, label]) => ({
        key: field,
        label,
        previousValue: previousRevision?.[field] || 'Not applicable',
        currentValue: currentRevision?.[field] || 'Not applicable',
    }));

    function approve(event: FormEvent) {
        event.preventDefault();
        setApprovalOpen(true);
    }

    function confirmApproval() {
        approval.post(`/resolution-reviews/${resolution.id}/approve`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Resolution approved.'),
            onFinish: () => setApprovalOpen(false),
        });
    }
    function deny(event: FormEvent) {
        event.preventDefault();
        denial.post(`/resolution-reviews/${resolution.id}/deny`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Resolution denied.'),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Review Resolution ${resolution.docket_number}`} />
            <section className="page-stack">
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
                <ReviewSummary
                    headingId="resolution-summary-heading"
                    status={
                        <>
                            <StatusBadge value={resolution.verdict} />
                            <StatusBadge value={resolution.status} />
                        </>
                    }
                    items={[
                        {
                            label: 'Current Revision Submitted By',
                            value: currentRevision?.submitted_by ?? null,
                        },
                        { label: 'Assigned Prosecutor', value: resolution.assigned_prosecutor },
                        { label: 'Police Station', value: resolution.police_station },
                        { label: 'Crimes', value: resolution.offenses.join(', ') },
                        { label: 'Complainants', value: resolution.complainants.join(', ') },
                        { label: 'Respondents', value: resolution.respondents.join(', ') },
                    ]}
                />

                <ReviewRevisionComparison
                    subject="Resolution"
                    previousRevision={previousRevision}
                    currentRevision={currentRevision}
                    rows={comparisonRows}
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
                        aria-labelledby="resolution-decision-heading"
                    >
                        <h2 id="resolution-decision-heading" className="sr-only">
                            Resolution decision
                        </h2>
                        <form
                            onSubmit={approve}
                            aria-busy={approval.processing}
                            className="surface surface-body border-t-4 border-t-emerald-700"
                        >
                            <h3 className="text-lg font-semibold">Approve</h3>
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
                            className="surface surface-body border-t-4 border-t-red-700"
                        >
                            <h3 className="text-lg font-semibold">Deny</h3>
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
                <ConfirmationDialog
                    open={approvalOpen}
                    title="Approve Resolution"
                    description={`Approve the Resolution for ${resolution.docket_number}?`}
                    confirmLabel="Approve Resolution"
                    busy={approval.processing}
                    onCancel={() => setApprovalOpen(false)}
                    onConfirm={confirmApproval}
                />
            </section>
        </AuthenticatedLayout>
    );
}
