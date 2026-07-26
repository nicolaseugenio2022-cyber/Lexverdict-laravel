import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
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
        router.get(
            '/subpoena-reviews',
            { search, sort: filters.sort, direction: filters.direction },
            { preserveState: true },
        );
    }

    function sortBy(sort: string) {
        const direction = filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';
        router.get(
            '/subpoena-reviews',
            { search: filters.search, sort, direction },
            { preserveState: true },
        );
    }

    function selectSort(sort: string, direction: string) {
        router.get('/subpoena-reviews', { search, sort, direction }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Subpoena Review" />
            <section className="space-y-6">
                <PageHeader
                    title="Subpoena Review"
                    description="Pending subpoenas assigned to you."
                />

                <div className="surface p-4">
                    <form
                        onSubmit={submit}
                        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_140px_auto] lg:items-end"
                    >
                        <label
                            htmlFor="review-search"
                            className="flex-1 text-sm font-medium text-slate-700"
                        >
                            Search
                            <input
                                id="review-search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            />
                        </label>
                        <label className="text-sm font-medium text-slate-700">
                            Sort by
                            <select
                                value={filters.sort}
                                onChange={(event) =>
                                    selectSort(event.target.value, filters.direction)
                                }
                                className="input mt-2"
                            >
                                <option value="date">Date</option>
                                <option value="docket_number">Docket No.</option>
                                <option value="revision_number">Revision</option>
                            </select>
                        </label>
                        <label className="text-sm font-medium text-slate-700">
                            Order
                            <select
                                value={filters.direction}
                                onChange={(event) => selectSort(filters.sort, event.target.value)}
                                className="input mt-2"
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </label>
                        <button
                            type="submit"
                            className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
                        >
                            Apply
                        </button>
                    </form>
                </div>

                <div className="surface overflow-hidden">
                    <div
                        className="table-scroll hidden lg:block"
                        tabIndex={0}
                        role="region"
                        aria-label="Subpoena Review table"
                    >
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <Sortable
                                        label="Docket No."
                                        name="docket_number"
                                        current={filters.sort}
                                        onSort={sortBy}
                                    />
                                    <Sortable
                                        label="Date"
                                        name="date"
                                        current={filters.sort}
                                        onSort={sortBy}
                                    />
                                    <th className="px-4 py-3 font-semibold">Parties</th>
                                    <th className="px-4 py-3 font-semibold">Crimes</th>
                                    <th className="px-4 py-3 font-semibold">Police Station</th>
                                    <Sortable
                                        label="Revision"
                                        name="revision_number"
                                        current={filters.sort}
                                        onSort={sortBy}
                                    />
                                    <th className="px-4 py-3 font-semibold">Submitted By</th>
                                    <th className="px-4 py-3 font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.data.map((caseRecord) => (
                                    <tr
                                        key={caseRecord.id}
                                        className="data-row border-b border-slate-100 align-top"
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-950">
                                            {caseRecord.docket_number}
                                        </td>
                                        <td className="px-4 py-3">{caseRecord.date}</td>
                                        <td className="px-4 py-3">
                                            <p>Complainant: {caseRecord.complainants.join(', ')}</p>
                                            <p>Respondent: {caseRecord.respondents.join(', ')}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {caseRecord.offenses.join(', ')}
                                        </td>
                                        <td className="px-4 py-3">{caseRecord.police_station}</td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {caseRecord.revision_number}
                                        </td>
                                        <td className="px-4 py-3">{caseRecord.created_by_name}</td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/subpoena-reviews/${caseRecord.id}`}
                                                className="action-link"
                                            >
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {cases.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-10 text-center text-slate-600"
                                        >
                                            No pending subpoenas are assigned to you.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="lg:hidden" role="region" aria-label="Subpoena Review list">
                        {cases.data.length === 0 ? (
                            <EmptyState title="No pending subpoenas are assigned to you." />
                        ) : (
                            <ol>
                                {cases.data.map((caseRecord) => (
                                    <li key={caseRecord.id} className="mobile-data-card">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-slate-950">
                                                    {caseRecord.docket_number}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    Revision {caseRecord.revision_number}
                                                </p>
                                            </div>
                                            <Link
                                                href={`/subpoena-reviews/${caseRecord.id}`}
                                                className="action-link shrink-0"
                                            >
                                                Review
                                            </Link>
                                        </div>
                                        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                                            <MobileDetail label="Date" value={caseRecord.date} />
                                            <MobileDetail
                                                label="Police Station"
                                                value={caseRecord.police_station}
                                            />
                                            <MobileDetail
                                                label="Complainant"
                                                value={caseRecord.complainants.join(', ')}
                                            />
                                            <MobileDetail
                                                label="Respondent"
                                                value={caseRecord.respondents.join(', ')}
                                            />
                                            <MobileDetail
                                                label="Crimes"
                                                value={caseRecord.offenses.join(', ')}
                                            />
                                            <MobileDetail
                                                label="Submitted By"
                                                value={caseRecord.created_by_name ?? 'Not set'}
                                            />
                                        </dl>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                    <Pagination
                        links={cases.links}
                        from={cases.from}
                        to={cases.to}
                        total={cases.total}
                        ariaLabel="Subpoena Review pagination"
                    />
                </div>
            </section>
        </AuthenticatedLayout>
    );
}

function Sortable({
    label,
    name,
    current,
    onSort,
}: {
    label: string;
    name: string;
    current: string;
    onSort: (name: string) => void;
}) {
    return (
        <th className="px-4 py-3 font-semibold">
            <button
                type="button"
                onClick={() => onSort(name)}
                className="min-h-10 rounded-md px-2 text-left transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
                {label} {current === name ? '(sorted)' : ''}
            </button>
        </th>
    );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words text-slate-800">{value || 'Not set'}</dd>
        </div>
    );
}
