import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import ConfirmationDialog from '../../../Components/ConfirmationDialog';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import Pagination, { type PaginationLink } from '../../../Components/Pagination';
import StickyDataset from '../../../Components/StickyDataset';
import { useToast } from '../../../Components/toast';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';

type Offense = {
    id: string;
    name: string;
    law_reference: string | null;
    cases_count: number;
};

type Props = {
    offenses: {
        data: Offense[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: { search: string };
    catalog_notice: string;
};

export default function Index({ offenses, filters, catalog_notice }: Props) {
    const toast = useToast();
    const [search, setSearch] = useState(filters.search);
    const [selected, setSelected] = useState<Offense | null>(null);
    const [pendingDeletion, setPendingDeletion] = useState<Offense | null>(null);
    const [activeOperation, setActiveOperation] = useState<'save' | 'delete' | null>(null);
    const {
        data,
        setData,
        post,
        patch,
        delete: destroy,
        processing,
        errors,
        clearErrors,
        isDirty,
        setDefaults,
    } = useForm({ name: '', law_reference: '', delete_error: '' });
    const { allowNextVisit, confirmDiscard } = useUnsavedChanges(isDirty && !processing);

    function filter(event: FormEvent) {
        event.preventDefault();
        router.get('/admin/offenses', { search }, { preserveState: true });
    }

    function save(event: FormEvent) {
        event.preventDefault();
        if (processing) return;

        setActiveOperation('save');
        allowNextVisit();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(selected ? 'Crime updated.' : 'Crime added.');
                clearSelection();
            },
            onFinish: () => setActiveOperation(null),
        };

        if (selected) {
            patch(`/admin/offenses/${selected.id}`, options);
            return;
        }

        post('/admin/offenses', options);
    }

    function edit(offense: Offense) {
        if (!confirmDiscard()) return;

        const values = {
            name: offense.name,
            law_reference: offense.law_reference ?? '',
            delete_error: '',
        };
        setSelected(offense);
        setDefaults(values);
        setData(values);
        clearErrors();
        document.getElementById('crime-name')?.focus();
    }

    function clearSelection() {
        const values = { name: '', law_reference: '', delete_error: '' };
        setSelected(null);
        setDefaults(values);
        setData(values);
        clearErrors();
    }

    function cancelSelection() {
        if (confirmDiscard()) clearSelection();
    }

    function deleteOffense(offense: Offense) {
        if (offense.cases_count > 0 || processing) return;

        setActiveOperation('delete');
        destroy(`/admin/offenses/${offense.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Crime deleted.');
                if (selected?.id === offense.id) clearSelection();
            },
            onFinish: () => {
                setActiveOperation(null);
                setPendingDeletion(null);
            },
        });
    }

    const saving = processing && activeOperation === 'save';

    return (
        <AuthenticatedLayout>
            <Head title="Manage Crimes" />
            <section className="page-stack">
                <PageHeader
                    eyebrow="Administrator"
                    title="Manage Crimes"
                    description="Crime catalog and Law Reference records."
                />

                <p className="notice notice-warning">{catalog_notice}</p>

                <div className="grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <form onSubmit={save} aria-busy={saving} className="surface surface-body h-fit">
                        <div className="panel-header -mx-4 -mt-4">
                            <h2 className="panel-title">{selected ? 'Edit Crime' : 'Add Crime'}</h2>
                            {selected && (
                                <p className="mt-1 text-xs text-slate-600">
                                    Editing {selected.name}
                                </p>
                            )}
                        </div>

                        <label className="field-label mt-4 block" htmlFor="crime-name">
                            Crime Name
                        </label>
                        <input
                            id="crime-name"
                            className="input mt-2"
                            value={data.name}
                            aria-invalid={errors.name ? true : undefined}
                            aria-describedby={errors.name ? 'crime-name-error' : undefined}
                            onChange={(event) => setData('name', event.target.value)}
                            maxLength={255}
                            required
                        />
                        {errors.name && (
                            <p id="crime-name-error" className="field-error" role="alert">
                                {errors.name}
                            </p>
                        )}

                        <label className="field-label mt-4 block" htmlFor="law-reference">
                            Law Reference
                        </label>
                        <input
                            id="law-reference"
                            className="input mt-2"
                            value={data.law_reference}
                            aria-invalid={errors.law_reference ? true : undefined}
                            aria-describedby={
                                errors.law_reference ? 'law-reference-error' : undefined
                            }
                            onChange={(event) => setData('law_reference', event.target.value)}
                            maxLength={255}
                        />
                        {errors.law_reference && (
                            <p id="law-reference-error" className="field-error" role="alert">
                                {errors.law_reference}
                            </p>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                            <button type="submit" disabled={processing} className="btn btn-primary">
                                {saving
                                    ? selected
                                        ? 'Saving...'
                                        : 'Adding...'
                                    : selected
                                      ? 'Save Changes'
                                      : 'Add Crime'}
                            </button>
                            {selected && (
                                <button
                                    type="button"
                                    onClick={cancelSelection}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="surface sticky-table-surface min-w-0">
                        <StickyDataset
                            stickyControls={false}
                            controls={
                                <form
                                    onSubmit={filter}
                                    className="filter-panel grid gap-3 rounded-none border-x-0 border-t-0 md:grid-cols-[minmax(220px,32rem)_auto] md:justify-between"
                                >
                                    <label className="field-label">
                                        Search
                                        <input
                                            className="input mt-2"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                        />
                                    </label>
                                    <button type="submit" className="btn btn-secondary self-end">
                                        Apply
                                    </button>
                                </form>
                            }
                        >
                            {errors.delete_error && (
                                <p
                                    role="alert"
                                    className="notice notice-danger rounded-none border-x-0 border-t-0"
                                >
                                    {errors.delete_error}
                                </p>
                            )}

                            <div
                                className="table-scroll sticky-table-scroll"
                                tabIndex={0}
                                role="region"
                                aria-label="Crime catalog table"
                            >
                                <table className="data-table sticky-table-header min-w-[640px]">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="table-heading">Crime</th>
                                            <th className="table-heading">Law Reference</th>
                                            <th className="table-heading text-right">Cases</th>
                                            <th className="table-heading">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {offenses.data.map((offense) => (
                                            <tr
                                                key={offense.id}
                                                className="data-row border-b border-slate-100 align-top"
                                            >
                                                <td className="table-cell table-cell-primary">
                                                    {offense.name}
                                                </td>
                                                <td className="table-cell">
                                                    {offense.law_reference ?? '-'}
                                                </td>
                                                <td className="table-cell table-cell-numeric">
                                                    {offense.cases_count}
                                                </td>
                                                <td className="table-cell table-cell-actions">
                                                    <div className="action-group min-w-max items-start">
                                                        <button
                                                            type="button"
                                                            onClick={() => edit(offense)}
                                                            className="btn btn-secondary btn-compact"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPendingDeletion(offense)
                                                            }
                                                            disabled={
                                                                offense.cases_count > 0 ||
                                                                processing
                                                            }
                                                            aria-describedby={
                                                                offense.cases_count > 0
                                                                    ? `crime-delete-${offense.id}`
                                                                    : undefined
                                                            }
                                                            className="btn btn-danger-outline btn-compact"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                    {offense.cases_count > 0 && (
                                                        <p
                                                            id={`crime-delete-${offense.id}`}
                                                            className="mt-1 max-w-52 text-xs text-slate-600"
                                                        >
                                                            Referenced Crimes cannot be deleted.
                                                        </p>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {offenses.data.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-0">
                                                    <EmptyState
                                                        title={
                                                            filters.search
                                                                ? 'No crimes match the current search.'
                                                                : 'No crimes have been configured.'
                                                        }
                                                        description={
                                                            filters.search
                                                                ? 'Clear the search to review the complete Crime catalog.'
                                                                : 'Use the Add Crime form to configure the approved catalog.'
                                                        }
                                                        action={
                                                            filters.search ? (
                                                                <a
                                                                    href="/admin/offenses"
                                                                    className="btn btn-secondary"
                                                                >
                                                                    Clear search
                                                                </a>
                                                            ) : undefined
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                links={offenses.links}
                                from={offenses.from}
                                to={offenses.to}
                                total={offenses.total}
                                ariaLabel="Crime catalog pagination"
                                itemLabel="crimes"
                            />
                        </StickyDataset>
                    </div>
                </div>
                <ConfirmationDialog
                    open={pendingDeletion !== null}
                    title="Delete Crime"
                    description={
                        pendingDeletion
                            ? `Delete ${pendingDeletion.name}? This action cannot be undone.`
                            : ''
                    }
                    confirmLabel="Delete Crime"
                    destructive
                    busy={processing}
                    onCancel={() => setPendingDeletion(null)}
                    onConfirm={() => pendingDeletion && deleteOffense(pendingDeletion)}
                />
            </section>
        </AuthenticatedLayout>
    );
}
