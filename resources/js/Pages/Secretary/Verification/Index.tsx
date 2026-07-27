import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
import StatusBadge from '../../../Components/StatusBadge';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type WorkflowType = 'subpoenas' | 'resolutions';
type Filters = { search: string; status: string; sort: string; direction: string };
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
type PaginatedItems = {
    data: WorkflowItem[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
};
type Props = {
    filters: { subpoenas: Filters; resolutions: Filters };
    statuses: { subpoenas: string[]; resolutions: string[] };
    subpoenas: PaginatedItems;
    resolutions: PaginatedItems;
};

export default function Index({ filters, statuses, subpoenas, resolutions }: Props) {
    const returnUrl = verificationReturnUrl(filters, subpoenas.current_page, resolutions.current_page);

    return (
        <AuthenticatedLayout>
            <Head title="Verifying Cases" />
            <section className="min-w-0 space-y-6">
                <PageHeader
                    title="Verifying Cases"
                    description="Subpoena and Resolution workflow for the assigned Prosecutor."
                />
                <VerificationSection
                    type="subpoenas"
                    filters={filters}
                    statuses={statuses.subpoenas}
                    items={subpoenas}
                    returnUrl={returnUrl}
                    subpoenaPage={subpoenas.current_page}
                    resolutionPage={resolutions.current_page}
                />
                <VerificationSection
                    type="resolutions"
                    filters={filters}
                    statuses={statuses.resolutions}
                    items={resolutions}
                    returnUrl={returnUrl}
                    subpoenaPage={subpoenas.current_page}
                    resolutionPage={resolutions.current_page}
                />
            </section>
        </AuthenticatedLayout>
    );
}

function VerificationSection({ type, filters: allFilters, statuses, items, returnUrl, subpoenaPage, resolutionPage }: {
    type: WorkflowType;
    filters: Props['filters'];
    statuses: string[];
    items: PaginatedItems;
    returnUrl: string;
    subpoenaPage: number;
    resolutionPage: number;
}) {
    const filters = allFilters[type];
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [sort, setSort] = useState(filters.sort);
    const [direction, setDirection] = useState(filters.direction);
    const title = type === 'subpoenas' ? 'Subpoenas' : 'Resolutions';
    const singular = type === 'subpoenas' ? 'Subpoena' : 'Resolution';

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get('/secretary/verifying-cases', verificationQuery(
            allFilters,
            type,
            { search, status, sort, direction },
            subpoenaPage,
            resolutionPage,
        ), { preserveState: true });
    }

    return (
        <section aria-labelledby={`${type}-heading`} className="surface min-w-0 overflow-hidden">
            <h2 id={`${type}-heading`} className="border-b border-slate-200 px-4 py-3 text-lg font-semibold">
                {title}
            </h2>
            <form onSubmit={submit} className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_170px_140px_auto]">
                <Field label="Search">
                    <input className="input mt-2" value={search} onChange={(event) => setSearch(event.target.value)} />
                </Field>
                <Field label="Status">
                    <select className="input mt-2" value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="">All</option>
                        {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                </Field>
                <Field label="Sort By">
                    <select className="input mt-2" value={sort} onChange={(event) => setSort(event.target.value)}>
                        <option value="docket_number">Docket Number</option>
                        {type === 'subpoenas' && <option value="date">Date</option>}
                        <option value="status">Status</option>
                        <option value="revision">Revision</option>
                        {type === 'resolutions' && <option value="verdict">Verdict</option>}
                    </select>
                </Field>
                <Field label="Direction">
                    <select className="input mt-2" value={direction} onChange={(event) => setDirection(event.target.value)}>
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </Field>
                <button type="submit" className="min-h-11 self-end rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                    Apply
                </button>
            </form>

            <div className="table-scroll hidden xl:block" tabIndex={0} role="region" aria-label={`${singular} verification table`}>
                <WorkflowTable type={type} items={items.data} returnUrl={returnUrl} />
            </div>
            <div className="xl:hidden" role="region" aria-label={`${singular} verification list`}>
                <WorkflowCards type={type} items={items.data} returnUrl={returnUrl} />
            </div>
            <Pagination links={items.links} from={items.from} to={items.to} total={items.total} ariaLabel={`${title} pagination`} />
        </section>
    );
}

function WorkflowTable({ type, items, returnUrl }: { type: WorkflowType; items: WorkflowItem[]; returnUrl: string }) {
    const subpoena = type === 'subpoenas';
    const headers = subpoena
        ? ['Docket Number', 'Crime/Case', 'Complainant', 'Respondent', 'Police Station', 'Date', 'Assigned Prosecutor', 'Subpoena Status', 'Revision', 'Created By', 'Workflow', 'Denial Reason', 'Actions']
        : ['Docket Number', 'Crime/Case', 'Complainant', 'Respondent', 'Assigned Prosecutor', 'Resolution Verdict', 'Resolution Status', 'Court', 'Revision', 'Submitted By', 'Workflow', 'Denial Reason', 'Actions'];

    return (
        <table className="w-full min-w-[1640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-semibold">{header}</th>)}</tr>
            </thead>
            <tbody>
                {items.map((item) => (
                    <tr key={item.case_id} className="data-row border-b border-slate-100 align-top">
                        <CaseCells item={item} includeStation={subpoena} />
                        {subpoena ? (
                            <>
                                <td className="px-3 py-3"><StatusBadge value={item.subpoena_status} /></td>
                                <td className="px-3 py-3">{item.revision_number}</td>
                                <td className="px-3 py-3">{item.created_by ?? '-'}</td>
                            </>
                        ) : (
                            <>
                                <td className="px-3 py-3">{item.resolution_verdict ?? '-'}</td>
                                <td className="px-3 py-3"><StatusBadge value={item.resolution_status} /></td>
                                <td className="px-3 py-3">{item.court ?? '-'}</td>
                                <td className="px-3 py-3">{item.revision_number ?? '-'}</td>
                                <td className="px-3 py-3">{item.submitted_by ?? '-'}</td>
                            </>
                        )}
                        <td className="px-3 py-3">{item.workflow_label}</td>
                        <td className="max-w-64 px-3 py-3 text-red-800">{item.denial_reason ?? '-'}</td>
                        <td className="px-3 py-3"><WorkflowActions type={type} item={item} returnUrl={returnUrl} /></td>
                    </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={13} className="px-4 py-8 text-center text-slate-600">No {type === 'subpoenas' ? 'Subpoenas' : 'Resolutions'} found.</td></tr>}
            </tbody>
        </table>
    );
}

function CaseCells({ item, includeStation }: { item: WorkflowItem; includeStation: boolean }) {
    return <>
        <td className="px-3 py-3 font-medium text-slate-950">{item.docket_number}</td>
        <td className="px-3 py-3">{item.offenses.join(', ')}</td>
        <td className="px-3 py-3">{item.complainants.join(', ')}</td>
        <td className="px-3 py-3">{item.respondents.join(', ')}</td>
        {includeStation && <><td className="px-3 py-3">{item.police_station}</td><td className="px-3 py-3">{item.date}</td></>}
        <td className="px-3 py-3">{item.assigned_prosecutor}</td>
    </>;
}

function WorkflowCards({ type, items, returnUrl }: { type: WorkflowType; items: WorkflowItem[]; returnUrl: string }) {
    if (items.length === 0) return <EmptyState title={`No ${type === 'subpoenas' ? 'Subpoenas' : 'Resolutions'} found.`} />;

    return <ol>{items.map((item) => (
        <li key={item.case_id} className="mobile-data-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="font-semibold">{item.docket_number}</p><p className="mt-1 break-words text-sm text-slate-700">{item.offenses.join(', ')}</p></div>
                <StatusBadge value={type === 'subpoenas' ? item.subpoena_status : item.resolution_status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Complainant" value={item.complainants.join(', ')} />
                <Detail label="Respondent" value={item.respondents.join(', ')} />
                <Detail label="Assigned Prosecutor" value={item.assigned_prosecutor} />
                {type === 'subpoenas' ? <><Detail label="Police Station" value={item.police_station} /><Detail label="Date" value={item.date} /><Detail label="Created By" value={item.created_by} /></> : <><Detail label="Resolution Verdict" value={item.resolution_verdict} /><Detail label="Court" value={item.court} /><Detail label="Submitted By" value={item.submitted_by} /></>}
                <Detail label="Revision" value={item.revision_number?.toString()} />
                <Detail label="Workflow" value={item.workflow_label} />
            </dl>
            {item.denial_reason && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"><span className="font-semibold">Denial Reason:</span> {item.denial_reason}</p>}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-200 pt-3"><WorkflowActions type={type} item={item} returnUrl={returnUrl} /></div>
        </li>
    ))}</ol>;
}

function WorkflowActions({ type, item, returnUrl }: { type: WorkflowType; item: WorkflowItem; returnUrl: string }) {
    if (type === 'subpoenas') return <>
        <ActionLink href={`/cases/${item.case_id}?return_to=${encodeURIComponent(returnUrl)}`}>View</ActionLink>
        {item.can_revise && <ActionLink href={`/cases/${item.case_id}/edit`}>{item.subpoena_status === 'Denied' ? 'Revise and Resubmit' : 'Edit'}</ActionLink>}
        {item.can_generate_pdf && <button type="button" onClick={() => router.post(`/cases/${item.case_id}/documents/subpoena`)} className="action-link">Generate PDF</button>}
    </>;

    return <>
        {item.resolution_id && <ActionLink href={`/resolutions/${item.resolution_id}`}>View</ActionLink>}
        {item.can_submit && <ActionLink href={`/cases/${item.case_id}/resolution/create`}>Submit</ActionLink>}
        {item.can_revise && item.resolution_id && <ActionLink href={`/resolutions/${item.resolution_id}/edit`}>{item.resolution_status === 'Denied' ? 'Revise and Resubmit' : 'Revise'}</ActionLink>}
    </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="text-sm font-medium text-slate-700">{label}{children}</label>;
}
function Detail({ label, value }: { label: string; value?: string | null }) {
    return <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-slate-800">{value || '-'}</dd></div>;
}
function ActionLink({ href, children }: { href: string; children: string }) {
    return <Link href={href} className="font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">{children}</Link>;
}

function verificationQuery(
    filters: Props['filters'],
    type?: WorkflowType,
    replacement?: Filters,
    subpoenaPage = 1,
    resolutionPage = 1,
) {
    const subpoenas = type === 'subpoenas' && replacement ? replacement : filters.subpoenas;
    const resolutions = type === 'resolutions' && replacement ? replacement : filters.resolutions;
    return {
        sub_search: subpoenas.search, sub_status: subpoenas.status, sub_sort: subpoenas.sort, sub_direction: subpoenas.direction,
        res_search: resolutions.search, res_status: resolutions.status, res_sort: resolutions.sort, res_direction: resolutions.direction,
        ...(subpoenaPage > 1 ? { sub_page: String(subpoenaPage) } : {}),
        ...(resolutionPage > 1 ? { res_page: String(resolutionPage) } : {}),
    };
}
function verificationReturnUrl(filters: Props['filters'], subpoenaPage: number, resolutionPage: number) {
    const parameters = new URLSearchParams(verificationQuery(filters, undefined, undefined, subpoenaPage, resolutionPage));
    return `/secretary/verifying-cases?${parameters.toString()}`;
}
