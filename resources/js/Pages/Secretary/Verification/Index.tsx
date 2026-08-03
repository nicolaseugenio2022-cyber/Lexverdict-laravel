import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import EmptyState from '../../../Components/EmptyState';
import ExpandableCollection from '../../../Components/ExpandableCollection';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
import RecordEntryLink from '../../../Components/RecordEntryLink';
import StatusBadge from '../../../Components/StatusBadge';
import StickyDataset from '../../../Components/StickyDataset';
import { useToast } from '../../../Components/toast';
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
    const returnUrl = verificationReturnUrl(
        filters,
        subpoenas.current_page,
        resolutions.current_page,
    );

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

function VerificationSection({
    type,
    filters: allFilters,
    statuses,
    items,
    returnUrl,
    subpoenaPage,
    resolutionPage,
}: {
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
    const hasActiveFilters = Boolean(filters.search || filters.status);
    const emptyState = (
        <EmptyState
            title={
                hasActiveFilters
                    ? `No ${title} match the current filters.`
                    : `No ${title} are available for verification.`
            }
            description={
                hasActiveFilters
                    ? `Clear the current ${singular} search and status filter to review all visible records.`
                    : `${title} available to the assigned Secretary will appear here.`
            }
            action={
                hasActiveFilters ? (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                            router.get(
                                '/secretary/verifying-cases',
                                verificationQuery(
                                    allFilters,
                                    type,
                                    { ...filters, search: '', status: '' },
                                    subpoenaPage,
                                    resolutionPage,
                                ),
                                { preserveState: true },
                            )
                        }
                    >
                        Clear filters
                    </button>
                ) : undefined
            }
        />
    );

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get(
            '/secretary/verifying-cases',
            verificationQuery(
                allFilters,
                type,
                { search, status, sort, direction },
                subpoenaPage,
                resolutionPage,
            ),
            { preserveState: true },
        );
    }

    return (
        <section
            aria-labelledby={`${type}-heading`}
            className="surface sticky-table-surface min-w-0"
        >
            <h2 id={`${type}-heading`} className="panel-header panel-title px-4 py-3">
                {title}
            </h2>
            <StickyDataset
                stickyControls={false}
                controls={
                    <form
                        onSubmit={submit}
                        className="filter-panel grid gap-3 rounded-none border-x-0 p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_170px_140px_auto]"
                    >
                        <Field label="Search">
                            <input
                                className="input mt-2"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </Field>
                        <Field label="Status">
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
                        </Field>
                        <Field label="Sort By">
                            <select
                                className="input mt-2"
                                value={sort}
                                onChange={(event) => setSort(event.target.value)}
                            >
                                <option value="docket_number">Docket Number</option>
                                {type === 'subpoenas' && <option value="date">Date</option>}
                                <option value="status">Status</option>
                                <option value="revision">Revision</option>
                                {type === 'resolutions' && <option value="verdict">Verdict</option>}
                            </select>
                        </Field>
                        <Field label="Direction">
                            <select
                                className="input mt-2"
                                value={direction}
                                onChange={(event) => setDirection(event.target.value)}
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </Field>
                        <button type="submit" className="btn btn-secondary self-end">
                            Apply
                        </button>
                    </form>
                }
            >
                <div
                    className="hidden xl:block"
                    role="region"
                    aria-label={`${singular} verification table`}
                >
                    <WorkflowTable
                        type={type}
                        items={items.data}
                        returnUrl={returnUrl}
                        emptyState={emptyState}
                    />
                </div>
                <div
                    className="xl:hidden"
                    role="region"
                    aria-label={`${singular} verification list`}
                >
                    <WorkflowCards
                        type={type}
                        items={items.data}
                        returnUrl={returnUrl}
                        emptyState={emptyState}
                    />
                </div>
                <Pagination
                    links={items.links}
                    from={items.from}
                    to={items.to}
                    total={items.total}
                    ariaLabel={`${title} pagination`}
                />
            </StickyDataset>
        </section>
    );
}

function WorkflowTable({
    type,
    items,
    returnUrl,
    emptyState,
}: {
    type: WorkflowType;
    items: WorkflowItem[];
    returnUrl: string;
    emptyState: ReactNode;
}) {
    const subpoena = type === 'subpoenas';
    const hasWorkflowCommands = items.some((item) => hasWorkflowCommand(type, item));

    return (
        <table className="data-table sticky-table-header table-fixed">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                    <th className={`table-heading ${hasWorkflowCommands ? 'w-[15%]' : 'w-[18%]'}`}>
                        Case
                    </th>
                    <th className={`table-heading ${hasWorkflowCommands ? 'w-[16%]' : 'w-[18%]'}`}>
                        Parties
                    </th>
                    <th className={`table-heading ${hasWorkflowCommands ? 'w-[18%]' : 'w-[20%]'}`}>
                        Assignment
                    </th>
                    <th className={`table-heading ${hasWorkflowCommands ? 'w-[18%]' : 'w-[20%]'}`}>
                        {subpoena ? 'Subpoena' : 'Resolution'}
                    </th>
                    <th className={`table-heading ${hasWorkflowCommands ? 'w-[19%]' : 'w-[24%]'}`}>
                        Workflow
                    </th>
                    {hasWorkflowCommands && <th className="table-heading w-[14%]">Actions</th>}
                </tr>
            </thead>
            <tbody>
                {items.map((item) => (
                    <tr
                        key={item.case_id}
                        className="record-entry data-row border-b border-slate-100 align-top"
                    >
                        <td className="table-cell">
                            <p className="table-cell-primary">
                                <RecordEntryLink
                                    href={workflowHref(type, item, returnUrl)}
                                    accessibleLabel={workflowAccessibleLabel(type, item)}
                                >
                                    {item.docket_number}
                                </RecordEntryLink>
                            </p>
                            <ExpandableCollection
                                id={`verification-${type}-${item.case_id}-desktop-offenses`}
                                items={item.offenses}
                                singularLabel="offense"
                                pluralLabel="offenses"
                                emptyValue="-"
                                className="mt-1"
                            />
                        </td>
                        <td className="table-cell">
                            <GroupedDetail
                                label="Complainant"
                                value={item.complainants.join(', ')}
                            />
                            <GroupedDetail label="Respondent" value={item.respondents.join(', ')} />
                        </td>
                        <td className="table-cell">
                            {subpoena && (
                                <>
                                    <GroupedDetail
                                        label="Police Station"
                                        value={item.police_station}
                                    />
                                    <GroupedDetail label="Date" value={item.date} />
                                </>
                            )}
                            <GroupedDetail
                                label="Assigned Prosecutor"
                                value={item.assigned_prosecutor}
                            />
                        </td>
                        <td className="table-cell">
                            {subpoena ? (
                                <>
                                    <StatusBadge value={item.subpoena_status} />
                                    <GroupedDetail
                                        label="Revision"
                                        value={item.revision_number?.toString()}
                                    />
                                    <GroupedDetail label="Created By" value={item.created_by} />
                                </>
                            ) : (
                                <>
                                    <GroupedDetail
                                        label="Resolution Verdict"
                                        value={item.resolution_verdict}
                                    />
                                    <div className="mt-1.5">
                                        <span className="metadata-text mr-1">
                                            Resolution Status:
                                        </span>
                                        <StatusBadge value={item.resolution_status} />
                                    </div>
                                    <GroupedDetail label="Court" value={item.court} />
                                    <GroupedDetail
                                        label="Revision"
                                        value={item.revision_number?.toString()}
                                    />
                                    <GroupedDetail label="Submitted By" value={item.submitted_by} />
                                </>
                            )}
                        </td>
                        <td className="table-cell">
                            <p>{item.workflow_label}</p>
                            <GroupedDetail
                                label="Denial Reason"
                                value={item.denial_reason}
                                danger={Boolean(item.denial_reason)}
                            />
                        </td>
                        {hasWorkflowCommands && (
                            <td className="record-entry-actions table-cell table-cell-actions whitespace-normal">
                                <WorkflowActions type={type} item={item} />
                            </td>
                        )}
                    </tr>
                ))}
                {items.length === 0 && (
                    <tr>
                        <td colSpan={hasWorkflowCommands ? 6 : 5} className="p-0">
                            {emptyState}
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

function WorkflowCards({
    type,
    items,
    returnUrl,
    emptyState,
}: {
    type: WorkflowType;
    items: WorkflowItem[];
    returnUrl: string;
    emptyState: ReactNode;
}) {
    if (items.length === 0) return emptyState;

    return (
        <ol>
            {items.map((item) => (
                <li key={item.case_id} className="record-entry mobile-data-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-semibold">
                                <RecordEntryLink
                                    href={workflowHref(type, item, returnUrl)}
                                    accessibleLabel={workflowAccessibleLabel(type, item)}
                                >
                                    {item.docket_number}
                                </RecordEntryLink>
                            </p>
                            <ExpandableCollection
                                id={`verification-${type}-${item.case_id}-mobile-offenses`}
                                items={item.offenses}
                                singularLabel="offense"
                                pluralLabel="offenses"
                                emptyValue=""
                                className="mt-1 break-words text-sm text-slate-700"
                            />
                        </div>
                        <StatusBadge
                            value={
                                type === 'subpoenas' ? item.subpoena_status : item.resolution_status
                            }
                        />
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <Detail label="Complainant" value={item.complainants.join(', ')} />
                        <Detail label="Respondent" value={item.respondents.join(', ')} />
                        <Detail label="Assigned Prosecutor" value={item.assigned_prosecutor} />
                        {type === 'subpoenas' ? (
                            <>
                                <Detail label="Police Station" value={item.police_station} />
                                <Detail label="Date" value={item.date} />
                                <Detail label="Created By" value={item.created_by} />
                            </>
                        ) : (
                            <>
                                <Detail
                                    label="Resolution Verdict"
                                    value={item.resolution_verdict}
                                />
                                <Detail label="Court" value={item.court} />
                                <Detail label="Submitted By" value={item.submitted_by} />
                            </>
                        )}
                        <Detail label="Revision" value={item.revision_number?.toString()} />
                        <Detail label="Workflow" value={item.workflow_label} />
                    </dl>
                    {item.denial_reason && (
                        <p className="notice notice-danger mt-4">
                            <span className="font-semibold">Denial Reason:</span>{' '}
                            {item.denial_reason}
                        </p>
                    )}
                    {hasWorkflowCommand(type, item) && (
                        <div className="record-entry-actions mt-4 border-t border-slate-200 pt-3">
                            <WorkflowActions type={type} item={item} />
                        </div>
                    )}
                </li>
            ))}
        </ol>
    );
}

function WorkflowActions({ type, item }: { type: WorkflowType; item: WorkflowItem }) {
    const toast = useToast();

    if (type === 'subpoenas')
        return (
            <div className="action-group items-start">
                {item.can_revise && (
                    <ActionLink href={`/cases/${item.case_id}/edit`}>
                        {item.subpoena_status === 'Denied' ? 'Revise and Resubmit' : 'Edit'}
                    </ActionLink>
                )}
                {item.can_generate_pdf && (
                    <button
                        type="button"
                        onClick={() =>
                            router.post(
                                `/cases/${item.case_id}/documents/subpoena`,
                                {},
                                {
                                    onSuccess: () =>
                                        toast.info('Subpoena PDF generation requested.'),
                                    onHttpException: () =>
                                        toast.error('Unable to request the Subpoena PDF.'),
                                    onNetworkError: () =>
                                        toast.error('Unable to request the Subpoena PDF.'),
                                },
                            )
                        }
                        className="btn btn-secondary btn-compact max-w-full flex-none whitespace-normal"
                    >
                        Generate PDF
                    </button>
                )}
            </div>
        );

    return (
        <div className="action-group items-start">
            {item.can_submit && (
                <ActionLink href={`/cases/${item.case_id}/resolution/create`}>Submit</ActionLink>
            )}
            {item.can_revise && item.resolution_id && (
                <ActionLink href={`/resolutions/${item.resolution_id}/edit`}>
                    {item.resolution_status === 'Denied' ? 'Revise and Resubmit' : 'Revise'}
                </ActionLink>
            )}
        </div>
    );
}

function hasWorkflowCommand(type: WorkflowType, item: WorkflowItem) {
    return type === 'subpoenas'
        ? Boolean(item.can_revise || item.can_generate_pdf)
        : Boolean(item.can_submit || item.can_revise);
}

function workflowHref(type: WorkflowType, item: WorkflowItem, returnUrl: string) {
    if (type === 'resolutions' && item.resolution_id) {
        return `/resolutions/${item.resolution_id}`;
    }

    return `/cases/${item.case_id}?return_to=${encodeURIComponent(returnUrl)}`;
}

function workflowAccessibleLabel(type: WorkflowType, item: WorkflowItem) {
    return type === 'subpoenas'
        ? `Open Subpoena case ${item.docket_number}`
        : `Open Resolution for case ${item.docket_number}`;
}

function GroupedDetail({
    label,
    value,
    danger = false,
}: {
    label: string;
    value?: string | null;
    danger?: boolean;
}) {
    return (
        <p className={`mt-1.5 first:mt-0 ${danger ? 'text-red-800' : ''}`}>
            <span className="metadata-text mr-1">{label}:</span>
            <span>{value || '-'}</span>
        </p>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="field-label">
            {label}
            {children}
        </label>
    );
}
function Detail({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words text-slate-800">{value || '-'}</dd>
        </div>
    );
}
function ActionLink({ href, children }: { href: string; children: string }) {
    return (
        <Link
            href={href}
            className="btn btn-secondary btn-compact max-w-full flex-none whitespace-normal"
        >
            {children}
        </Link>
    );
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
        sub_search: subpoenas.search,
        sub_status: subpoenas.status,
        sub_sort: subpoenas.sort,
        sub_direction: subpoenas.direction,
        res_search: resolutions.search,
        res_status: resolutions.status,
        res_sort: resolutions.sort,
        res_direction: resolutions.direction,
        ...(subpoenaPage > 1 ? { sub_page: String(subpoenaPage) } : {}),
        ...(resolutionPage > 1 ? { res_page: String(resolutionPage) } : {}),
    };
}
function verificationReturnUrl(
    filters: Props['filters'],
    subpoenaPage: number,
    resolutionPage: number,
) {
    const parameters = new URLSearchParams(
        verificationQuery(filters, undefined, undefined, subpoenaPage, resolutionPage),
    );
    return `/secretary/verifying-cases?${parameters.toString()}`;
}
