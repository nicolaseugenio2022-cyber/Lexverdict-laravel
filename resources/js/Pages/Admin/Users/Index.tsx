import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import type { PageProps } from '../../../types/page';

type StaffProfile = {
    first_name: string;
    last_name: string;
};

type StaffUser = {
    id: string;
    username: string;
    role_label: string;
    is_active: boolean;
    staff_profile: StaffProfile | null;
    has_assignment: boolean;
};

type Props = {
    users: StaffUser[];
};

export default function Index({ users }: Props) {
    const { flash } = usePage<PageProps>().props;
    const identityErrors = flash.errors.identity ?? [];

    return (
        <AuthenticatedLayout>
            <Head title="Users" />
            <section className="rounded-md border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Users</h1>
                        <p className="text-sm text-slate-600">Staff accounts and active-state controls.</p>
                    </div>
                    <Link
                        href="/admin/users/create"
                        className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                        Create User
                    </Link>
                </div>

                {identityErrors.map((error) => (
                    <p key={error} className="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {error}
                    </p>
                ))}

                <div className="table-scroll" tabIndex={0} role="region" aria-label="Users table">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Username</th>
                                <th className="px-5 py-3 font-semibold">Name</th>
                                <th className="px-5 py-3 font-semibold">Role</th>
                                <th className="px-5 py-3 font-semibold">Status</th>
                                <th className="px-5 py-3 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-slate-100">
                                    <td className="px-5 py-3 font-medium">{user.username}</td>
                                    <td className="px-5 py-3">
                                        {user.staff_profile ? `${user.staff_profile.first_name} ${user.staff_profile.last_name}` : ''}
                                    </td>
                                    <td className="px-5 py-3">{user.role_label}</td>
                                    <td className="px-5 py-3">{user.is_active ? 'Active' : 'Inactive'}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            <Link className="font-medium text-blue-900" href={`/admin/users/${user.id}/edit`}>
                                                Edit
                                            </Link>
                                            {user.is_active ? (
                                                <button
                                                    type="button"
                                                    className="font-medium text-red-700"
                                                    onClick={() => router.patch(`/admin/users/${user.id}/deactivate`)}
                                                >
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="font-medium text-blue-900"
                                                    onClick={() => router.patch(`/admin/users/${user.id}/restore`)}
                                                >
                                                    Restore
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AuthenticatedLayout>
    );
}
