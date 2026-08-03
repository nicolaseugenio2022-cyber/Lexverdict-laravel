import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import { useToast } from '../../../Components/toast';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import type { PageProps } from '../../../types/page';

type Option = { id: string; label: string };
type Assignment = {
    prosecutor_user_id: string;
    secretary_user_id: string;
    prosecutor_name: string;
    secretary_name: string;
    assigned_at: string | null;
    reason: string | null;
};

type Props = {
    assignments: Assignment[];
    prosecutors: Option[];
    secretaries: Option[];
};

export default function Index({ assignments, prosecutors, secretaries }: Props) {
    const toast = useToast();
    const { flash } = usePage<PageProps>().props;
    const assignForm = useForm({
        prosecutor_user_id: prosecutors[0]?.id ?? '',
        secretary_user_id: secretaries[0]?.id ?? '',
        reason: '',
    });
    const swapForm = useForm({
        first_prosecutor_user_id: assignments[0]?.prosecutor_user_id ?? '',
        second_prosecutor_user_id: assignments[1]?.prosecutor_user_id ?? '',
        reason: '',
    });

    function submitAssign(event: FormEvent) {
        event.preventDefault();
        if (assignForm.processing) return;

        assignForm.post('/admin/assignments', {
            onSuccess: () => toast.success('Assignment saved.'),
        });
    }

    function submitSwap(event: FormEvent) {
        event.preventDefault();
        if (swapForm.processing) return;

        swapForm.post('/admin/assignments/swap', {
            onSuccess: () => toast.success('Assignments swapped.'),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Assignments" />
            <section className="page-stack">
                <PageHeader eyebrow="Administrator" title="Assignments" />
                {(flash.errors.assignment ?? []).map((error) => (
                    <p key={error} className="notice notice-danger">
                        {error}
                    </p>
                ))}

                <div className="surface sticky-table-surface">
                    <div
                        className="table-scroll sticky-table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Assignments table"
                    >
                        <table className="data-table sticky-table-header min-w-[720px]">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="table-heading">Prosecutor</th>
                                    <th className="table-heading">Secretary</th>
                                    <th className="table-heading">Assigned At</th>
                                    <th className="table-heading">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map((assignment) => (
                                    <tr
                                        key={assignment.prosecutor_user_id}
                                        className="data-row border-b border-slate-100"
                                    >
                                        <td className="table-cell table-cell-primary">
                                            {assignment.prosecutor_name}
                                        </td>
                                        <td className="table-cell">{assignment.secretary_name}</td>
                                        <td className="table-cell">
                                            {assignment.assigned_at && (
                                                <time
                                                    dateTime={assignment.assigned_at}
                                                    title={assignment.assigned_at}
                                                >
                                                    {formatAssignedAt(assignment.assigned_at)}
                                                </time>
                                            )}
                                        </td>
                                        <td className="table-cell">{assignment.reason ?? ''}</td>
                                    </tr>
                                ))}
                                {assignments.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-0">
                                            <EmptyState
                                                title="No Prosecutor-Secretary assignments are available."
                                                description="Use the assignment form below to create an authorized pairing."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
                    <form
                        onSubmit={submitAssign}
                        aria-busy={assignForm.processing}
                        className="surface surface-body"
                    >
                        <h2 className="section-title">Assign Prosecutor and Secretary</h2>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <Select
                                label="Prosecutor"
                                value={assignForm.data.prosecutor_user_id}
                                onChange={(value) =>
                                    assignForm.setData('prosecutor_user_id', value)
                                }
                                options={prosecutors}
                            />
                            <Select
                                label="Secretary"
                                value={assignForm.data.secretary_user_id}
                                onChange={(value) => assignForm.setData('secretary_user_id', value)}
                                options={secretaries}
                            />
                        </div>
                        <Textarea
                            label="Reason"
                            value={assignForm.data.reason}
                            onChange={(value) => assignForm.setData('reason', value)}
                        />
                        <button
                            className="btn btn-primary mt-4"
                            type="submit"
                            disabled={assignForm.processing}
                        >
                            {assignForm.processing ? 'Assigning...' : 'Save Assignment'}
                        </button>
                    </form>

                    <form
                        onSubmit={submitSwap}
                        aria-busy={swapForm.processing}
                        className="surface surface-body"
                    >
                        <h2 className="section-title">Swap Assignments</h2>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <Select
                                label="First Prosecutor"
                                value={swapForm.data.first_prosecutor_user_id}
                                onChange={(value) =>
                                    swapForm.setData('first_prosecutor_user_id', value)
                                }
                                options={assignments.map((assignment) => ({
                                    id: assignment.prosecutor_user_id,
                                    label: assignment.prosecutor_name,
                                }))}
                            />
                            <Select
                                label="Second Prosecutor"
                                value={swapForm.data.second_prosecutor_user_id}
                                onChange={(value) =>
                                    swapForm.setData('second_prosecutor_user_id', value)
                                }
                                options={assignments.map((assignment) => ({
                                    id: assignment.prosecutor_user_id,
                                    label: assignment.prosecutor_name,
                                }))}
                            />
                        </div>
                        <Textarea
                            label="Reason"
                            value={swapForm.data.reason}
                            onChange={(value) => swapForm.setData('reason', value)}
                        />
                        <button
                            className="btn btn-primary mt-4"
                            type="submit"
                            disabled={swapForm.processing}
                        >
                            {swapForm.processing ? 'Swapping...' : 'Swap'}
                        </button>
                    </form>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}

function Select({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
}) {
    return (
        <label className="field-label block">
            {label}
            <select
                className="input mt-2"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function Textarea({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="field-label mt-4 block">
            {label}
            <textarea
                className="input mt-2 min-h-20"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}

function formatAssignedAt(value: string) {
    const timestamp = new Date(value);

    if (Number.isNaN(timestamp.getTime())) return value;

    return new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(timestamp);
}
