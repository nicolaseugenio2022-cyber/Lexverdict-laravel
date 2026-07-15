import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type PaginationLink = { url: string | null; label: string; active: boolean };

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
            <section aria-labelledby="verifying-cases-title" className="min-w-0 space-y-4">
                <div>
                    <h1 id="verifying-cases-title" className="text-xl font-semibold">
                        Verifying Cases
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Subpoena and Resolution workflow for the assigned Prosecutor.
                    </p>
                </div>

                <nav
                    aria-label="Verification sections"
                    className="inline-flex max-w-full overflow-x-auto rounded-md border border-slate-300 bg-white p-1"
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
                    className="min-w-0 rounded-md border border-slate-200 bg-white"
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
                        className="table-scroll"
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

                    <Pagination items={items} />
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
                            <Status value={item.subpoena_status} />
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
                            <Status value={item.resolution_status} />
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

function Status({ value }: { value?: string | null }) {
    if (!value) return <span className="text-slate-600">-</span>;
    const style =
        value === 'Denied'
            ? 'bg-red-100 text-red-800'
            : value === 'Approved'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-900';
    return (
        <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${style}`}>
            {value}
        </span>
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

function Pagination({ items }: { items: Props['items'] }) {
    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <span>
                Showing {items.from ?? 0} to {items.to ?? 0} of {items.total}
            </span>
            <div className="flex flex-wrap gap-2">
                {items.links.map((link, index) =>
                    link.url ? (
                        <Link
                            key={`${link.label}-${index}`}
                            href={link.url}
                            className={`min-h-10 rounded-md border px-3 py-2 ${link.active ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ) : (
                        <span
                            key={`${link.label}-${index}`}
                            className="min-h-10 rounded-md border border-slate-200 px-3 py-2 text-slate-600"
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ),
                )}
            </div>
        </div>
    );
}
