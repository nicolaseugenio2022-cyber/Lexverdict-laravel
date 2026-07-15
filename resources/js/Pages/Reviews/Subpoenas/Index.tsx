import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type QueueCase = {
    id: string;
    docket_number: string;
    date: string;
    police_station: string;
    revision_number: number;
    created_by_name: string | null;
    offenses: string[];
    complainants: string[];
    respondents: string[];
};

type PaginationLink = { url: string | null; label: string; active: boolean };
type Props = {
    cases: {
        data: QueueCase[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: { search: string; sort: string; direction: string };
};

export default function Index({ cases, filters }: Props) {
    const [search, setSearch] = useState(filters.search);

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get('/subpoena-reviews', { search, sort: filters.sort, direction: filters.direction }, { preserveState: true });
    }

    function sortBy(sort: string) {
        const direction = filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';
        router.get('/subpoena-reviews', { search: filters.search, sort, direction }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Subpoena Review" />
            <section className="space-y-4">
                <header className="rounded-md border border-slate-200 bg-white p-5">
                    <h1 className="text-xl font-semibold">Subpoena Review</h1>
                    <p className="mt-1 text-sm text-slate-600">Pending subpoenas assigned to you.</p>

                    <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label htmlFor="review-search" className="flex-1 text-sm font-medium text-slate-700">
                            Search
                            <input
                                id="review-search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            />
                        </label>
                        <button type="submit" className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            Apply
                        </button>
                    </form>
                </header>

                <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    <div className="table-scroll" tabIndex={0} role="region" aria-label="Subpoena Review table">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <Sortable label="Docket No." name="docket_number" current={filters.sort} onSort={sortBy} />
                                    <Sortable label="Date" name="date" current={filters.sort} onSort={sortBy} />
                                    <th className="px-4 py-3 font-semibold">Parties</th>
                                    <th className="px-4 py-3 font-semibold">Crimes</th>
                                    <th className="px-4 py-3 font-semibold">Police Station</th>
                                    <Sortable label="Revision" name="revision_number" current={filters.sort} onSort={sortBy} />
                                    <th className="px-4 py-3 font-semibold">Submitted By</th>
                                    <th className="px-4 py-3 font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.data.map((caseRecord) => (
                                    <tr key={caseRecord.id} className="border-b border-slate-100 align-top">
                                        <td className="px-4 py-3 font-medium text-slate-950">{caseRecord.docket_number}</td>
                                        <td className="px-4 py-3">{caseRecord.date}</td>
                                        <td className="px-4 py-3">
                                            <p>Complainant: {caseRecord.complainants.join(', ')}</p>
                                            <p>Respondent: {caseRecord.respondents.join(', ')}</p>
                                        </td>
                                        <td className="px-4 py-3">{caseRecord.offenses.join(', ')}</td>
                                        <td className="px-4 py-3">{caseRecord.police_station}</td>
                                        <td className="px-4 py-3 tabular-nums">{caseRecord.revision_number}</td>
                                        <td className="px-4 py-3">{caseRecord.created_by_name}</td>
                                        <td className="px-4 py-3">
                                            <Link href={`/subpoena-reviews/${caseRecord.id}`} className="inline-flex min-h-11 items-center font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {cases.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-slate-600">
                                            No pending subpoenas are assigned to you.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                        <span>Showing {cases.from ?? 0} to {cases.to ?? 0} of {cases.total}</span>
                        <div className="flex flex-wrap gap-2">
                            {cases.links.map((link, index) =>
                                link.url ? (
                                    <Link key={`${link.label}-${index}`} href={link.url} className={`min-h-10 rounded-md border px-3 py-2 ${link.active ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300 text-slate-700'}`}>
                                        {paginationLabel(link.label)}
                                    </Link>
                                ) : (
                                    <span key={`${link.label}-${index}`} className="min-h-10 rounded-md border border-slate-200 px-3 py-2 text-slate-400">
                                        {paginationLabel(link.label)}
                                    </span>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}

function Sortable({ label, name, current, onSort }: { label: string; name: string; current: string; onSort: (name: string) => void }) {
    return (
        <th className="px-4 py-3 font-semibold">
            <button type="button" onClick={() => onSort(name)} className="min-h-10 rounded-md px-2 text-left transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                {label} {current === name ? '(sorted)' : ''}
            </button>
        </th>
    );
}

function paginationLabel(label: string) {
    return label.replace('&laquo;', '').replace('&raquo;', '').trim();
}
