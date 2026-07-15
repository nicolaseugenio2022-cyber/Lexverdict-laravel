import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type Event = { log_id: string; user_id: string | null; full_name: string | null; role: string | null; action: string; timestamp: string | null };
type PageLink = { url: string | null; label: string; active: boolean };
type Props = {
    events: { data: Event[]; links: PageLink[]; current_page: number; last_page: number };
    filters: { search: string; filter: string; sort: string; order: string };
};

export default function Index({ events, filters }: Props) {
    const pageLabel = (label: string) => label.replace('&laquo;', '').replace('&raquo;', '').trim();

    return (
        <AuthenticatedLayout>
            <Head title="User Action Logs" />
            <div className="space-y-6">
                <header className="border-b border-slate-300 pb-5"><p className="text-sm font-semibold text-blue-900">Administrator</p><h1 className="mt-1 text-2xl font-semibold">User Action Logs</h1></header>
                <form method="get" action="/admin/audit" className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-[1fr_180px_160px_140px_auto]">
                    <label className="text-sm font-medium">Search
                        <input name="search" defaultValue={filters.search} maxLength={200} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900" />
                    </label>
                    <label className="text-sm font-medium">Filter
                        <select name="filter" defaultValue={filters.filter} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            <option value="">All Fields</option><option value="user_id">User ID</option><option value="full_name">Full Name</option><option value="role">Role</option><option value="action">Action</option><option value="timestamp">Date</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">Sort by
                        <select name="sort" defaultValue={filters.sort} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            <option value="log_id">Log ID</option><option value="user_id">User ID</option><option value="full_name">Full Name</option><option value="role">Role</option><option value="action">Action</option><option value="timestamp">Date</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">Order
                        <select name="order" defaultValue={filters.order} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900"><option value="desc">Descending</option><option value="asc">Ascending</option></select>
                    </label>
                    <button type="submit" className="min-h-11 self-end rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2">Search</button>
                </form>
                <div className="table-scroll border border-slate-200 bg-white" tabIndex={0} role="region" aria-label="User Action Logs table">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="border-b border-slate-300 bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">Log ID</th><th className="p-3">User ID</th><th className="p-3">Full Name</th><th className="p-3">Role</th><th className="p-3">Action</th><th className="p-3">Timestamp</th><th className="p-3"><span className="sr-only">Details</span></th></tr></thead>
                        <tbody>
                            {events.data.map((event) => <tr key={event.log_id} className="border-b border-slate-100"><td className="p-3 font-mono text-xs">{event.log_id}</td><td className="p-3 font-mono text-xs">{event.user_id ?? 'System'}</td><td className="p-3">{event.full_name ?? 'System'}</td><td className="p-3">{event.role ?? 'System'}</td><td className="p-3 font-medium">{event.action}</td><td className="p-3 tabular-nums">{event.timestamp}</td><td className="p-3"><Link href={`/admin/audit/${event.log_id}`} className="font-semibold text-blue-900 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-900">View</Link></td></tr>)}
                            {events.data.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-600">No audit events found.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <nav aria-label="Audit pagination" className="flex flex-wrap items-center gap-2">
                    {events.links.map((link) => link.url ? <Link key={link.label} href={link.url} preserveScroll className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm ${link.active ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>{pageLabel(link.label)}</Link> : <span key={link.label} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 px-3 text-sm text-slate-600">{pageLabel(link.label)}</span>)}
                    <span className="ml-2 text-sm text-slate-600">Page {events.current_page} of {events.last_page}</span>
                </nav>
            </div>
        </AuthenticatedLayout>
    );
}
