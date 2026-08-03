import { Head, Link } from '@inertiajs/react';
import { formatAuditAction, formatAuditSubjectType } from '../../../Components/audit';
import AuditTimestamp from '../../../Components/AuditTimestamp';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import StatusBadge from '../../../Components/StatusBadge';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type Event = {
    log_id: string;
    user_id: string | null;
    full_name: string | null;
    role: string | null;
    action: string;
    timestamp: string | null;
    subject_type: string | null;
    subject_id: string | null;
    changes: unknown;
    ip_address: string | null;
    user_agent: string | null;
    correlation_id: string | null;
};

export default function Show({ event }: { event: Event }) {
    return (
        <AuthenticatedLayout>
            <Head title="Audit Event" />
            <div className="page-stack">
                <PageHeader
                    eyebrow="User Action Logs"
                    title={formatAuditAction(event.action)}
                    description="Recorded event detail"
                    actions={
                        <Link href="/admin/audit" className="btn btn-secondary">
                            Back to User Action Logs
                        </Link>
                    }
                />

                <section className="surface surface-body" aria-labelledby="event-summary-heading">
                    <h2 id="event-summary-heading" className="section-title">
                        Event Summary
                    </h2>
                    <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Detail label="Actor" value={event.full_name ?? 'System'} />
                        <Detail label="Role" value={event.role ?? 'System'} />
                        <div className="min-w-0">
                            <dt className="meta-label">Timestamp</dt>
                            <dd className="mt-1">
                                <AuditTimestamp
                                    value={event.timestamp}
                                    showExact
                                    className="text-sm text-slate-950"
                                />
                            </dd>
                        </div>
                        <Detail
                            label="Target Type"
                            value={formatAuditSubjectType(event.subject_type)}
                        />
                    </dl>
                </section>

                <section className="surface overflow-hidden" aria-labelledby="changes-heading">
                    <div className="panel-header">
                        <h2 id="changes-heading" className="panel-title">
                            Changes
                        </h2>
                    </div>
                    <AuditChanges value={event.changes} />
                </section>

                <details className="surface surface-body group">
                    <summary className="cursor-pointer font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2">
                        Technical identifiers
                    </summary>
                    <dl className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2">
                        <Detail label="Log ID" value={event.log_id} mono />
                        <Detail label="Event Type" value={event.action} mono />
                        <Detail label="User ID" value={event.user_id ?? 'System'} mono />
                        <Detail label="Subject Type" value={event.subject_type} mono />
                        <Detail label="Subject ID" value={event.subject_id} mono />
                        <Detail label="Correlation ID" value={event.correlation_id} mono />
                        <Detail label="IP Address" value={event.ip_address} mono />
                        <Detail label="User Agent" value={event.user_agent} />
                    </dl>
                </details>
            </div>
        </AuthenticatedLayout>
    );
}

function AuditChanges({ value }: { value: unknown }) {
    if (value === null || value === undefined) {
        return <EmptyState title="No recorded changes" />;
    }

    if (!isRecord(value)) return <AuditValue value={value} className="px-4 py-3" />;

    const entries = Object.entries(value);
    if (entries.length === 0) {
        return <EmptyState title="No recorded changes" />;
    }

    const transition = storedTransition(value);
    const remainingEntries = transition
        ? entries.filter(([key]) => key !== 'from' && key !== 'to')
        : entries;

    return (
        <div>
            {transition && <AuditTransition from={transition.from} to={transition.to} />}
            {remainingEntries.length > 0 && <AuditRecord entries={remainingEntries} />}
        </div>
    );
}

function AuditRecord({
    entries,
    nested = false,
}: {
    entries: [string, unknown][];
    nested?: boolean;
}) {
    return (
        <dl className={nested ? 'rounded-md border border-slate-200' : 'divide-y divide-slate-200'}>
            {entries.map(([key, value]) => {
                const readableKey = humanize(key);

                return (
                    <div
                        key={key}
                        className={`grid gap-1 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-5 ${nested ? 'border-b border-slate-200 last:border-b-0' : ''}`}
                    >
                        <dt className="min-w-0 text-sm font-medium text-slate-700">
                            <span>{readableKey}</span>
                            {readableKey !== key && (
                                <span className="mt-0.5 block break-all font-mono text-[0.6875rem] font-normal text-slate-500">
                                    {key}
                                </span>
                            )}
                        </dt>
                        <dd className="min-w-0">
                            <AuditValue value={value} />
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}

function AuditValue({ value, className = '' }: { value: unknown; className?: string }) {
    if (value === null) return <p className={`text-sm text-slate-700 ${className}`}>Null</p>;
    if (value === undefined) {
        return <p className={`text-sm text-slate-700 ${className}`}>Value unavailable</p>;
    }
    if (value === '') return <p className={`text-sm text-slate-700 ${className}`}>Empty string</p>;

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <p className={`text-sm text-slate-700 ${className}`}>Empty array</p>;
        }

        return (
            <ol className={`grid list-decimal gap-2 pl-5 text-sm text-slate-900 ${className}`}>
                {value.map((item, index) => (
                    <li key={index} className="min-w-0 pl-1">
                        <AuditValue value={item} />
                    </li>
                ))}
            </ol>
        );
    }

    if (isRecord(value)) {
        const entries = Object.entries(value);

        return entries.length > 0 ? (
            <AuditRecord entries={entries} nested />
        ) : (
            <p className={`text-sm text-slate-700 ${className}`}>Empty object</p>
        );
    }

    return (
        <p className={`break-words whitespace-pre-wrap text-sm text-slate-900 ${className}`}>
            {String(value)}
        </p>
    );
}

function AuditTransition({ from, to }: { from: string; to: string }) {
    return (
        <section
            aria-label="Recorded transition"
            className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end"
        >
            <div>
                <p className="meta-label">From</p>
                <div className="mt-1">
                    <StatusBadge value={from} />
                </div>
            </div>
            <span className="hidden pb-1 text-sm text-slate-500 sm:inline" aria-hidden="true">
                to
            </span>
            <div>
                <p className="meta-label">To</p>
                <div className="mt-1">
                    <StatusBadge value={to} />
                </div>
            </div>
        </section>
    );
}

function Detail({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string | null;
    mono?: boolean;
}) {
    return (
        <div className="min-w-0">
            <dt className="meta-label">{label}</dt>
            <dd
                className={`mt-1 break-words text-sm text-slate-950 ${mono ? 'font-mono text-xs' : ''}`}
            >
                {value ?? 'N/A'}
            </dd>
        </div>
    );
}

function humanize(value: string) {
    return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function storedTransition(value: Record<string, unknown>) {
    return typeof value.from === 'string' &&
        value.from !== '' &&
        typeof value.to === 'string' &&
        value.to !== ''
        ? { from: value.from, to: value.to }
        : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
