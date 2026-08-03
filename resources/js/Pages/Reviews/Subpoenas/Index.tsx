import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import EmptyState from '../../../Components/EmptyState';
import ExpandableCollection from '../../../Components/ExpandableCollection';
import OperationalSummary, { type OperationalMetric } from '../../../Components/OperationalSummary';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
import SortableTableHeader from '../../../Components/SortableTableHeader';
import StickyDataset from '../../../Components/StickyDataset';
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
    operational_metrics: OperationalMetric[];
};

export default function Index({ cases, filters, operational_metrics }: Props) {
    const [search, setSearch] = useState(filters.search);
    const hasActiveFilters = Boolean(filters.search);
    const emptyState = (
        <EmptyState
            title={
                hasActiveFilters
                    ? 'No pending subpoenas match the current search.'
                    : 'No pending subpoenas are assigned to you.'
            }
            description={
                hasActiveFilters
                    ? 'Clear the search to review all assigned pending subpoenas.'
                    : 'Assigned Subpoenas requiring review will appear here.'
            }
            action={
                hasActiveFilters ? (
                    <Link href="/subpoena-reviews" className="btn btn-secondary">
                        Clear search
                    </Link>
                ) : undefined
            }
        />
    );

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

                <OperationalSummary title="Your Work Overview" metrics={operational_metrics} />

                <StickyDataset
                    className="grid gap-6"
                    stickyControls={false}
                    controls={
                        <div className="filter-panel p-4">
                            <form
                                onSubmit={submit}
                                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_140px_auto] lg:items-end"
                            >
                                <label htmlFor="review-search" className="field-label flex-1">
                                    Search
                                    <input
                                        id="review-search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        className="input mt-2"
                                    />
                                </label>
                                <label className="field-label">
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
                                <label className="field-label">
                                    Order
                                    <select
                                        value={filters.direction}
                                        onChange={(event) =>
                                            selectSort(filters.sort, event.target.value)
                                        }
                                        className="input mt-2"
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                </label>
                                <button type="submit" className="btn btn-secondary">
                                    Apply
                                </button>
                            </form>
                        </div>
                    }
                >
                    <div className="surface sticky-table-surface">
                        <div
                            className="table-scroll sticky-table-scroll hidden lg:block"
                            tabIndex={0}
                            role="region"
                            aria-label="Subpoena Review table"
                        >
                            <table className="data-table sticky-table-header min-w-[900px]">
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <tr>
                                        <SortableTableHeader
                                            label="Case"
                                            name="docket_number"
                                            current={filters.sort}
                                            onSort={sortBy}
                                        />
                                        <SortableTableHeader
                                            label="Date"
                                            name="date"
                                            current={filters.sort}
                                            onSort={sortBy}
                                        />
                                        <th className="table-heading">Parties</th>
                                        <th className="table-heading">Police Station</th>
                                        <SortableTableHeader
                                            label="Revision"
                                            name="revision_number"
                                            current={filters.sort}
                                            onSort={sortBy}
                                        />
                                        <th className="table-heading">Submitted By</th>
                                        <th className="table-heading">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.data.map((caseRecord) => (
                                        <tr
                                            key={caseRecord.id}
                                            className="data-row border-b border-slate-100 align-top"
                                        >
                                            <td className="table-cell">
                                                <p className="table-cell-primary">
                                                    {caseRecord.docket_number}
                                                </p>
                                                <ExpandableCollection
                                                    id={`subpoena-review-${caseRecord.id}-desktop-offenses`}
                                                    items={caseRecord.offenses}
                                                    singularLabel="offense"
                                                    pluralLabel="offenses"
                                                    emptyValue=""
                                                    className="mt-1"
                                                />
                                            </td>
                                            <td className="table-cell">{caseRecord.date}</td>
                                            <td className="table-cell">
                                                <p>
                                                    Complainant:{' '}
                                                    {caseRecord.complainants.join(', ')}
                                                </p>
                                                <p className="mt-1.5">
                                                    Respondent: {caseRecord.respondents.join(', ')}
                                                </p>
                                            </td>
                                            <td className="table-cell">
                                                {caseRecord.police_station}
                                            </td>
                                            <td className="table-cell tabular-nums">
                                                {caseRecord.revision_number}
                                            </td>
                                            <td className="table-cell">
                                                {caseRecord.created_by_name}
                                            </td>
                                            <td className="table-cell table-cell-actions">
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
                                            <td colSpan={7} className="p-0">
                                                {emptyState}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="lg:hidden" role="region" aria-label="Subpoena Review list">
                            {cases.data.length === 0 ? (
                                emptyState
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
                                                <MobileDetail
                                                    label="Date"
                                                    value={caseRecord.date}
                                                />
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
                                                    value={
                                                        <ExpandableCollection
                                                            id={`subpoena-review-${caseRecord.id}-mobile-offenses`}
                                                            items={caseRecord.offenses}
                                                            singularLabel="offense"
                                                            pluralLabel="offenses"
                                                            emptyValue="Not set"
                                                        />
                                                    }
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
                </StickyDataset>
            </section>
        </AuthenticatedLayout>
    );
}

function MobileDetail({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words text-slate-800">
                {typeof value === 'string' ? value || 'Not set' : value}
            </dd>
        </div>
    );
}
