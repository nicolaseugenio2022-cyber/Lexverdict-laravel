import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
import StatusBadge from '../../../Components/StatusBadge';
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
type Props = {
    resolutions: {
        data: QueueResolution[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: { search: string; sort: string; direction: string };
};

export default function Index({ resolutions, filters }: Props) {
    const [search, setSearch] = useState(filters.search);

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get(
            '/resolution-reviews',
            { search, sort: filters.sort, direction: filters.direction },
            { preserveState: true },
        );
    }

    function sortBy(sort: string) {
        const direction = filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';
        router.get(
            '/resolution-reviews',
            { search: filters.search, sort, direction },
            { preserveState: true },
        );
    }

    function selectSort(sort: string, direction: string) {
        router.get('/resolution-reviews', { search, sort, direction }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Resolution Review" />
            <section className="space-y-6">
                <PageHeader
                    title="Resolution Review"
                    description="Pending Resolutions awaiting Administrator decision."
                />
                <div className="surface p-4">
                    <form
                        onSubmit={submit}
                        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_140px_auto] lg:items-end"
                    >
                        <label
                            htmlFor="resolution-review-search"
                            className="flex-1 text-sm font-medium text-slate-700"
                        >
                            Search
                            <input
                                id="resolution-review-search"
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
                                <option value="verdict_date">Verdict Date</option>
                                <option value="verdict">Verdict</option>
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
                        aria-label="Resolution Review table"
                    >
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Docket No.</th>
                                    <Sortable
                                        label="Verdict"
                                        name="verdict"
                                        current={filters.sort}
                                        onSort={sortBy}
                                    />
                                    <Sortable
                                        label="Verdict Date"
                                        name="verdict_date"
                                        current={filters.sort}
                                        onSort={sortBy}
                                    />
                                    <th className="px-4 py-3 font-semibold">Court</th>
                                    <th className="px-4 py-3 font-semibold">Assigned Prosecutor</th>
                                    <th className="px-4 py-3 font-semibold">Parties</th>
                                    <th className="px-4 py-3 font-semibold">Crimes</th>
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
                                {resolutions.data.map((resolution) => (
                                    <tr
                                        key={resolution.id}
                                        className="data-row border-b border-slate-100 align-top"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {resolution.docket_number}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge value={resolution.verdict} />
                                        </td>
                                        <td className="px-4 py-3">{resolution.verdict_date}</td>
                                        <td className="px-4 py-3">
                                            {resolution.court || 'Not applicable'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {resolution.assigned_prosecutor || 'Unassigned'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p>Complainant: {resolution.complainants.join(', ')}</p>
                                            <p>Respondent: {resolution.respondents.join(', ')}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {resolution.offenses.join(', ')}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {resolution.revision_number}
                                        </td>
                                        <td className="px-4 py-3">{resolution.submitted_by}</td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/resolution-reviews/${resolution.id}`}
                                                className="action-link"
                                            >
                                                Review
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {resolutions.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={10}
                                            className="px-4 py-10 text-center text-slate-600"
                                        >
                                            No pending Resolutions.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="lg:hidden" role="region" aria-label="Resolution Review list">
                        {resolutions.data.length === 0 ? (
                            <EmptyState title="No pending Resolutions." />
                        ) : (
                            <ol>
                                {resolutions.data.map((resolution) => (
                                    <li key={resolution.id} className="mobile-data-card">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-slate-950">
                                                    {resolution.docket_number}
                                                </p>
                                                <div className="mt-2">
                                                    <StatusBadge value={resolution.verdict} />
                                                </div>
                                            </div>
                                            <Link
                                                href={`/resolution-reviews/${resolution.id}`}
                                                className="action-link shrink-0"
                                            >
                                                Review
                                            </Link>
                                        </div>
                                        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                                            <MobileDetail
                                                label="Verdict Date"
                                                value={resolution.verdict_date}
                                            />
                                            <MobileDetail
                                                label="Court"
                                                value={resolution.court || 'Not applicable'}
                                            />
                                            <MobileDetail
                                                label="Assigned Prosecutor"
                                                value={
                                                    resolution.assigned_prosecutor || 'Unassigned'
                                                }
                                            />
                                            <MobileDetail
                                                label="Complainant"
                                                value={resolution.complainants.join(', ')}
                                            />
                                            <MobileDetail
                                                label="Respondent"
                                                value={resolution.respondents.join(', ')}
                                            />
                                            <MobileDetail
                                                label="Crimes"
                                                value={resolution.offenses.join(', ')}
                                            />
                                            <MobileDetail
                                                label="Revision"
                                                value={String(resolution.revision_number)}
                                            />
                                            <MobileDetail
                                                label="Submitted By"
                                                value={resolution.submitted_by || 'Not set'}
                                            />
                                        </dl>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                    <Pagination
                        links={resolutions.links}
                        from={resolutions.from}
                        to={resolutions.to}
                        total={resolutions.total}
                        ariaLabel="Resolution Review pagination"
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
                className="min-h-10 rounded-md px-2 text-left hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
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
