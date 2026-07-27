import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import EmptyState from '../../Components/EmptyState';
import PageHeader from '../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../Components/Pagination';
import StatusBadge from '../../Components/StatusBadge';
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
    const commandColumn = !is_process_server;
    const prosecutorProjection = list_role === 'prosecutor';
    const returnUrl = caseListReturnUrl(list_url, filters, cases.current_page);

    return (
        <AuthenticatedLayout>
            <Head title="Cases" />
            <section className="space-y-6">
                <PageHeader
                    title="Cases"
                    description={
                        is_process_server
                            ? 'Read-only case list.'
                            : 'Case list for your assigned work.'
                    }
                    actions={
                        can_create_case ? (
                            <Link
                                href="/cases/create"
                                className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            >
                                Create Case
                            </Link>
                        ) : undefined
                    }
                />

                <div className="surface p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-sm font-medium text-slate-700">
                                Sort by
                                <select
                                    aria-label="Sort by"
                                    className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                    value={filters.sort}
                                    onChange={(event) => navigate({ sort: event.target.value })}
                                >
                                    {sort_options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm font-medium text-slate-700">
                                Order
                                <select
                                    aria-label="Order"
                                    className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                    value={filters.order}
                                    onChange={(event) =>
                                        navigate({ order: event.target.value as 'asc' | 'desc' })
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
                            <label className="text-sm font-medium text-slate-700">
                                Search
                                <input
                                    className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </label>
                            <label className="text-sm font-medium text-slate-700">
                                Search field
                                <select
                                    className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
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
                            <button
                                type="submit"
                                className="min-h-11 self-end rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            >
                                Search
                            </button>
                        </form>
                    </div>
                </div>

                <div className="surface min-w-0 overflow-hidden">
                    <div
                        className="table-scroll hidden lg:block"
                        tabIndex={0}
                        role="region"
                        aria-label="Cases table"
                    >
                        <table className={`w-full text-left text-sm ${prosecutorProjection ? 'table-fixed' : commandColumn ? 'min-w-[1700px]' : 'min-w-[1500px]'}`}>
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <Header>
                                        {is_process_server ? 'Docket Number' : 'Docket No.'}
                                    </Header>
                                    <Header>{is_process_server ? 'Crime/Case' : 'Case'}</Header>
                                    <Header>Complainant</Header>
                                    <Header>Respondent</Header>
                                    {!prosecutorProjection && <Header>Police Station</Header>}
                                    <Header>Date</Header>
                                    {!prosecutorProjection && <Header>
                                        {is_process_server ? 'Assigned Prosecutor' : 'Prosecutor'}
                                    </Header>}
                                    <Header>
                                        {is_process_server ? 'Resolution Verdict' : 'Verdict'}
                                    </Header>
                                    {!prosecutorProjection && <Header>Court</Header>}
                                    {!prosecutorProjection && <Header>{dateColumnLabel}</Header>}
                                    {commandColumn && <Header>{prosecutorProjection ? 'Actions' : 'Command'}</Header>}
                                </tr>
                            </thead>
                            <tbody>
                                {cases.data.map((caseRecord) => (
                                    <tr
                                        key={caseRecord.id}
                                        className="data-row border-b border-slate-100 align-top"
                                    >
                                        <Cell className="font-medium text-slate-950">
                                            {caseRecord.docket_number}
                                        </Cell>
                                        <Cell>{value(caseRecord.offenses.join(', '))}</Cell>
                                        <Cell>{value(caseRecord.complainants.join(', '))}</Cell>
                                        <Cell>{value(caseRecord.respondents.join(', '))}</Cell>
                                        {!prosecutorProjection && <Cell>{value(caseRecord.police_station)}</Cell>}
                                        <Cell>{formatDate(caseRecord.date)}</Cell>
                                        {!prosecutorProjection && <Cell>{value(caseRecord.assigned_prosecutor_name)}</Cell>}
                                        <Cell>
                                            <StatusBadge
                                                value={
                                                    caseRecord.resolution_verdict === 'Pending'
                                                        ? 'PENDING'
                                                        : caseRecord.resolution_verdict
                                                }
                                            />
                                        </Cell>
                                        {!prosecutorProjection && <Cell>{value(caseRecord.court)}</Cell>}
                                        {!prosecutorProjection && <Cell>{formatDate(caseRecord.verdict_date)}</Cell>}
                                        {commandColumn && (
                                            <Cell>
                                                <CaseCommands caseRecord={caseRecord} returnUrl={returnUrl} />
                                            </Cell>
                                        )}
                                    </tr>
                                ))}
                                {cases.data.length === 0 && (
                                    <tr>
                                        <td
                                            className="px-4 py-8 text-center text-slate-600"
                                            colSpan={prosecutorProjection ? 7 : commandColumn ? 11 : 10}
                                        >
                                            No cases found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="lg:hidden" role="region" aria-label="Cases list">
                        {cases.data.length === 0 ? (
                            <EmptyState title="No cases found." />
                        ) : (
                            <ol>
                                {cases.data.map((caseRecord) => (
                                    <li key={caseRecord.id} className="mobile-data-card">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-950">
                                                    {caseRecord.docket_number}
                                                </p>
                                                <p className="mt-1 break-words text-sm text-slate-700">
                                                    {value(caseRecord.offenses.join(', '))}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                value={
                                                    caseRecord.resolution_verdict === 'Pending'
                                                        ? 'PENDING'
                                                        : caseRecord.resolution_verdict
                                                }
                                            />
                                        </div>
                                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                            <MobileDetail
                                                label="Complainant"
                                                value={value(caseRecord.complainants.join(', '))}
                                            />
                                            <MobileDetail
                                                label="Respondent"
                                                value={value(caseRecord.respondents.join(', '))}
                                            />
                                            {!prosecutorProjection && <MobileDetail
                                                label="Police Station"
                                                value={value(caseRecord.police_station)}
                                            />}
                                            <MobileDetail
                                                label="Date"
                                                value={formatDate(caseRecord.date)}
                                            />
                                            {!prosecutorProjection && <MobileDetail
                                                label={
                                                    is_process_server
                                                        ? 'Assigned Prosecutor'
                                                        : 'Prosecutor'
                                                }
                                                value={value(caseRecord.assigned_prosecutor_name)}
                                            />}
                                            {!prosecutorProjection && <MobileDetail
                                                label="Court"
                                                value={value(caseRecord.court)}
                                            />}
                                            {!prosecutorProjection && <MobileDetail
                                                label={dateColumnLabel}
                                                value={formatDate(caseRecord.verdict_date)}
                                            />}
                                        </dl>
                                        {commandColumn && (
                                            <div className="mt-4 border-t border-slate-200 pt-3">
                                                <CaseCommands caseRecord={caseRecord} returnUrl={returnUrl} />
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
            </section>
        </AuthenticatedLayout>
    );
}

function CaseCommands({ caseRecord, returnUrl }: { caseRecord: CaseRecord; returnUrl: string }) {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link
                href={`/cases/${caseRecord.id}?return_to=${encodeURIComponent(returnUrl)}`}
                className="font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
                View
            </Link>
            {caseRecord.command_status && (
                <span
                    className={
                        caseRecord.command_status === 'Resolved'
                            ? 'font-semibold text-emerald-700'
                            : 'text-slate-700'
                    }
                >
                    {caseRecord.command_status}
                </span>
            )}
            {caseRecord.can_submit_resolution && (
                <Link
                    href={`/cases/${caseRecord.id}/resolution/create`}
                    className="font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                    Resolve
                </Link>
            )}
            {caseRecord.can_generate_subpoena && (
                <button
                    type="button"
                    onClick={() => router.post(`/cases/${caseRecord.id}/documents/subpoena`)}
                    className="font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                    Generate PDF
                </button>
            )}
        </div>
    );
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

function Header({ children }: { children: React.ReactNode }) {
    return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>;
}

function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function MobileDetail({ label, value }: { label: string; value: string }) {
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
