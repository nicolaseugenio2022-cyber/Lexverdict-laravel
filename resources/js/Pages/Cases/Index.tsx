import { Head, Link, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import type { CaseRecord } from './types';

type PaginationLink = { url: string | null; label: string; active: boolean };
type ListOption = { value: string; label: string };

type PaginatedCases = {
    data: CaseRecord[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
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

    return (
        <AuthenticatedLayout>
            <Head title="Cases" />
            <section className="space-y-4">
                <div className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">Cases</h1>
                            <p className="text-sm text-slate-600">
                                {is_process_server
                                    ? 'Read-only case list.'
                                    : 'Case list for your assigned work.'}
                            </p>
                        </div>
                        {can_create_case && (
                            <Link
                                href="/cases/create"
                                className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            >
                                Create Case
                            </Link>
                        )}
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
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

                <div className="min-w-0 rounded-md border border-slate-200 bg-white">
                    <div
                        className="table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Cases table"
                    >
                        <table
                            className={`w-full text-left text-sm ${commandColumn ? 'min-w-[1700px]' : 'min-w-[1500px]'}`}
                        >
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <Header>
                                        {is_process_server ? 'Docket Number' : 'Docket No.'}
                                    </Header>
                                    <Header>{is_process_server ? 'Crime/Case' : 'Case'}</Header>
                                    <Header>Complainant</Header>
                                    <Header>Respondent</Header>
                                    <Header>Police Station</Header>
                                    <Header>Date</Header>
                                    <Header>
                                        {is_process_server ? 'Assigned Prosecutor' : 'Prosecutor'}
                                    </Header>
                                    <Header>
                                        {is_process_server ? 'Resolution Verdict' : 'Verdict'}
                                    </Header>
                                    <Header>Court</Header>
                                    <Header>{dateColumnLabel}</Header>
                                    {commandColumn && <Header>Command</Header>}
                                </tr>
                            </thead>
                            <tbody>
                                {cases.data.map((caseRecord) => (
                                    <tr
                                        key={caseRecord.id}
                                        className="border-b border-slate-100 align-top"
                                    >
                                        <Cell className="font-medium text-slate-950">
                                            {caseRecord.docket_number}
                                        </Cell>
                                        <Cell>{value(caseRecord.offenses.join(', '))}</Cell>
                                        <Cell>{value(caseRecord.complainants.join(', '))}</Cell>
                                        <Cell>{value(caseRecord.respondents.join(', '))}</Cell>
                                        <Cell>{value(caseRecord.police_station)}</Cell>
                                        <Cell>{formatDate(caseRecord.date)}</Cell>
                                        <Cell>{value(caseRecord.assigned_prosecutor_name)}</Cell>
                                        <Cell>
                                            <span
                                                className={
                                                    caseRecord.resolution_verdict === 'For Filing'
                                                        ? 'font-semibold text-emerald-700'
                                                        : caseRecord.resolution_verdict ===
                                                            'Dismissed'
                                                          ? 'font-semibold text-red-700'
                                                          : undefined
                                                }
                                            >
                                                {caseRecord.resolution_verdict === 'Pending'
                                                    ? 'PENDING'
                                                    : caseRecord.resolution_verdict}
                                            </span>
                                        </Cell>
                                        <Cell>{value(caseRecord.court)}</Cell>
                                        <Cell>{formatDate(caseRecord.verdict_date)}</Cell>
                                        {commandColumn && (
                                            <Cell>
                                                <CaseCommands caseRecord={caseRecord} />
                                            </Cell>
                                        )}
                                    </tr>
                                ))}
                                {cases.data.length === 0 && (
                                    <tr>
                                        <td
                                            className="px-4 py-8 text-center text-slate-600"
                                            colSpan={commandColumn ? 11 : 10}
                                        >
                                            No cases found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                        <span>
                            Showing {cases.from ?? 0} to {cases.to ?? 0} of {cases.total}
                        </span>
                        <nav aria-label="Cases pagination" className="flex flex-wrap gap-2">
                            {cases.links.map((link, index) =>
                                link.url ? (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url}
                                        className={`min-h-10 rounded-md border px-3 py-2 ${link.active ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-300 text-slate-700'}`}
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
                        </nav>
                    </div>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}

function CaseCommands({ caseRecord }: { caseRecord: CaseRecord }) {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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

function Header({ children }: { children: React.ReactNode }) {
    return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>;
}

function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-3 ${className}`}>{children}</td>;
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
