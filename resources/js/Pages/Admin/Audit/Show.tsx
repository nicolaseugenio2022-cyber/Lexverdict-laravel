import { Head, Link } from '@inertiajs/react';
import { formatAuditAction } from '../../../Components/audit';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
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
            <div className="space-y-6">
                <PageHeader
                    eyebrow="User Action Logs"
                    title={formatAuditAction(event.action)}
                    description="Recorded event detail"
                    actions={
                        <Link
                            href="/admin/audit"
                            className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                        >
                            Back to User Action Logs
                        </Link>
                    }
                />

                <section className="surface p-5" aria-labelledby="event-summary-heading">
                    <h2 id="event-summary-heading" className="text-lg font-semibold">
                        Event Summary
                    </h2>
                    <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                        <Detail label="Actor" value={event.full_name ?? 'System'} />
                        <Detail label="Role" value={event.role ?? 'System'} />
                        <Detail label="Timestamp" value={event.timestamp} />
                        <Detail label="Subject Type" value={event.subject_type} />
                    </dl>
                </section>

                <section className="surface overflow-hidden" aria-labelledby="changes-heading">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 id="changes-heading" className="text-lg font-semibold">
                            Changes
                        </h2>
                    </div>
                    <AuditChanges value={event.changes} />
                </section>

                <details className="surface group p-5">
                    <summary className="cursor-pointer font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2">
                        Technical identifiers
                    </summary>
                    <dl className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
                        <Detail label="Log ID" value={event.log_id} mono />
                        <Detail label="Event Type" value={event.action} mono />
                        <Detail label="User ID" value={event.user_id ?? 'System'} mono />
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

    if (!isRecord(value)) {
        return <p className="break-words px-5 py-4 text-sm text-slate-700">{formatValue(value)}</p>;
    }

    const entries = Object.entries(value);
    if (entries.length === 0) {
        return <EmptyState title="No recorded changes" />;
    }

    return (
        <dl className="divide-y divide-slate-200">
            {entries.map(([key, entry]) => (
                <div
                    key={key}
                    className="grid gap-1 px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6"
                >
                    <dt className="text-sm font-semibold text-slate-700">{humanize(key)}</dt>
                    <dd className="break-words whitespace-pre-wrap text-sm text-slate-900">
                        {formatValue(entry)}
                    </dd>
                </div>
            ))}
        </dl>
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
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
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

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return JSON.stringify(value, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
