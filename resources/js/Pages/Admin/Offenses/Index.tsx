import { Head, Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type Offense = {
    id: string;
    name: string;
    law_reference: string | null;
    is_active: boolean;
    cases_count: number;
};

type PaginationLink = { url: string | null; label: string; active: boolean };

type Props = {
    offenses: {
        data: Offense[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: { search: string; status: string };
};

export default function Index({ offenses, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [selected, setSelected] = useState<Offense | null>(null);
    const { data, setData, post, patch, processing, errors, reset, clearErrors } = useForm({
        name: '',
        law_reference: '',
    });

    function filter(event: FormEvent) {
        event.preventDefault();
        router.get('/admin/offenses', { search, status }, { preserveState: true });
    }

    function save(event: FormEvent) {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: clearSelection,
        };

        if (selected) {
            patch(`/admin/offenses/${selected.id}`, options);
            return;
        }

        post('/admin/offenses', options);
    }

    function edit(offense: Offense) {
        setSelected(offense);
        setData({ name: offense.name, law_reference: offense.law_reference ?? '' });
        clearErrors();
        document.getElementById('crime-name')?.focus();
    }

    function clearSelection() {
        setSelected(null);
        reset();
        clearErrors();
    }

    function changeState(offense: Offense) {
        const action = offense.is_active ? 'deactivate' : 'restore';
        router.patch(`/admin/offenses/${offense.id}/${action}`, {}, { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Manage Crimes" />
            <section aria-labelledby="manage-crimes-title" className="space-y-5">
                <div>
                    <h1 id="manage-crimes-title" className="text-xl font-semibold">
                        Manage Crimes
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Crime catalog and Law Reference records.
                    </p>
                </div>

                <div className="grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <form
                        onSubmit={save}
                        className="h-fit rounded-md border border-slate-200 bg-white p-4"
                    >
                        <div className="border-b border-slate-200 pb-3">
                            <h2 className="text-base font-semibold">
                                {selected ? 'Edit Crime' : 'Add Crime'}
                            </h2>
                            {selected && (
                                <p className="mt-1 text-xs text-slate-600">
                                    Editing {selected.name}
                                </p>
                            )}
                        </div>

                        <label
                            className="mt-4 block text-sm font-medium text-slate-700"
                            htmlFor="crime-name"
                        >
                            Crime Name
                        </label>
                        <input
                            id="crime-name"
                            className="input mt-2"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            maxLength={255}
                            required
                        />
                        {errors.name && <p className="mt-2 text-sm text-red-700">{errors.name}</p>}

                        <label
                            className="mt-4 block text-sm font-medium text-slate-700"
                            htmlFor="law-reference"
                        >
                            Law Reference
                        </label>
                        <input
                            id="law-reference"
                            className="input mt-2"
                            value={data.law_reference}
                            onChange={(event) => setData('law_reference', event.target.value)}
                            maxLength={255}
                        />
                        {errors.law_reference && (
                            <p className="mt-2 text-sm text-red-700">{errors.law_reference}</p>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="min-h-11 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {selected ? 'Save Changes' : 'Add Crime'}
                            </button>
                            {selected && (
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="min-w-0 rounded-md border border-slate-200 bg-white">
                        <form
                            onSubmit={filter}
                            className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(220px,1fr)_160px_auto]"
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
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
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
                            aria-label="Crime catalog table"
                        >
                            <table className="min-w-[760px] w-full text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Crime</th>
                                        <th className="px-4 py-3 font-semibold">Law Reference</th>
                                        <th className="px-4 py-3 font-semibold">Cases</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {offenses.data.map((offense) => (
                                        <tr
                                            key={offense.id}
                                            className="border-b border-slate-100 align-top"
                                        >
                                            <td className="px-4 py-3 font-medium text-slate-950">
                                                {offense.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                {offense.law_reference ?? '-'}
                                            </td>
                                            <td className="px-4 py-3">{offense.cases_count}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${offense.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}
                                                >
                                                    {offense.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex min-w-max gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => edit(offense)}
                                                        className="font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => changeState(offense)}
                                                        className={`font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 ${offense.is_active ? 'text-red-700' : 'text-blue-900'}`}
                                                    >
                                                        {offense.is_active
                                                            ? 'Deactivate'
                                                            : 'Restore'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {offenses.data.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-8 text-center text-slate-600"
                                            >
                                                No crimes found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                            <span>
                                Showing {offenses.from ?? 0} to {offenses.to ?? 0} of{' '}
                                {offenses.total}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {offenses.links.map((link, index) =>
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
                    </div>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}
