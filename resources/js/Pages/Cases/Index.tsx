import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import EmptyState from '../../Components/EmptyState';
import ExpandableCollection from '../../Components/ExpandableCollection';
import OperationalSummary, { type OperationalMetric } from '../../Components/OperationalSummary';
import PageHeader from '../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../Components/Pagination';
import RecordEntryLink from '../../Components/RecordEntryLink';
import StatusBadge from '../../Components/StatusBadge';
import StickyDataset from '../../Components/StickyDataset';
import { useToast } from '../../Components/toast';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import type { CaseRecord } from './types';

type ListOption = { value: string; label: string };

type PaginatedCases = {
    data: CaseRecord[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
};

type Props = {
    cases: PaginatedCases;
    filters: {
        search: string;
        filter: string;
        sort: string;
        order: 'asc' | 'desc';
    };
    filter_options: ListOption[];
    sort_options: ListOption[];
    can_create_case: boolean;
    is_process_server: boolean;
    list_role: 'administrator' | 'secretary' | 'prosecutor' | 'process_server';
    list_url: string;
    operational_metrics: OperationalMetric[];
};

export default function Index({
    cases,
    filters,
    filter_options,
    sort_options,
    can_create_case,
    is_process_server,
    list_role,
    list_url,
    operational_metrics,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [filter, setFilter] = useState(filters.filter);

    function navigate(values: Partial<Props['filters']>) {
        router.get(list_url, { ...filters, search, filter, ...values }, { preserveState: true });
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        navigate({});
    }

    const dateColumnLabel =
        list_role === 'administrator' || list_role === 'secretary' ? 'Date Filed' : 'Verdict Date';
    const prosecutorProjection = list_role === 'prosecutor';
    const groupedProjection = list_role === 'administrator' || list_role === 'secretary';
    const hasWorkflowCommands =
        groupedProjection &&
        cases.data.some(
            (caseRecord) => caseRecord.can_submit_resolution || caseRecord.can_generate_subpoena,
        );
    const returnUrl = caseListReturnUrl(list_url, filters, cases.current_page);
    const hasActiveFilters = Boolean(filters.search || filters.filter);
    const emptyState = (
        <EmptyState
            title={
                hasActiveFilters ? 'No cases match the current filters.' : 'No cases are available.'
            }
            description={
                hasActiveFilters
                    ? 'Clear the current search and filter to review all visible cases.'
                    : is_process_server
                      ? 'No cases are currently available for read-only review.'
                      : 'Cases available to your role will appear here.'
            }
            action={
                hasActiveFilters ? (
                    <Link href={list_url} className="btn btn-secondary">
                        Clear filters
                    </Link>
                ) : can_create_case ? (
                    <Link href="/cases/create" className="btn btn-primary">
                        Create Case
                    </Link>
                ) : undefined
            }
        />
    );

    return (
        <AuthenticatedLayout>
            <Head title="Cases" />
            <section className="page-stack">
                <PageHeader
                    title="Cases"
                    description={
                        is_process_server
                            ? 'Read-only case list.'
                            : 'Case list for your assigned work.'
                    }
                    actions={
                        can_create_case ? (
                            <Link href="/cases/create" className="btn btn-primary">
                                Create Case
                            </Link>
                        ) : undefined
                    }
                />

                <OperationalSummary title="Work Overview" metrics={operational_metrics} />

                <StickyDataset
                    className="grid gap-6"
                    stickyControls={false}
                    controls={
                        <div className="filter-panel">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="field-label">
                                        Sort by
                                        <select
                                            aria-label="Sort by"
                                            className="input mt-2"
                                            value={filters.sort}
                                            onChange={(event) =>
                                                navigate({ sort: event.target.value })
                                            }
                                        >
                                            {sort_options.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="field-label">
                                        Order
                                        <select
                                            aria-label="Order"
                                            className="input mt-2"
                                            value={filters.order}
                                            onChange={(event) =>
                                                navigate({
                                                    order: event.target.value as 'asc' | 'desc',
                                                })
                                            }
                                        >
                                            <option value="asc">Ascending</option>
                                            <option value="desc">Descending</option>
                                        </select>
                                    </label>
                                </div>

                                <form
                                    onSubmit={submit}
                                    className="grid gap-3 sm:grid-cols-[1fr_180px_auto]"
                                >
                                    <label className="field-label">
                                        Search
                                        <input
                                            className="input mt-2"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                        />
                                    </label>
                                    <label className="field-label">
                                        Search field
                                        <select
                                            className="input mt-2"
                                            value={filter}
                                            onChange={(event) => setFilter(event.target.value)}
                                        >
                                            <option value="">All Fields</option>
                                            {filter_options.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <button type="submit" className="btn btn-secondary self-end">
                                        Search
                                    </button>
                                </form>
                            </div>
                        </div>
                    }
                >
                    <div
                        className={`surface min-w-0 ${is_process_server ? 'overflow-hidden' : 'sticky-table-surface'}`}
                    >
                        <div
                            className={
                                is_process_server
                                    ? 'table-scroll hidden lg:block'
                                    : 'hidden lg:block'
                            }
                            tabIndex={is_process_server ? 0 : undefined}
                            role="region"
                            aria-label="Cases table"
                        >
                            <table
                                className={`data-table ${is_process_server ? 'min-w-[1500px]' : 'sticky-table-header table-fixed'}`}
                            >
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <tr>
                                        {groupedProjection ? (
                                            <>
                                                <Header
                                                    className={
                                                        hasWorkflowCommands ? 'w-[29%]' : 'w-[33%]'
                                                    }
                                                >
                                                    Case
                                                </Header>
                                                <Header
                                                    className={
                                                        hasWorkflowCommands ? 'w-[18%]' : 'w-[21%]'
                                                    }
                                                >
                                                    Parties
                                                </Header>
                                                <Header
                                                    className={
                                                        hasWorkflowCommands ? 'w-[20%]' : 'w-[23%]'
                                                    }
                                                >
                                                    Assignment
                                                </Header>
                                                <Header
                                                    className={
                                                        hasWorkflowCommands ? 'w-[20%]' : 'w-[23%]'
                                                    }
                                                >
                                                    Resolution
                                                </Header>
                                                {hasWorkflowCommands && <Header>Command</Header>}
                                            </>
                                        ) : prosecutorProjection ? (
                                            <>
                                                <Header className="w-[37%]">Case</Header>
                                                <Header className="w-[17%]">Complainant</Header>
                                                <Header className="w-[17%]">Respondent</Header>
                                                <Header className="w-[13%]">Date</Header>
                                                <Header className="w-[16%]">Verdict</Header>
                                            </>
                                        ) : (
                                            <>
                                                <Header>Case</Header>
                                                <Header>Complainant</Header>
                                                <Header>Respondent</Header>
                                                <Header>Police Station</Header>
                                                <Header>Date</Header>
                                                <Header>Assigned Prosecutor</Header>
                                                <Header>Resolution Verdict</Header>
                                                <Header>Court</Header>
                                                <Header>{dateColumnLabel}</Header>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.data.map((caseRecord) => {
                                        const href = `/cases/${caseRecord.id}?return_to=${encodeURIComponent(returnUrl)}`;
                                        const rowClass = is_process_server
                                            ? 'data-row border-b border-slate-100 align-top'
                                            : 'record-entry data-row border-b border-slate-100 align-top';

                                        return (
                                            <tr key={caseRecord.id} className={rowClass}>
                                                {groupedProjection ? (
                                                    <>
                                                        <Cell>
                                                            <DesktopCaseIdentity
                                                                caseRecord={caseRecord}
                                                                href={href}
                                                            />
                                                        </Cell>
                                                        <Cell>
                                                            <GroupedValue
                                                                label="Complainant"
                                                                value={
                                                                    <CaseCollection
                                                                        caseId={caseRecord.id}
                                                                        projection="desktop"
                                                                        collection="complainants"
                                                                        items={
                                                                            caseRecord.complainants
                                                                        }
                                                                    />
                                                                }
                                                            />
                                                            <GroupedValue
                                                                label="Respondent"
                                                                value={
                                                                    <CaseCollection
                                                                        caseId={caseRecord.id}
                                                                        projection="desktop"
                                                                        collection="respondents"
                                                                        items={
                                                                            caseRecord.respondents
                                                                        }
                                                                    />
                                                                }
                                                            />
                                                        </Cell>
                                                        <Cell>
                                                            <GroupedValue
                                                                label="Police Station"
                                                                value={value(
                                                                    caseRecord.police_station,
                                                                )}
                                                            />
                                                            <GroupedValue
                                                                label="Date"
                                                                value={formatDate(caseRecord.date)}
                                                            />
                                                            <GroupedValue
                                                                label="Prosecutor"
                                                                value={value(
                                                                    caseRecord.assigned_prosecutor_name,
                                                                )}
                                                            />
                                                        </Cell>
                                                        <Cell>
                                                            <StatusBadge
                                                                value={resolutionVerdict(
                                                                    caseRecord,
                                                                )}
                                                            />
                                                            <GroupedValue
                                                                label="Court"
                                                                value={value(caseRecord.court)}
                                                            />
                                                            <GroupedValue
                                                                label={dateColumnLabel}
                                                                value={formatDate(
                                                                    caseRecord.verdict_date,
                                                                )}
                                                            />
                                                            <CommandStatus
                                                                status={caseRecord.command_status}
                                                            />
                                                        </Cell>
                                                        {hasWorkflowCommands && (
                                                            <Cell className="record-entry-actions table-cell-actions whitespace-normal">
                                                                <CaseCommands
                                                                    caseRecord={caseRecord}
                                                                    compact={groupedProjection}
                                                                />
                                                            </Cell>
                                                        )}
                                                    </>
                                                ) : prosecutorProjection ? (
                                                    <>
                                                        <Cell>
                                                            <DesktopCaseIdentity
                                                                caseRecord={caseRecord}
                                                                href={href}
                                                            />
                                                        </Cell>
                                                        <Cell>
                                                            <CaseCollection
                                                                caseId={caseRecord.id}
                                                                projection="desktop"
                                                                collection="complainants"
                                                                items={caseRecord.complainants}
                                                            />
                                                        </Cell>
                                                        <Cell>
                                                            <CaseCollection
                                                                caseId={caseRecord.id}
                                                                projection="desktop"
                                                                collection="respondents"
                                                                items={caseRecord.respondents}
                                                            />
                                                        </Cell>
                                                        <Cell>{formatDate(caseRecord.date)}</Cell>
                                                        <Cell>
                                                            <StatusBadge
                                                                value={resolutionVerdict(
                                                                    caseRecord,
                                                                )}
                                                            />
                                                            <CommandStatus
                                                                status={caseRecord.command_status}
                                                            />
                                                        </Cell>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Cell>
                                                            <DesktopCaseIdentity
                                                                caseRecord={caseRecord}
                                                            />
                                                        </Cell>
                                                        <Cell>
                                                            <CaseCollection
                                                                caseId={caseRecord.id}
                                                                projection="desktop"
                                                                collection="complainants"
                                                                items={caseRecord.complainants}
                                                            />
                                                        </Cell>
                                                        <Cell>
                                                            <CaseCollection
                                                                caseId={caseRecord.id}
                                                                projection="desktop"
                                                                collection="respondents"
                                                                items={caseRecord.respondents}
                                                            />
                                                        </Cell>
                                                        <Cell>
                                                            {value(caseRecord.police_station)}
                                                        </Cell>
                                                        <Cell>{formatDate(caseRecord.date)}</Cell>
                                                        <Cell>
                                                            {value(
                                                                caseRecord.assigned_prosecutor_name,
                                                            )}
                                                        </Cell>
                                                        <Cell>
                                                            <StatusBadge
                                                                value={resolutionVerdict(
                                                                    caseRecord,
                                                                )}
                                                            />
                                                        </Cell>
                                                        <Cell>{value(caseRecord.court)}</Cell>
                                                        <Cell>
                                                            {formatDate(caseRecord.verdict_date)}
                                                        </Cell>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {cases.data.length === 0 && (
                                        <tr>
                                            <td
                                                className="p-0"
                                                colSpan={
                                                    groupedProjection
                                                        ? hasWorkflowCommands
                                                            ? 5
                                                            : 4
                                                        : prosecutorProjection
                                                          ? 5
                                                          : 9
                                                }
                                            >
                                                {emptyState}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="lg:hidden" role="region" aria-label="Cases list">
                            {cases.data.length === 0 ? (
                                emptyState
                            ) : (
                                <ol>
                                    {cases.data.map((caseRecord) => (
                                        <li
                                            key={caseRecord.id}
                                            className={`mobile-data-card ${is_process_server ? '' : 'record-entry'}`}
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-950">
                                                        {is_process_server ? (
                                                            caseRecord.docket_number
                                                        ) : (
                                                            <RecordEntryLink
                                                                href={`/cases/${caseRecord.id}?return_to=${encodeURIComponent(returnUrl)}`}
                                                                accessibleLabel={`Open case ${caseRecord.docket_number}`}
                                                            >
                                                                {caseRecord.docket_number}
                                                            </RecordEntryLink>
                                                        )}
                                                    </p>
                                                    <div className="mt-1 break-words text-sm text-slate-700">
                                                        <CaseCollection
                                                            caseId={caseRecord.id}
                                                            projection="mobile"
                                                            collection="offenses"
                                                            items={caseRecord.offenses}
                                                        />
                                                    </div>
                                                </div>
                                                {is_process_server ? (
                                                    <StatusBadge
                                                        value={resolutionVerdict(caseRecord)}
                                                    />
                                                ) : (
                                                    <div className="text-right">
                                                        <StatusBadge
                                                            value={resolutionVerdict(caseRecord)}
                                                        />
                                                        <CommandStatus
                                                            status={caseRecord.command_status}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                                <MobileDetail
                                                    label="Complainant"
                                                    value={
                                                        <CaseCollection
                                                            caseId={caseRecord.id}
                                                            projection="mobile"
                                                            collection="complainants"
                                                            items={caseRecord.complainants}
                                                        />
                                                    }
                                                />
                                                <MobileDetail
                                                    label="Respondent"
                                                    value={
                                                        <CaseCollection
                                                            caseId={caseRecord.id}
                                                            projection="mobile"
                                                            collection="respondents"
                                                            items={caseRecord.respondents}
                                                        />
                                                    }
                                                />
                                                {!prosecutorProjection && (
                                                    <MobileDetail
                                                        label="Police Station"
                                                        value={value(caseRecord.police_station)}
                                                    />
                                                )}
                                                <MobileDetail
                                                    label="Date"
                                                    value={formatDate(caseRecord.date)}
                                                />
                                                {!prosecutorProjection && (
                                                    <MobileDetail
                                                        label={
                                                            is_process_server
                                                                ? 'Assigned Prosecutor'
                                                                : 'Prosecutor'
                                                        }
                                                        value={value(
                                                            caseRecord.assigned_prosecutor_name,
                                                        )}
                                                    />
                                                )}
                                                {!prosecutorProjection && (
                                                    <MobileDetail
                                                        label="Court"
                                                        value={value(caseRecord.court)}
                                                    />
                                                )}
                                                {!prosecutorProjection && (
                                                    <MobileDetail
                                                        label={dateColumnLabel}
                                                        value={formatDate(caseRecord.verdict_date)}
                                                    />
                                                )}
                                            </dl>
                                            {(caseRecord.can_submit_resolution ||
                                                caseRecord.can_generate_subpoena) && (
                                                <div className="record-entry-actions mt-4 border-t border-slate-200 pt-3">
                                                    <CaseCommands
                                                        caseRecord={caseRecord}
                                                        compact={groupedProjection}
                                                    />
                                                </div>
                                            )}
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
                            ariaLabel="Cases pagination"
                        />
                    </div>
                </StickyDataset>
            </section>
        </AuthenticatedLayout>
    );
}

function CaseCommands({ caseRecord, compact }: { caseRecord: CaseRecord; compact: boolean }) {
    const toast = useToast();
    const actionClass = compact
        ? 'btn btn-secondary btn-compact max-w-full flex-none whitespace-normal'
        : 'action-link';

    return (
        <div
            className={
                compact ? 'action-group items-start' : 'flex flex-wrap items-center gap-x-3 gap-y-2'
            }
        >
            {caseRecord.can_submit_resolution && (
                <Link href={`/cases/${caseRecord.id}/resolution/create`} className={actionClass}>
                    Resolve
                </Link>
            )}
            {caseRecord.can_generate_subpoena && (
                <button
                    type="button"
                    onClick={() =>
                        router.post(
                            `/cases/${caseRecord.id}/documents/subpoena`,
                            {},
                            {
                                onSuccess: () => toast.info('Subpoena PDF generation requested.'),
                                onHttpException: () =>
                                    toast.error('Unable to request the Subpoena PDF.'),
                                onNetworkError: () =>
                                    toast.error('Unable to request the Subpoena PDF.'),
                            },
                        )
                    }
                    className={actionClass}
                >
                    Generate PDF
                </button>
            )}
        </div>
    );
}

function CommandStatus({ status }: { status?: CaseRecord['command_status'] }) {
    if (!status) return null;

    return (
        <p
            className={`mt-2 text-xs font-medium ${status === 'Resolved' ? 'text-emerald-700' : 'text-slate-600'}`}
        >
            {status}
        </p>
    );
}

function GroupedValue({ label, value: content }: { label: string; value: ReactNode }) {
    if (typeof content === 'string') {
        return (
            <p className="mt-1.5 first:mt-0">
                <span className="metadata-text mr-1">{label}:</span>
                <span>{content}</span>
            </p>
        );
    }

    return (
        <div className="mt-1.5 first:mt-0">
            <p className="metadata-text mb-0.5">{label}:</p>
            {content}
        </div>
    );
}

function DesktopCaseIdentity({ caseRecord, href }: { caseRecord: CaseRecord; href?: string }) {
    return (
        <>
            <p className="table-cell-primary">
                {href ? (
                    <RecordEntryLink
                        href={href}
                        accessibleLabel={`Open case ${caseRecord.docket_number}`}
                    >
                        {caseRecord.docket_number}
                    </RecordEntryLink>
                ) : (
                    caseRecord.docket_number
                )}
            </p>
            <CaseCollection
                caseId={caseRecord.id}
                projection="desktop"
                collection="offenses"
                items={caseRecord.offenses}
                className="mt-1"
            />
        </>
    );
}

function CaseCollection({
    caseId,
    projection,
    collection,
    items,
    className,
}: {
    caseId: string;
    projection: 'desktop' | 'mobile';
    collection: 'offenses' | 'complainants' | 'respondents';
    items: readonly string[];
    className?: string;
}) {
    const offenseCollection = collection === 'offenses';

    return (
        <ExpandableCollection
            id={`case-${caseId}-${projection}-${collection}`}
            items={items}
            singularLabel={offenseCollection ? 'offense' : 'party'}
            pluralLabel={offenseCollection ? 'offenses' : 'parties'}
            className={className}
        />
    );
}

function resolutionVerdict(caseRecord: CaseRecord) {
    return caseRecord.resolution_verdict === 'Pending' ? 'PENDING' : caseRecord.resolution_verdict;
}

function caseListReturnUrl(listUrl: string, filters: Props['filters'], page: number) {
    const parameters = new URLSearchParams();
    if (filters.search) parameters.set('search', filters.search);
    if (filters.filter) parameters.set('filter', filters.filter);
    if (filters.sort !== 'docket_number') parameters.set('sort', filters.sort);
    if (filters.order !== 'desc') parameters.set('order', filters.order);
    if (page > 1) parameters.set('page', String(page));

    const query = parameters.toString();
    return query ? `${listUrl}?${query}` : listUrl;
}

function Header({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <th className={`table-heading whitespace-nowrap ${className}`}>{children}</th>;
}

function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <td className={`table-cell ${className}`}>{children}</td>;
}

function MobileDetail({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words text-slate-800">{value}</dd>
        </div>
    );
}

function value(input: string | null) {
    return input && input.trim() !== '' ? input : '-';
}

function formatDate(input: string | null) {
    if (!input) return '-';

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${input}T00:00:00Z`));
}
