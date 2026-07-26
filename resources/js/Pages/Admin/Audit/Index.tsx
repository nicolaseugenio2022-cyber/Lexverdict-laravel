import { Head, Link } from '@inertiajs/react';
import { formatAuditAction } from '../../../Components/audit';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
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
        current_page: number;
        last_page: number;
    };
    filters: { search: string; filter: string; sort: string; order: string };
};

export default function Index({ events, filters }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="User Action Logs" />
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Administrator"
                    title="User Action Logs"
                    description="Review recorded actions by actor, role, and time. Technical event identifiers remain available in each event detail."
                />

                <form
                    method="get"
                    action="/admin/audit"
                    className="surface grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_160px_140px_auto]"
                >
                    <label className="text-sm font-medium text-slate-700">
                        Search
                        <input
                            name="search"
                            defaultValue={filters.search}
                            maxLength={200}
                            className="input mt-2"
                        />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Filter
                        <select name="filter" defaultValue={filters.filter} className="input mt-2">
                            <option value="">All Fields</option>
                            <option value="user_id">User ID</option>
                            <option value="full_name">Full Name</option>
                            <option value="role">Role</option>
                            <option value="action">Action</option>
                            <option value="timestamp">Date</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Sort by
                        <select name="sort" defaultValue={filters.sort} className="input mt-2">
                            <option value="log_id">Log ID</option>
                            <option value="user_id">User ID</option>
                            <option value="full_name">Full Name</option>
                            <option value="role">Role</option>
                            <option value="action">Action</option>
                            <option value="timestamp">Date</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Order
                        <select name="order" defaultValue={filters.order} className="input mt-2">
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </label>
                    <button
                        type="submit"
                        className="min-h-11 self-end rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 md:col-span-2 xl:col-span-1"
                    >
                        Search
                    </button>
                </form>

                <section
                    className="surface overflow-hidden"
                    aria-labelledby="audit-history-heading"
                >
                    <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
                        <h2 id="audit-history-heading" className="font-semibold text-slate-900">
                            Audit History
                        </h2>
                    </div>
                    {events.data.length === 0 ? (
                        <EmptyState
                            title="No audit events found"
                            description="Adjust the current search or filter to review other recorded actions."
                        />
                    ) : (
                        <ol className="divide-y divide-slate-200" aria-label="Audit events">
                            {events.data.map((event) => (
                                <li key={event.log_id}>
                                    <article className="data-row grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_auto] lg:items-center">
                                        <div className="min-w-0">
                                            <p className="break-words font-semibold text-slate-950">
                                                {formatAuditAction(event.action)}
                                            </p>
                                            <p className="mt-1 break-all font-mono text-xs text-slate-500">
                                                {event.action}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600">
                                                {event.timestamp ?? 'Timestamp unavailable'}
                                            </p>
                                        </div>
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm lg:block">
                                            <div className="min-w-0">
                                                <dt className="text-xs font-medium text-slate-500">
                                                    Actor
                                                </dt>
                                                <dd className="truncate font-medium text-slate-800">
                                                    {event.full_name ?? 'System'}
                                                </dd>
                                            </div>
                                            <div className="min-w-0 lg:mt-2">
                                                <dt className="text-xs font-medium text-slate-500">
                                                    Role
                                                </dt>
                                                <dd className="truncate text-slate-700">
                                                    {event.role ?? 'System'}
                                                </dd>
                                            </div>
                                        </dl>
                                        <Link
                                            href={`/admin/audit/${event.log_id}`}
                                            className="action-link justify-center border border-slate-300 px-3 hover:bg-slate-50"
                                        >
                                            View details
                                        </Link>
                                    </article>
                                </li>
                            ))}
                        </ol>
                    )}
                    <Pagination
                        links={events.links}
                        currentPage={events.current_page}
                        lastPage={events.last_page}
                        ariaLabel="Audit pagination"
                    />
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
