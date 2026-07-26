import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
import StatusBadge from '../../../Components/StatusBadge';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type WorkflowItem = {
    case_id: string;
    docket_number: string;
    offenses: string[];
    complainants: string[];
    respondents: string[];
    police_station: string;
    date: string;
    assigned_prosecutor: string;
    revision_number: number | null;
    denial_reason: string | null;
    workflow_label: string;
    subpoena_status?: string;
    created_by?: string;
    can_generate_pdf?: boolean;
    resolution_id?: string | null;
    resolution_verdict?: string | null;
    resolution_status?: string | null;
    court?: string | null;
    submitted_by?: string | null;
    can_submit?: boolean;
    can_revise: boolean;
};

type Props = {
    tab: 'subpoenas' | 'resolutions';
    filters: { search: string; status: string; sort: string; direction: string };
    statuses: string[];
    items: {
        data: WorkflowItem[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
};

export default function Index({ tab, filters, statuses, items }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [sort, setSort] = useState(filters.sort);
    const [direction, setDirection] = useState(filters.direction);

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get(
            '/secretary/verifying-cases',
            { tab, search, status, sort, direction },
            { preserveState: true },
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title="Verifying Cases" />
            <section className="min-w-0 space-y-6">
                <PageHeader
                    title="Verifying Cases"
                    description="Subpoena and Resolution workflow for the assigned Prosecutor."
                />

                <nav
                    aria-label="Verification sections"
                    className="surface inline-grid grid-cols-2 p-1"
                >
                    <WorkflowTab
                        active={tab === 'subpoenas'}
                        href="/secretary/verifying-cases?tab=subpoenas"
                    >
                        Subpoenas
                    </WorkflowTab>
                    <WorkflowTab
                        active={tab === 'resolutions'}
                        href="/secretary/verifying-cases?tab=resolutions"
                    >
                        Resolutions
                    </WorkflowTab>
                </nav>

                <div
                    aria-label={tab === 'subpoenas' ? 'Subpoenas' : 'Resolutions'}
                    className="surface min-w-0 overflow-hidden"
                >
                    <form
                        onSubmit={submit}
                        className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(220px,1fr)_160px_170px_140px_auto]"
                    >
                        <label className="text-sm font-medium text-slate-700">
                            Search
                            <input
                                className="input mt-2"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </label>
                        <label className="text-sm font-medium text-slate-700">
                            Status
                            <select
                                className="input mt-2"
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                            >
                                <option value="">All</option>
                                {statuses.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm font-medium text-slate-700">
                            Sort By
                            <select
                                className="input mt-2"
                                value={sort}
                                onChange={(event) => setSort(event.target.value)}
                            >
                                <option value="docket_number">Docket Number</option>
                                {tab === 'subpoenas' && <option value="date">Date</option>}
                                <option value="status">Status</option>
                                <option value="revision">Revision</option>
                                {tab === 'resolutions' && <option value="verdict">Verdict</option>}
                            </select>
                        </label>
                        <label className="text-sm font-medium text-slate-700">
                            Direction
                            <select
                                className="input mt-2"
                                value={direction}
                                onChange={(event) => setDirection(event.target.value)}
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </label>
                        <button
                            type="submit"
                            className="min-h-11 self-end rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                        >
                            Apply
                        </button>
                    </form>

                    <div
                        className="table-scroll hidden xl:block"
                        tabIndex={0}
                        role="region"
                        aria-label={`${tab === 'subpoenas' ? 'Subpoena' : 'Resolution'} verification table`}
                    >
                        {tab === 'subpoenas' ? (
                            <SubpoenaTable items={items.data} />
                        ) : (
                            <ResolutionTable items={items.data} />
                        )}
                    </div>

                    <div
                        className="xl:hidden"
                        role="region"
                        aria-label={`${tab === 'subpoenas' ? 'Subpoena' : 'Resolution'} verification list`}
                    >
                        <WorkflowCards tab={tab} items={items.data} />
                    </div>

                    <Pagination
                        links={items.links}
                        from={items.from}
                        to={items.to}
                        total={items.total}
                        ariaLabel="Verification pagination"
                    />
                </div>
            </section>
        </AuthenticatedLayout>
    );
}

function WorkflowTab({
    active,
    href,
    children,
}: {
    active: boolean;
    href: string;
    children: string;
}) {
    return (
        <Link
            aria-current={active ? 'page' : undefined}
            href={href}
            className={`flex min-h-11 min-w-28 items-center justify-center rounded px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-1 ${active ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
        >
            {children}
        </Link>
    );
}

function SubpoenaTable({ items }: { items: WorkflowItem[] }) {
    return (
        <table className="w-full min-w-[1640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                    {[
                        'Docket Number',
                        'Crime/Case',
                        'Complainant',
                        'Respondent',
                        'Police Station',
                        'Date',
                        'Assigned Prosecutor',
                        'Subpoena Status',
                        'Revision',
                        'Created By',
                        'Workflow',
                        'Denial Reason',
                        'Actions',
                    ].map((label) => (
                        <th key={label} className="px-3 py-3 font-semibold">
                            {label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {items.map((item) => (
                    <tr
                        key={item.case_id}
                        className={`border-b border-slate-100 align-top ${item.subpoena_status === 'Denied' ? 'bg-red-50/60' : ''}`}
                    >
                        <CaseCells item={item} includeStation />
                        <td className="px-3 py-3">
                            <StatusBadge value={item.subpoena_status} />
                        </td>
                        <td className="px-3 py-3">{item.revision_number}</td>
                        <td className="px-3 py-3">{item.created_by}</td>
                        <td className="px-3 py-3 font-medium text-slate-700">
                            {item.workflow_label}
                        </td>
                        <td className="max-w-72 whitespace-normal px-3 py-3 text-red-800">
                            {item.denial_reason ?? '-'}
                        </td>
                        <td className="px-3 py-3">
                            <div className="flex min-w-max flex-wrap gap-3">
                                <ActionLink href={`/cases/${item.case_id}`}>View</ActionLink>
                                {item.can_revise && (
                                    <ActionLink href={`/cases/${item.case_id}/edit`}>
                                        {item.subpoena_status === 'Denied'
                                            ? 'Revise and Resubmit'
                                            : 'Edit'}
                                    </ActionLink>
                                )}
                                {item.can_generate_pdf && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(`/cases/${item.case_id}/documents/subpoena`)
                                        }
                                        className="font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                                    >
                                        Generate PDF
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
                {items.length === 0 && (
                    <tr>
                        <td colSpan={13} className="px-4 py-8 text-center text-slate-600">
                            No Subpoenas found.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

function ResolutionTable({ items }: { items: WorkflowItem[] }) {
    return (
        <table className="w-full min-w-[1580px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                    {[
                        'Docket Number',
                        'Crime/Case',
                        'Complainant',
                        'Respondent',
                        'Assigned Prosecutor',
                        'Resolution Verdict',
                        'Resolution Status',
                        'Court',
                        'Revision',
                        'Submitted By',
                        'Workflow',
                        'Denial Reason',
                        'Actions',
                    ].map((label) => (
                        <th key={label} className="px-3 py-3 font-semibold">
                            {label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {items.map((item) => (
                    <tr
                        key={item.case_id}
                        className={`border-b border-slate-100 align-top ${item.resolution_status === 'Denied' ? 'bg-red-50/60' : ''}`}
                    >
                        <CaseCells item={item} />
                        <td className="px-3 py-3">{item.resolution_verdict ?? '-'}</td>
                        <td className="px-3 py-3">
                            <StatusBadge value={item.resolution_status} />
                        </td>
                        <td className="px-3 py-3">{item.court ?? '-'}</td>
                        <td className="px-3 py-3">{item.revision_number ?? '-'}</td>
                        <td className="px-3 py-3">{item.submitted_by ?? '-'}</td>
                        <td className="px-3 py-3 font-medium text-slate-700">
                            {item.workflow_label}
                        </td>
                        <td className="max-w-72 whitespace-normal px-3 py-3 text-red-800">
                            {item.denial_reason ?? '-'}
                        </td>
                        <td className="px-3 py-3">
                            <div className="flex min-w-max flex-wrap gap-3">
                                {item.resolution_id && (
                                    <ActionLink href={`/resolutions/${item.resolution_id}`}>
                                        View
                                    </ActionLink>
                                )}
                                {item.can_submit && (
                                    <ActionLink href={`/cases/${item.case_id}/resolution/create`}>
                                        Submit
                                    </ActionLink>
                                )}
                                {item.can_revise && item.resolution_id && (
                                    <ActionLink href={`/resolutions/${item.resolution_id}/edit`}>
                                        {item.resolution_status === 'Denied'
                                            ? 'Revise and Resubmit'
                                            : 'Revise'}
                                    </ActionLink>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
                {items.length === 0 && (
                    <tr>
                        <td colSpan={13} className="px-4 py-8 text-center text-slate-600">
                            No Resolutions found.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

function CaseCells({
    item,
    includeStation = false,
}: {
    item: WorkflowItem;
    includeStation?: boolean;
}) {
    return (
        <>
            <td className="px-3 py-3 font-medium text-slate-950">{item.docket_number}</td>
            <td className="px-3 py-3">{item.offenses.join(', ')}</td>
            <td className="px-3 py-3">{item.complainants.join(', ')}</td>
            <td className="px-3 py-3">{item.respondents.join(', ')}</td>
            {includeStation && (
                <>
                    <td className="px-3 py-3">{item.police_station}</td>
                    <td className="px-3 py-3">{item.date}</td>
                </>
            )}
            <td className="px-3 py-3">{item.assigned_prosecutor}</td>
        </>
    );
}

function ActionLink({ href, children }: { href: string; children: string }) {
    return (
        <Link
            href={href}
            className="font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
        >
            {children}
        </Link>
    );
}

function WorkflowCards({ tab, items }: { tab: Props['tab']; items: WorkflowItem[] }) {
    if (items.length === 0) {
        return (
            <EmptyState
                title={tab === 'subpoenas' ? 'No Subpoenas found.' : 'No Resolutions found.'}
            />
        );
    }

    return (
        <ol>
            {items.map((item) => (
                <li key={item.case_id} className="mobile-data-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-950">{item.docket_number}</p>
                            <p className="mt-1 break-words text-sm text-slate-700">
                                {item.offenses.join(', ')}
                            </p>
                        </div>
                        <StatusBadge
                            value={
                                tab === 'subpoenas' ? item.subpoena_status : item.resolution_status
                            }
                        />
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <CardDetail label="Complainant" value={item.complainants.join(', ')} />
                        <CardDetail label="Respondent" value={item.respondents.join(', ')} />
                        <CardDetail label="Assigned Prosecutor" value={item.assigned_prosecutor} />
                        {tab === 'subpoenas' ? (
                            <>
                                <CardDetail label="Police Station" value={item.police_station} />
                                <CardDetail label="Date" value={item.date} />
                                <CardDetail label="Created By" value={item.created_by ?? '-'} />
                            </>
                        ) : (
                            <>
                                <CardDetail
                                    label="Resolution Verdict"
                                    value={item.resolution_verdict ?? '-'}
                                />
                                <CardDetail label="Court" value={item.court ?? '-'} />
                                <CardDetail label="Submitted By" value={item.submitted_by ?? '-'} />
                            </>
                        )}
                        <CardDetail label="Revision" value={String(item.revision_number ?? '-')} />
                        <CardDetail label="Workflow" value={item.workflow_label} />
                    </dl>
                    {item.denial_reason && (
                        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                            <span className="font-semibold">Denial Reason:</span>{' '}
                            {item.denial_reason}
                        </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-200 pt-3">
                        <WorkflowActions tab={tab} item={item} />
                    </div>
                </li>
            ))}
        </ol>
    );
}

function WorkflowActions({ tab, item }: { tab: Props['tab']; item: WorkflowItem }) {
    if (tab === 'subpoenas') {
        return (
            <>
                <ActionLink href={`/cases/${item.case_id}`}>View</ActionLink>
                {item.can_revise && (
                    <ActionLink href={`/cases/${item.case_id}/edit`}>
                        {item.subpoena_status === 'Denied' ? 'Revise and Resubmit' : 'Edit'}
                    </ActionLink>
                )}
                {item.can_generate_pdf && (
                    <button
                        type="button"
                        onClick={() => router.post(`/cases/${item.case_id}/documents/subpoena`)}
                        className="action-link"
                    >
                        Generate PDF
                    </button>
                )}
            </>
        );
    }

    return (
        <>
            {item.resolution_id && (
                <ActionLink href={`/resolutions/${item.resolution_id}`}>View</ActionLink>
            )}
            {item.can_submit && (
                <ActionLink href={`/cases/${item.case_id}/resolution/create`}>Submit</ActionLink>
            )}
            {item.can_revise && item.resolution_id && (
                <ActionLink href={`/resolutions/${item.resolution_id}/edit`}>
                    {item.resolution_status === 'Denied' ? 'Revise and Resubmit' : 'Revise'}
                </ActionLink>
            )}
        </>
    );
}

function CardDetail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words text-slate-800">{value || '-'}</dd>
        </div>
    );
}
