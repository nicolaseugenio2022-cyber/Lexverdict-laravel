import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import type { CaseRecord } from './types';

type PaginationLink = { url: string | null; label: string; active: boolean };

type PaginatedCases = {
    data: CaseRecord[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    cases: PaginatedCases;
    filters: {
        search: string;
        status: string;
        sort: string;
        direction: string;
    };
    statuses: string[];
    can_create_case: boolean;
};

export default function Index({ cases, filters, statuses, can_create_case }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get('/cases', { search, status, sort: filters.sort, direction: filters.direction }, { preserveState: true });
    }

    function sortBy(sort: string) {
        const direction = filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';
        router.get('/cases', { search: filters.search, status: filters.status, sort, direction }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Cases" />
            <section className="space-y-4">
                <div className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">Cases</h1>
                            <p className="text-sm text-slate-600">Scoped case list by role and current Prosecutor-Secretary assignment.</p>
                        </div>
                        {can_create_case && (
                            <Link href="/cases/create" className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900">
                                Create Case
                            </Link>
                        )}
                    </div>

                    <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                        <label className="text-sm font-medium text-slate-700">
                            Search
                            <input className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900" value={search} onChange={(event) => setSearch(event.target.value)} />
                        </label>
                        <label className="text-sm font-medium text-slate-700">
                            Status
                            <select className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900" value={status} onChange={(event) => setStatus(event.target.value)}>
                                <option value="">All</option>
                                {statuses.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button type="submit" className="min-h-11 self-end rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            Apply
                        </button>
                    </form>
                </div>

                <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <Sortable label="Docket No." name="docket_number" current={filters.sort} onSort={sortBy} />
                                    <Sortable label="Date" name="date" current={filters.sort} onSort={sortBy} />
                                    <th className="px-4 py-3 font-semibold">Parties</th>
                                    <th className="px-4 py-3 font-semibold">Crimes</th>
                                    <Sortable label="Police Station" name="police_station" current={filters.sort} onSort={sortBy} />
                                    <Sortable label="Status" name="status" current={filters.sort} onSort={sortBy} />
                                    <th className="px-4 py-3 font-semibold">Prosecutor</th>
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
                                        <td className="px-4 py-3">{caseRecord.subpoena_status}</td>
                                        <td className="px-4 py-3">{caseRecord.assigned_prosecutor_name}</td>
                                        <td className="px-4 py-3">
                                            <Link href={`/cases/${caseRecord.id}`} className="font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {cases.data.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-slate-600" colSpan={8}>
                                            No cases found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                        <span>
                            Showing {cases.from ?? 0} to {cases.to ?? 0} of {cases.total}
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {cases.links.map((link, index) =>
                                link.url ? (
                                    <Link key={`${link.label}-${index}`} href={link.url} className={`min-h-10 rounded-md border px-3 py-2 ${link.active ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300 text-slate-700'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                                ) : (
                                    <span key={`${link.label}-${index}`} className="min-h-10 rounded-md border border-slate-200 px-3 py-2 text-slate-400" dangerouslySetInnerHTML={{ __html: link.label }} />
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
            <button type="button" onClick={() => onSort(name)} className="min-h-10 rounded-md px-2 text-left hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                {label}
                {current === name ? ' *' : ''}
            </button>
        </th>
    );
}
