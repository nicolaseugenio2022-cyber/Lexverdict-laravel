import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type Event = {
    log_id: string; user_id: string | null; full_name: string | null; role: string | null; action: string; timestamp: string | null;
    subject_type: string | null; subject_id: string | null; changes: unknown; ip_address: string | null; user_agent: string | null; correlation_id: string | null;
};

export default function Show({ event }: { event: Event }) {
    const fields = [['Log ID', event.log_id], ['User ID', event.user_id ?? 'System'], ['Full Name', event.full_name ?? 'System'], ['Role', event.role ?? 'System'], ['Action', event.action], ['Timestamp', event.timestamp], ['Subject Type', event.subject_type], ['Subject ID', event.subject_id], ['IP Address', event.ip_address], ['User Agent', event.user_agent], ['Correlation ID', event.correlation_id]];
    return <AuthenticatedLayout><Head title="Audit Event" /><div className="space-y-6"><header className="border-b border-slate-300 pb-5"><Link href="/admin/audit" className="text-sm font-semibold text-blue-900 hover:underline">Back to User Action Logs</Link><h1 className="mt-2 text-2xl font-semibold">Audit Event Detail</h1></header><dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="border-b border-slate-200 pb-3"><dt className="text-xs font-semibold uppercase text-slate-600">{label}</dt><dd className="mt-1 break-words text-sm">{value ?? 'N/A'}</dd></div>)}</dl><section className="border-t border-slate-300 pt-5"><h2 className="text-base font-semibold">Changes</h2><pre className="mt-3 overflow-x-auto whitespace-pre-wrap border border-slate-200 bg-white p-4 text-xs leading-5">{event.changes === null ? 'No recorded changes.' : JSON.stringify(event.changes, null, 2)}</pre></section></div></AuthenticatedLayout>;
}
