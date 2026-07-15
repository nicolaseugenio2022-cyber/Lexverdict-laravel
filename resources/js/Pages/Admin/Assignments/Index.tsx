import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
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
        assignForm.post('/admin/assignments');
    }

    function submitSwap(event: FormEvent) {
        event.preventDefault();
        swapForm.post('/admin/assignments/swap');
    }

    return (
        <AuthenticatedLayout>
            <Head title="Assignments" />
            <section className="space-y-6">
                {(flash.errors.assignment ?? []).map((error) => (
                    <p key={error} className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {error}
                    </p>
                ))}

                <div className="rounded-md border border-slate-200 bg-white p-5">
                    <h1 className="text-xl font-semibold">Assignments</h1>
                    <div className="table-scroll mt-4" tabIndex={0} role="region" aria-label="Assignments table">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Prosecutor</th>
                                    <th className="px-4 py-3">Secretary</th>
                                    <th className="px-4 py-3">Assigned At</th>
                                    <th className="px-4 py-3">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map((assignment) => (
                                    <tr key={assignment.prosecutor_user_id} className="border-b border-slate-100">
                                        <td className="px-4 py-3">{assignment.prosecutor_name}</td>
                                        <td className="px-4 py-3">{assignment.secretary_name}</td>
                                        <td className="px-4 py-3">{assignment.assigned_at ?? ''}</td>
                                        <td className="px-4 py-3">{assignment.reason ?? ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <form onSubmit={submitAssign} className="rounded-md border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Assign Prosecutor and Secretary</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Select label="Prosecutor" value={assignForm.data.prosecutor_user_id} onChange={(value) => assignForm.setData('prosecutor_user_id', value)} options={prosecutors} />
                        <Select label="Secretary" value={assignForm.data.secretary_user_id} onChange={(value) => assignForm.setData('secretary_user_id', value)} options={secretaries} />
                    </div>
                    <Textarea label="Reason" value={assignForm.data.reason} onChange={(value) => assignForm.setData('reason', value)} />
                    <button className="mt-4 min-h-11 rounded-md bg-blue-900 px-4 font-semibold text-white" type="submit">
                        Save Assignment
                    </button>
                </form>

                <form onSubmit={submitSwap} className="rounded-md border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Swap Assignments</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Select label="First Prosecutor" value={swapForm.data.first_prosecutor_user_id} onChange={(value) => swapForm.setData('first_prosecutor_user_id', value)} options={assignments.map((assignment) => ({ id: assignment.prosecutor_user_id, label: assignment.prosecutor_name }))} />
                        <Select label="Second Prosecutor" value={swapForm.data.second_prosecutor_user_id} onChange={(value) => swapForm.setData('second_prosecutor_user_id', value)} options={assignments.map((assignment) => ({ id: assignment.prosecutor_user_id, label: assignment.prosecutor_name }))} />
                    </div>
                    <Textarea label="Reason" value={swapForm.data.reason} onChange={(value) => swapForm.setData('reason', value)} />
                    <button className="mt-4 min-h-11 rounded-md bg-blue-900 px-4 font-semibold text-white" type="submit">
                        Swap
                    </button>
                </form>
            </section>
        </AuthenticatedLayout>
    );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Option[] }) {
    return (
        <label className="block text-sm font-medium text-slate-700">
            {label}
            <select className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3" value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="mt-4 block text-sm font-medium text-slate-700">
            {label}
            <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
    );
}
