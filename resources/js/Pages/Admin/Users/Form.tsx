import { Head, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type RoleOption = { value: string; label: string };
type UserPayload = {
    id: string;
    username: string;
    role: string;
    is_active: boolean;
    staff_profile: Record<string, string | null> | null;
    prosecutor_profile: Record<string, string | null> | null;
};

type Props = {
    mode: 'create' | 'edit';
    roles: RoleOption[];
    user: UserPayload | null;
};

export default function Form({ mode, roles, user }: Props) {
    const { data, setData, post, patch, processing, errors } = useForm({
        username: user?.username ?? '',
        password: '',
        role: user?.role ?? 'PS',
        is_active: user?.is_active ?? true,
        first_name: user?.staff_profile?.first_name ?? '',
        middle_name: user?.staff_profile?.middle_name ?? '',
        last_name: user?.staff_profile?.last_name ?? '',
        suffix: user?.staff_profile?.suffix ?? '',
        sex: user?.staff_profile?.sex ?? '',
        birth_date: user?.staff_profile?.birth_date ?? '',
        contact_number: user?.staff_profile?.contact_number ?? '',
        address: user?.staff_profile?.address ?? '',
        license_number: user?.prosecutor_profile?.license_number ?? '',
        office_number: user?.prosecutor_profile?.office_number ?? '',
    });
    const identityError = (errors as Record<string, string>).identity;

    function submit(event: FormEvent) {
        event.preventDefault();
        if (mode === 'create') {
            post('/admin/users');
        } else if (user) {
            patch(`/admin/users/${user.id}`);
        }
    }

    return (
        <AuthenticatedLayout>
            <Head title={mode === 'create' ? 'Create User' : 'Edit User'} />
            <form onSubmit={submit} className="rounded-md border border-slate-200 bg-white p-5">
                <h1 className="text-xl font-semibold">{mode === 'create' ? 'Create User' : 'Edit User'}</h1>
                {identityError && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{identityError}</p>}

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Username" error={errors.username}>
                        <input className="input" value={data.username} onChange={(event) => setData('username', event.target.value)} />
                    </Field>
                    <Field label={mode === 'create' ? 'Password' : 'Password (leave blank to keep current)'} error={errors.password}>
                        <input className="input" type="password" value={data.password} onChange={(event) => setData('password', event.target.value)} />
                    </Field>
                    <Field label="Role" error={errors.role}>
                        <select className="input" value={data.role} onChange={(event) => setData('role', event.target.value)}>
                            {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="First Name" error={errors.first_name}>
                        <input className="input" value={data.first_name} onChange={(event) => setData('first_name', event.target.value)} />
                    </Field>
                    <Field label="Middle Name" error={errors.middle_name}>
                        <input className="input" value={data.middle_name ?? ''} onChange={(event) => setData('middle_name', event.target.value)} />
                    </Field>
                    <Field label="Last Name" error={errors.last_name}>
                        <input className="input" value={data.last_name} onChange={(event) => setData('last_name', event.target.value)} />
                    </Field>
                    <Field label="Suffix" error={errors.suffix}>
                        <select className="input" value={data.suffix ?? ''} onChange={(event) => setData('suffix', event.target.value)}>
                            <option value="">None</option>
                            {['Jr.', 'Sr.', 'II', 'III', 'IV'].map((suffix) => (
                                <option key={suffix} value={suffix}>
                                    {suffix}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Sex" error={errors.sex}>
                        <select className="input" value={data.sex ?? ''} onChange={(event) => setData('sex', event.target.value)}>
                            <option value="">Not set</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </Field>
                    <Field label="Birth Date" error={errors.birth_date}>
                        <input className="input" type="date" value={data.birth_date ?? ''} onChange={(event) => setData('birth_date', event.target.value)} />
                    </Field>
                    <Field label="Contact Number" error={errors.contact_number}>
                        <input className="input" value={data.contact_number ?? ''} onChange={(event) => setData('contact_number', event.target.value)} />
                    </Field>
                    <Field label="License Number" error={errors.license_number}>
                        <input className="input" value={data.license_number ?? ''} onChange={(event) => setData('license_number', event.target.value)} />
                    </Field>
                    <Field label="Office Number" error={errors.office_number}>
                        <input className="input" value={data.office_number ?? ''} onChange={(event) => setData('office_number', event.target.value)} />
                    </Field>
                </div>

                <Field label="Address" error={errors.address}>
                    <textarea className="input min-h-24" value={data.address ?? ''} onChange={(event) => setData('address', event.target.value)} />
                </Field>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-6 min-h-11 rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-50"
                >
                    Save
                </button>
            </form>
        </AuthenticatedLayout>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="mt-4 block text-sm font-medium text-slate-700">
            {label}
            <div className="mt-2">{children}</div>
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </label>
    );
}
