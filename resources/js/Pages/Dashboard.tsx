import { Head, Link } from '@inertiajs/react';
import { formatAuditAction, formatAuditTimestamp } from '../Components/audit';
import AuditTimestamp from '../Components/AuditTimestamp';
import EmptyState from '../Components/EmptyState';
import type { OperationalMetric } from '../Components/OperationalSummary';
import PageHeader from '../Components/PageHeader';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';

type LinkedMetric = OperationalMetric & { href?: string };
type Activity = {
    log_id: string;
    action: string;
    timestamp: string | null;
    user: string;
    affected_record: string;
    time: string | null;
    display_title: string | null;
    display_context: string | null;
    display_detail: string | null;
    display_docket: string | null;
};

type Props = {
    metrics: OperationalMetric[];
    pending_work: LinkedMetric[];
    recent_activity: Activity[];
};

export default function Dashboard({ metrics, pending_work, recent_activity }: Props) {
    const primaryMetrics = metrics.filter((metric) =>
        ['Total Cases', 'Cases Ready for Filing', 'Active Users', 'Active Crimes'].includes(
            metric.label,
        ),
    );
    const officeMetrics = metrics.filter((metric) =>
        ['Active Prosecutors', 'Active Secretaries'].includes(metric.label),
    );
    const pendingItems = pending_work.filter((item) =>
        ['Pending Subpoenas', 'Pending Resolutions'].includes(item.label),
    );

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />
            <div className="page-stack gap-4">
                <PageHeader
                    eyebrow="Administrator"
                    title="Operational Dashboard"
                    description="Office-wide workload, review queues, and recent recorded activity."
                />

                <section aria-labelledby="primary-metrics-heading">
                    <h2 id="primary-metrics-heading" className="sr-only">
                        Primary Operational Metrics
                    </h2>
                    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {primaryMetrics.map((metric) => (
                            <div key={metric.label} className="summary-card primary-metric-card">
                                <dt className="primary-metric-label">{metric.label}</dt>
                                <dd className="primary-metric-value">
                                    {metric.value.toLocaleString()}
                                </dd>
                                <dd className="sr-only order-3">{metric.description}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)] xl:items-start">
                    <section
                        className="surface overflow-hidden"
                        aria-labelledby="recent-activity-heading"
                    >
                        <div className="panel-header flex flex-wrap items-center justify-between gap-3">
                            <h2 id="recent-activity-heading" className="panel-title">
                                Recent Activity
                            </h2>
                            <Link href="/admin/audit" className="action-link">
                                View All Activity
                            </Link>
                        </div>
                        {recent_activity.length === 0 ? (
                            <EmptyState
                                title="No recorded activity yet"
                                description="Recorded staff and system actions will appear here."
                            />
                        ) : (
                            <ol
                                className="divide-y divide-slate-200"
                                aria-label="Recent audit activity"
                            >
                                {recent_activity.map((event) => (
                                    <li key={event.log_id}>
                                        <Link
                                            href={`/admin/audit/${event.log_id}`}
                                            className="interactive-row data-row grid grid-cols-[6.25rem_minmax(0,1fr)] gap-x-3 px-4 py-2.5 sm:px-5 lg:gap-x-4"
                                            aria-label={`${event.display_title ?? formatAuditAction(event.action)}. ${event.display_context ?? event.affected_record}. ${formatAuditTimestamp(event.timestamp)}. View audit details.`}
                                        >
                                            <AuditTimestamp
                                                value={event.timestamp}
                                                className="w-full self-center text-xs font-medium leading-4 tabular-nums text-slate-500"
                                            />
                                            <div className="min-w-0">
                                                <p className="break-words font-semibold text-slate-950">
                                                    {event.display_title ??
                                                        formatAuditAction(event.action)}
                                                </p>
                                                {event.display_docket ? (
                                                    <p className="mt-0.5 truncate text-sm text-slate-600">
                                                        Case{' '}
                                                        <strong
                                                            className="font-bold text-institution-900"
                                                            title={event.display_docket}
                                                        >
                                                            {event.display_docket}
                                                        </strong>
                                                    </p>
                                                ) : (
                                                    <p
                                                        className="mt-0.5 truncate text-sm text-slate-600"
                                                        title={event.affected_record}
                                                    >
                                                        {event.affected_record}
                                                    </p>
                                                )}
                                                <p
                                                    className="mt-0.5 truncate text-sm font-medium text-slate-800"
                                                    title={event.display_detail ?? event.user}
                                                >
                                                    {event.display_detail ?? event.user}
                                                </p>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>

                    <aside className="grid gap-4" aria-label="Administrator summaries">
                        <section
                            className="surface overflow-hidden"
                            aria-labelledby="office-overview-heading"
                        >
                            <div className="panel-header">
                                <h2 id="office-overview-heading" className="panel-title">
                                    Office Overview
                                </h2>
                            </div>
                            <dl className="divide-y divide-slate-200">
                                {officeMetrics.map((metric) => (
                                    <div
                                        key={metric.label}
                                        className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                                    >
                                        <dt className="text-sm font-medium text-slate-600">
                                            {metric.label}
                                        </dt>
                                        <dd className="text-2xl font-bold tabular-nums text-institution-950">
                                            {metric.value.toLocaleString()}
                                        </dd>
                                        <dd className="sr-only">{metric.description}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <section
                            className="surface overflow-hidden"
                            aria-labelledby="pending-work-heading"
                        >
                            <div className="panel-header">
                                <h2 id="pending-work-heading" className="panel-title">
                                    Pending Work
                                </h2>
                            </div>
                            <ul className="divide-y divide-slate-200">
                                {pendingItems.map((item) => (
                                    <PendingWorkItem key={item.label} item={item} />
                                ))}
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function PendingWorkItem({ item }: { item: LinkedMetric }) {
    const content = (
        <>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                <p className="mt-0.5 text-xs leading-4 text-slate-600">{item.description}</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-lg font-bold tabular-nums text-institution-950">
                    {item.value.toLocaleString()}
                </span>
                {item.href && <span className="text-xs font-bold text-institution-800">View</span>}
            </div>
        </>
    );
    const rowClass = 'grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center';

    return item.href ? (
        <li>
            <Link
                href={item.href}
                className={`interactive-row ${rowClass}`}
                aria-label={`View ${item.label}: ${item.value.toLocaleString()}`}
            >
                {content}
            </Link>
        </li>
    ) : (
        <li className={rowClass}>{content}</li>
    );
}
