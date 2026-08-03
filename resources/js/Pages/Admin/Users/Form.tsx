import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import FormField from '../../../Components/FormField';
import PageHeader from '../../../Components/PageHeader';
import { useToast } from '../../../Components/toast';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';

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
    const toast = useToast();
    const { data, setData, post, patch, processing, errors, isDirty } = useForm({
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
    const { allowNextVisit } = useUnsavedChanges(isDirty && !processing);

    function submit(event: FormEvent) {
        event.preventDefault();
        if (processing) return;

        allowNextVisit();
        if (mode === 'create') {
            post('/admin/users', { onSuccess: () => toast.success('User created.') });
        } else if (user) {
            patch(`/admin/users/${user.id}`, {
                onSuccess: () => toast.success('User updated.'),
            });
        }
    }

    return (
        <AuthenticatedLayout>
            <Head title={mode === 'create' ? 'Create User' : 'Edit User'} />
            <div className="page-stack">
                <PageHeader
                    eyebrow="Administrator"
                    title={mode === 'create' ? 'Create User' : 'Edit User'}
                />
                <form onSubmit={submit} aria-busy={processing} className="surface surface-body">
                    {identityError && (
                        <p className="notice notice-danger mb-4" role="alert">
                            {identityError}
                        </p>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField id="user-username" label="Username" error={errors.username}>
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    value={data.username}
                                    onChange={(event) => setData('username', event.target.value)}
                                />
                            )}
                        </FormField>
                        <FormField
                            id="user-password"
                            label={
                                mode === 'create'
                                    ? 'Password'
                                    : 'Password (leave blank to keep current)'
                            }
                            error={errors.password}
                        >
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    type="password"
                                    value={data.password}
                                    onChange={(event) => setData('password', event.target.value)}
                                />
                            )}
                        </FormField>
                        <FormField id="user-role" label="Role" error={errors.role}>
                            {(controlProps) => (
                                <select
                                    {...controlProps}
                                    className="input"
                                    value={data.role}
                                    onChange={(event) => setData('role', event.target.value)}
                                >
                                    {roles.map((role) => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </FormField>
                        <FormField
                            id="user-first-name"
                            label="First Name"
                            error={errors.first_name}
                        >
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    value={data.first_name}
                                    onChange={(event) => setData('first_name', event.target.value)}
                                />
                            )}
                        </FormField>
                        <FormField
                            id="user-middle-name"
                            label="Middle Name"
                            error={errors.middle_name}
                        >
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    value={data.middle_name ?? ''}
                                    onChange={(event) => setData('middle_name', event.target.value)}
                                />
                            )}
                        </FormField>
                        <FormField id="user-last-name" label="Last Name" error={errors.last_name}>
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    value={data.last_name}
                                    onChange={(event) => setData('last_name', event.target.value)}
                                />
                            )}
                        </FormField>
                        <FormField id="user-suffix" label="Suffix" error={errors.suffix}>
                            {(controlProps) => (
                                <select
                                    {...controlProps}
                                    className="input"
                                    value={data.suffix ?? ''}
                                    onChange={(event) => setData('suffix', event.target.value)}
                                >
                                    <option value="">None</option>
                                    {['Jr.', 'Sr.', 'II', 'III', 'IV'].map((suffix) => (
                                        <option key={suffix} value={suffix}>
                                            {suffix}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </FormField>
                        <FormField id="user-sex" label="Sex" error={errors.sex}>
                            {(controlProps) => (
                                <select
                                    {...controlProps}
                                    className="input"
                                    value={data.sex ?? ''}
                                    onChange={(event) => setData('sex', event.target.value)}
                                >
                                    <option value="">Not set</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            )}
                        </FormField>
                        <FormField
                            id="user-birth-date"
                            label="Birth Date"
                            error={errors.birth_date}
                        >
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    type="date"
                                    value={data.birth_date ?? ''}
                                    onChange={(event) => setData('birth_date', event.target.value)}
                                />
                            )}
                        </FormField>
                        <FormField
                            id="user-contact-number"
                            label="Contact Number"
                            error={errors.contact_number}
                        >
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    value={data.contact_number ?? ''}
                                    onChange={(event) =>
                                        setData('contact_number', event.target.value)
                                    }
                                />
                            )}
                        </FormField>
                        <FormField
                            id="user-license-number"
                            label="License Number"
                            error={errors.license_number}
                        >
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    value={data.license_number ?? ''}
                                    onChange={(event) =>
                                        setData('license_number', event.target.value)
                                    }
                                />
                            )}
                        </FormField>
                        <FormField
                            id="user-office-number"
                            label="Office Number"
                            error={errors.office_number}
                        >
                            {(controlProps) => (
                                <input
                                    {...controlProps}
                                    className="input"
                                    value={data.office_number ?? ''}
                                    onChange={(event) =>
                                        setData('office_number', event.target.value)
                                    }
                                />
                            )}
                        </FormField>
                    </div>

                    <div className="mt-4">
                        <FormField id="user-address" label="Address" error={errors.address}>
                            {(controlProps) => (
                                <textarea
                                    {...controlProps}
                                    className="input min-h-24"
                                    value={data.address ?? ''}
                                    onChange={(event) => setData('address', event.target.value)}
                                />
                            )}
                        </FormField>
                    </div>

                    <button type="submit" disabled={processing} className="btn btn-primary mt-5">
                        {processing ? (mode === 'create' ? 'Creating...' : 'Saving...') : 'Save'}
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
