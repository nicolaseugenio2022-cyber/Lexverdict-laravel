import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import EmptyState from '../../../Components/EmptyState';
import ExpandableCollection from '../../../Components/ExpandableCollection';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
import RecordEntryLink from '../../../Components/RecordEntryLink';
import SortableTableHeader from '../../../Components/SortableTableHeader';
import StatusBadge from '../../../Components/StatusBadge';
import StickyDataset from '../../../Components/StickyDataset';
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
    const hasActiveFilters = Boolean(filters.search);
    const emptyState = (
        <EmptyState
            title={
                hasActiveFilters
                    ? 'No pending Resolutions match the current search.'
                    : 'No pending Resolutions are available.'
            }
            description={
                hasActiveFilters
                    ? 'Clear the search to review all pending Resolutions.'
                    : 'Submitted Resolutions awaiting Administrator review will appear here.'
            }
            action={
                hasActiveFilters ? (
                    <Link href="/resolution-reviews" className="btn btn-secondary">
                        Clear search
                    </Link>
                ) : undefined
            }
        />
    );

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
            <section className="page-stack">
                <PageHeader
                    title="Resolution Review"
                    description="Pending Resolutions awaiting Administrator decision."
                />
                <StickyDataset
                    className="grid gap-6"
                    stickyControls={false}
                    controls={
                        <div className="filter-panel">
                            <form
                                onSubmit={submit}
                                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_140px_auto] lg:items-end"
                            >
                                <label
                                    htmlFor="resolution-review-search"
                                    className="field-label flex-1"
                                >
                                    Search
                                    <input
                                        id="resolution-review-search"
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
                                        <option value="verdict_date">Verdict Date</option>
                                        <option value="verdict">Verdict</option>
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
                            className="hidden lg:block"
                            role="region"
                            aria-label="Resolution Review table"
                        >
                            <table className="data-table sticky-table-header table-fixed">
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="table-heading">Case</th>
                                        <th className="table-heading w-[19%]">Parties</th>
                                        <SortableTableHeader
                                            label="Verdict"
                                            name="verdict"
                                            current={filters.sort}
                                            onSort={sortBy}
                                            className="w-[12%]"
                                        />
                                        <SortableTableHeader
                                            label="Verdict Date"
                                            name="verdict_date"
                                            current={filters.sort}
                                            onSort={sortBy}
                                            className="w-[15%]"
                                        />
                                        <th className="table-heading w-[13%]">
                                            Assigned Prosecutor
                                        </th>
                                        <SortableTableHeader
                                            label="Revision"
                                            name="revision_number"
                                            current={filters.sort}
                                            onSort={sortBy}
                                            className="w-[10%]"
                                        />
                                    </tr>
                                </thead>
                                <tbody>
                                    {resolutions.data.map((resolution) => (
                                        <tr
                                            key={resolution.id}
                                            className="record-entry data-row border-b border-slate-100 align-top"
                                        >
                                            <td className="table-cell">
                                                <p className="table-cell-primary">
                                                    <RecordEntryLink
                                                        href={`/resolution-reviews/${resolution.id}`}
                                                        accessibleLabel={`Review Resolution for case ${resolution.docket_number}`}
                                                    >
                                                        {resolution.docket_number}
                                                    </RecordEntryLink>
                                                </p>
                                                <ExpandableCollection
                                                    id={`resolution-review-${resolution.id}-desktop-offenses`}
                                                    items={resolution.offenses}
                                                    singularLabel="offense"
                                                    pluralLabel="offenses"
                                                    emptyValue=""
                                                    className="mt-1"
                                                />
                                            </td>
                                            <td className="table-cell">
                                                <GroupedValue
                                                    label="Complainant"
                                                    value={resolution.complainants.join(', ')}
                                                />
                                                <GroupedValue
                                                    label="Respondent"
                                                    value={resolution.respondents.join(', ')}
                                                />
                                            </td>
                                            <td className="table-cell">
                                                <StatusBadge value={resolution.verdict} />
                                            </td>
                                            <td className="table-cell">
                                                <p>{resolution.verdict_date}</p>
                                                <GroupedValue
                                                    label="Court"
                                                    value={resolution.court || 'Not applicable'}
                                                />
                                            </td>
                                            <td className="table-cell">
                                                {resolution.assigned_prosecutor || 'Unassigned'}
                                            </td>
                                            <td className="table-cell table-cell-numeric">
                                                <p>{resolution.revision_number}</p>
                                                <GroupedValue
                                                    label="Submitted By"
                                                    value={resolution.submitted_by || 'Not set'}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {resolutions.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-0">
                                                {emptyState}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div
                            className="lg:hidden"
                            role="region"
                            aria-label="Resolution Review list"
                        >
                            {resolutions.data.length === 0 ? (
                                emptyState
                            ) : (
                                <ol>
                                    {resolutions.data.map((resolution) => (
                                        <li
                                            key={resolution.id}
                                            className="record-entry mobile-data-card"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-slate-950">
                                                        <RecordEntryLink
                                                            href={`/resolution-reviews/${resolution.id}`}
                                                            accessibleLabel={`Review Resolution for case ${resolution.docket_number}`}
                                                        >
                                                            {resolution.docket_number}
                                                        </RecordEntryLink>
                                                    </p>
                                                    <div className="mt-2">
                                                        <StatusBadge value={resolution.verdict} />
                                                    </div>
                                                </div>
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
                                                        resolution.assigned_prosecutor ||
                                                        'Unassigned'
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
                                                    value={
                                                        <ExpandableCollection
                                                            id={`resolution-review-${resolution.id}-mobile-offenses`}
                                                            items={resolution.offenses}
                                                            singularLabel="offense"
                                                            pluralLabel="offenses"
                                                            emptyValue="Not set"
                                                        />
                                                    }
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
                </StickyDataset>
            </section>
        </AuthenticatedLayout>
    );
}

function GroupedValue({ label, value }: { label: string; value: string }) {
    return (
        <p className="mt-1.5 first:mt-0">
            <span className="metadata-text mr-1">{label}:</span>
            <span>{value}</span>
        </p>
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
