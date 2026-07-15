import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type QueueResolution = {
    id: string;
    docket_number: string;
    verdict: string;
    court: string | null;
    verdict_date: string;
    revision_number: number;
    submitted_by: string | null;
    assigned_prosecutor: string | null;
    offenses: string[];
    complainants: string[];
    respondents: string[];
};
type PaginationLink = { url: string | null; label: string; active: boolean };
type Props = {
    resolutions: { data: QueueResolution[]; links: PaginationLink[]; from: number | null; to: number | null; total: number };
    filters: { search: string; sort: string; direction: string };
};

export default function Index({ resolutions, filters }: Props) {
    const [search, setSearch] = useState(filters.search);

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get('/resolution-reviews', { search, sort: filters.sort, direction: filters.direction }, { preserveState: true });
    }

    function sortBy(sort: string) {
        const direction = filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';
        router.get('/resolution-reviews', { search: filters.search, sort, direction }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Resolution Review" />
            <section className="space-y-4">
                <header className="rounded-md border border-slate-200 bg-white p-5">
                    <h1 className="text-xl font-semibold">Resolution Review</h1>
                    <p className="mt-1 text-sm text-slate-600">Pending Resolutions awaiting Administrator decision.</p>
                    <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label htmlFor="resolution-review-search" className="flex-1 text-sm font-medium text-slate-700">Search
                            <input id="resolution-review-search" value={search} onChange={(event) => setSearch(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900" />
                        </label>
                        <button type="submit" className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">Apply</button>
                    </form>
                </header>

                <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    <div className="table-scroll" tabIndex={0} role="region" aria-label="Resolution Review table">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr>
                                <th className="px-4 py-3 font-semibold">Docket No.</th>
                                <Sortable label="Verdict" name="verdict" current={filters.sort} onSort={sortBy} />
                                <Sortable label="Verdict Date" name="verdict_date" current={filters.sort} onSort={sortBy} />
                                <th className="px-4 py-3 font-semibold">Court</th>
                                <th className="px-4 py-3 font-semibold">Assigned Prosecutor</th>
                                <th className="px-4 py-3 font-semibold">Parties</th><th className="px-4 py-3 font-semibold">Crimes</th>
                                <Sortable label="Revision" name="revision_number" current={filters.sort} onSort={sortBy} />
                                <th className="px-4 py-3 font-semibold">Submitted By</th><th className="px-4 py-3 font-semibold">Action</th>
                            </tr></thead>
                            <tbody>
                                {resolutions.data.map((resolution) => <tr key={resolution.id} className="border-b border-slate-100 align-top">
                                    <td className="px-4 py-3 font-medium">{resolution.docket_number}</td><td className="px-4 py-3">{resolution.verdict}</td><td className="px-4 py-3">{resolution.verdict_date}</td>
                                    <td className="px-4 py-3">{resolution.court || 'Not applicable'}</td>
                                    <td className="px-4 py-3">{resolution.assigned_prosecutor || 'Unassigned'}</td>
                                    <td className="px-4 py-3"><p>Complainant: {resolution.complainants.join(', ')}</p><p>Respondent: {resolution.respondents.join(', ')}</p></td>
                                    <td className="px-4 py-3">{resolution.offenses.join(', ')}</td><td className="px-4 py-3 tabular-nums">{resolution.revision_number}</td><td className="px-4 py-3">{resolution.submitted_by}</td>
                                    <td className="px-4 py-3"><Link href={`/resolution-reviews/${resolution.id}`} className="inline-flex min-h-11 items-center font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">Review</Link></td>
                                </tr>)}
                                {resolutions.data.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-600">No pending Resolutions.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                        <span>Showing {resolutions.from ?? 0} to {resolutions.to ?? 0} of {resolutions.total}</span>
                        <div className="flex flex-wrap gap-2">{resolutions.links.map((link, index) => link.url
                            ? <Link key={`${link.label}-${index}`} href={link.url} className={`min-h-10 rounded-md border px-3 py-2 ${link.active ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300 text-slate-700'}`}>{paginationLabel(link.label)}</Link>
                            : <span key={`${link.label}-${index}`} className="min-h-10 rounded-md border border-slate-200 px-3 py-2 text-slate-400">{paginationLabel(link.label)}</span>)}</div>
                    </div>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}

function Sortable({ label, name, current, onSort }: { label: string; name: string; current: string; onSort: (name: string) => void }) {
    return <th className="px-4 py-3 font-semibold"><button type="button" onClick={() => onSort(name)} className="min-h-10 rounded-md px-2 text-left hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">{label} {current === name ? '(sorted)' : ''}</button></th>;
}
function paginationLabel(label: string) { return label.replace('&laquo;', '').replace('&raquo;', '').trim(); }
