import { Head, Link } from '@inertiajs/react';
import { formatAuditAction, formatAuditArea } from '../../../Components/audit';
import AuditTimestamp from '../../../Components/AuditTimestamp';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
import RecordEntryLink from '../../../Components/RecordEntryLink';
import StickyDataset from '../../../Components/StickyDataset';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type Event = {
    log_id: string;
    user_id: string | null;
    full_name: string | null;
    role: string | null;
    action: string;
    timestamp: string | null;
};
type Props = {
    events: {
        data: Event[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: { search: string; filter: string; sort: string; order: string };
};

export default function Index({ events, filters }: Props) {
    const hasActiveFilters = Boolean(filters.search || filters.filter);

    return (
        <AuthenticatedLayout>
            <Head title="User Action Logs" />
            <div className="page-stack">
                <PageHeader
                    eyebrow="Administrator"
                    title="User Action Logs"
                    description="Review recorded actions by actor, role, and time. Technical event identifiers remain available in each event detail."
                />

                <StickyDataset
                    className="grid gap-6"
                    controls={
                        <form
                            method="get"
                            action="/admin/audit"
                            className="filter-panel grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,32rem)_180px_160px_140px_auto] xl:items-end"
                        >
                            <label className="field-label">
                                Search
                                <input
                                    name="search"
                                    defaultValue={filters.search}
                                    maxLength={200}
                                    className="input mt-2"
                                />
                            </label>
                            <label className="field-label">
                                Filter
                                <select
                                    name="filter"
                                    defaultValue={filters.filter}
                                    className="input mt-2"
                                >
                                    <option value="">All Fields</option>
                                    <option value="user_id">User ID</option>
                                    <option value="full_name">Full Name</option>
                                    <option value="role">Role</option>
                                    <option value="action">Action</option>
                                    <option value="timestamp">Date</option>
                                </select>
                            </label>
                            <label className="field-label">
                                Sort by
                                <select
                                    name="sort"
                                    defaultValue={filters.sort}
                                    className="input mt-2"
                                >
                                    <option value="log_id">Log ID</option>
                                    <option value="user_id">User ID</option>
                                    <option value="full_name">Full Name</option>
                                    <option value="role">Role</option>
                                    <option value="action">Action</option>
                                    <option value="timestamp">Date</option>
                                </select>
                            </label>
                            <label className="field-label">
                                Order
                                <select
                                    name="order"
                                    defaultValue={filters.order}
                                    className="input mt-2"
                                >
                                    <option value="desc">Descending</option>
                                    <option value="asc">Ascending</option>
                                </select>
                            </label>
                            <div className="action-group self-end md:col-span-2 xl:col-span-1">
                                <button type="submit" className="btn btn-primary">
                                    Search
                                </button>
                                {hasActiveFilters && (
                                    <Link href="/admin/audit" className="btn btn-secondary">
                                        Clear filters
                                    </Link>
                                )}
                            </div>
                        </form>
                    }
                >
                    <section
                        className="surface overflow-hidden"
                        aria-labelledby="audit-history-heading"
                    >
                        <div className="panel-header">
                            <h2 id="audit-history-heading" className="panel-title">
                                Audit History
                            </h2>
                        </div>
                        {events.data.length === 0 ? (
                            <EmptyState
                                title={
                                    hasActiveFilters
                                        ? 'No audit records match the current filters.'
                                        : 'No audit records are available.'
                                }
                                description={
                                    hasActiveFilters
                                        ? 'Clear the current search and filter to review all recorded actions.'
                                        : 'Recorded staff and system actions will appear here.'
                                }
                                action={
                                    hasActiveFilters ? (
                                        <Link href="/admin/audit" className="btn btn-secondary">
                                            Clear filters
                                        </Link>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <ol className="divide-y divide-slate-200" aria-label="Audit events">
                                {events.data.map((event) => (
                                    <li key={event.log_id}>
                                        <article className="record-entry data-row grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-4 py-3 sm:grid-cols-[6.25rem_minmax(0,1fr)] sm:px-5 lg:grid-cols-[6.25rem_minmax(0,1fr)_minmax(180px,240px)_auto] lg:items-center lg:gap-x-4">
                                            <AuditTimestamp
                                                value={event.timestamp}
                                                className="self-center text-xs font-medium leading-4 tabular-nums text-slate-500"
                                            />
                                            <div className="min-w-0">
                                                <p className="break-words font-semibold text-slate-950">
                                                    {formatAuditAction(event.action)}
                                                </p>
                                                <p className="mt-1 break-all font-mono text-xs text-slate-500">
                                                    {event.action}
                                                </p>
                                                <p className="metadata-text mt-1">
                                                    Area: {formatAuditArea(event.action)}
                                                </p>
                                            </div>
                                            <dl className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm lg:col-span-1 lg:block">
                                                <div className="min-w-0">
                                                    <dt className="text-xs font-medium text-slate-500">
                                                        Actor
                                                    </dt>
                                                    <dd className="break-words font-medium text-slate-800">
                                                        {event.full_name ?? 'System'}
                                                    </dd>
                                                </div>
                                                <div className="min-w-0 lg:mt-2">
                                                    <dt className="text-xs font-medium text-slate-500">
                                                        Role
                                                    </dt>
                                                    <dd className="break-words text-slate-700">
                                                        {event.role ?? 'System'}
                                                    </dd>
                                                </div>
                                            </dl>
                                            <RecordEntryLink
                                                href={`/admin/audit/${event.log_id}`}
                                                accessibleLabel={`View details for ${formatAuditAction(event.action)} audit event`}
                                                className="col-span-2 text-sm font-semibold text-institution-800 lg:col-span-1 lg:text-right"
                                            >
                                                View details
                                            </RecordEntryLink>
                                        </article>
                                    </li>
                                ))}
                            </ol>
                        )}
                        <Pagination
                            links={events.links}
                            from={events.from}
                            to={events.to}
                            total={events.total}
                            currentPage={events.current_page}
                            lastPage={events.last_page}
                            ariaLabel="Audit pagination"
                        />
                    </section>
                </StickyDataset>
            </div>
        </AuthenticatedLayout>
    );
}
