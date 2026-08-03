import type { ReactNode } from 'react';
import OperationalTimestamp from './OperationalTimestamp';
import StatusBadge from './StatusBadge';

export type ReviewRevisionMetadata = {
    revision_number: number;
    submitted_by: string | null;
    submitted_at: string | null;
};

export type ReviewComparisonRow = {
    key: string;
    label: string;
    previousValue: string;
    currentValue: string;
};

export type ReviewDecisionItem = {
    revision_number: number;
    decision: 'Approved' | 'Denied';
    comment: string | null;
    decided_by: string | null;
    decided_at: string | null;
};

type ReviewSummaryItem = {
    label: string;
    value: string | null;
};

type ReviewSummaryProps = {
    headingId: string;
    status: ReactNode;
    items: ReviewSummaryItem[];
};

export function ReviewSummary({ headingId, status, items }: ReviewSummaryProps) {
    return (
        <section className="surface overflow-hidden" aria-labelledby={headingId}>
            <div className="panel-header flex flex-wrap items-center justify-between gap-3">
                <h2 id={headingId} className="panel-title">
                    Case Summary
                </h2>
                <div className="flex flex-wrap gap-2">{status}</div>
            </div>
            <dl className="surface-body grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((item) => (
                    <div key={item.label}>
                        <dt className="meta-label uppercase">{item.label}</dt>
                        <dd className="mt-1 break-words text-sm text-slate-950">
                            {item.value || 'Not set'}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

type ReviewRevisionComparisonProps = {
    subject: 'Subpoena' | 'Resolution';
    previousRevision: ReviewRevisionMetadata | null;
    currentRevision: ReviewRevisionMetadata | null;
    rows: ReviewComparisonRow[];
    description?: string;
};

export function ReviewRevisionComparison({
    subject,
    previousRevision,
    currentRevision,
    rows,
    description,
}: ReviewRevisionComparisonProps) {
    return (
        <section className="surface surface-body">
            <h2 className="section-title">Revision Comparison</h2>
            {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            <div
                className="table-scroll mt-4 hidden md:block"
                tabIndex={0}
                role="region"
                aria-label={`${subject} revision comparison table`}
            >
                <table className="data-table min-w-[720px] table-fixed">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <tr>
                            <th className="table-heading w-44">Field</th>
                            <RevisionHeading label="Previous" revision={previousRevision} />
                            <RevisionHeading label="Current" revision={currentRevision} />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.key} className="border-b border-slate-100 align-top">
                                <th className="table-heading text-slate-700">{row.label}</th>
                                <td className="table-cell whitespace-pre-wrap break-words text-slate-600">
                                    {row.previousValue}
                                </td>
                                <td className="table-cell whitespace-pre-wrap break-words text-slate-950">
                                    {row.currentValue}
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
                aria-label={`${subject} revision comparison`}
            >
                {rows.map((row) => (
                    <div key={row.key} className="py-4">
                        <h3 className="text-sm font-semibold text-slate-800">{row.label}</h3>
                        <dl className="mt-3 grid gap-3">
                            <ComparisonValue
                                label={revisionLabel('Previous', previousRevision)}
                                value={row.previousValue}
                                muted
                            />
                            <ComparisonValue
                                label={revisionLabel('Current', currentRevision)}
                                value={row.currentValue}
                            />
                        </dl>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function ReviewDecisionHistory({ decisions }: { decisions: ReviewDecisionItem[] }) {
    if (decisions.length === 0) return null;

    return (
        <section className="surface overflow-hidden">
            <div className="panel-header">
                <h2 className="panel-title">Decision History</h2>
            </div>
            <ol className="divide-y divide-slate-200 text-sm">
                {decisions.map((decision) => (
                    <li
                        key={`${decision.revision_number}-${decision.decided_at}`}
                        className="px-4 py-3"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">Revision {decision.revision_number}</p>
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
        </section>
    );
}

function RevisionHeading({
    label,
    revision,
}: {
    label: 'Previous' | 'Current';
    revision: ReviewRevisionMetadata | null;
}) {
    return (
        <th className="table-heading">
            <span>
                {label} {revision ? `(Revision ${revision.revision_number})` : ''}
            </span>
            {revision && (
                <span className="mt-1 block text-xs font-normal">
                    {revision.submitted_by ?? 'Not set'} |{' '}
                    <OperationalTimestamp value={revision.submitted_at} />
                </span>
            )}
        </th>
    );
}

function RevisionMeta({
    label,
    revision,
}: {
    label: 'Previous' | 'Current';
    revision: ReviewRevisionMetadata | null;
}) {
    return (
        <div>
            <p className="meta-label">
                {label} {revision ? `Revision ${revision.revision_number}` : 'Revision'}
            </p>
            <p className="mt-1 text-sm text-slate-800">
                Submitted by {revision?.submitted_by ?? 'Not set'} |{' '}
                <OperationalTimestamp value={revision?.submitted_at ?? null} />
            </p>
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

function revisionLabel(label: 'Previous' | 'Current', revision: ReviewRevisionMetadata | null) {
    return revision ? `${label} Revision ${revision.revision_number}` : label;
}
