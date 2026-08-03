import { Head, Link, router, usePage } from '@inertiajs/react';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import StatusBadge from '../../../Components/StatusBadge';
import { useToast } from '../../../Components/toast';
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
    const toast = useToast();
    const { flash } = usePage<PageProps>().props;
    const identityErrors = flash.errors.identity ?? [];

    return (
        <AuthenticatedLayout>
            <Head title="Users" />
            <div className="page-stack">
                <PageHeader
                    eyebrow="Administrator"
                    title="Users"
                    description="Staff accounts and active-state controls."
                    actions={
                        <Link href="/admin/users/create" className="btn btn-primary">
                            Create User
                        </Link>
                    }
                />

                {identityErrors.map((error) => (
                    <p key={error} className="notice notice-danger">
                        {error}
                    </p>
                ))}

                <section className="surface sticky-table-surface">
                    <div
                        className="table-scroll sticky-table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Users table"
                    >
                        <table className="data-table sticky-table-header min-w-[900px]">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="table-heading">Username</th>
                                    <th className="table-heading">Name</th>
                                    <th className="table-heading">Role</th>
                                    <th className="table-heading">Status</th>
                                    <th className="table-heading">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="data-row border-b border-slate-100"
                                    >
                                        <td className="table-cell table-cell-primary">
                                            {user.username}
                                        </td>
                                        <td className="table-cell">
                                            {user.staff_profile
                                                ? `${user.staff_profile.first_name} ${user.staff_profile.last_name}`
                                                : ''}
                                        </td>
                                        <td className="table-cell">{user.role_label}</td>
                                        <td className="table-cell">
                                            <StatusBadge
                                                value={user.is_active ? 'Active' : 'Inactive'}
                                            />
                                        </td>
                                        <td className="table-cell table-cell-actions">
                                            <div className="action-group">
                                                <Link
                                                    className="btn btn-secondary btn-compact"
                                                    href={`/admin/users/${user.id}/edit`}
                                                >
                                                    Edit
                                                </Link>
                                                {user.is_active ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger-outline btn-compact"
                                                        onClick={() =>
                                                            router.patch(
                                                                `/admin/users/${user.id}/deactivate`,
                                                                {},
                                                                {
                                                                    onSuccess: () =>
                                                                        toast.success(
                                                                            'User deactivated.',
                                                                        ),
                                                                },
                                                            )
                                                        }
                                                    >
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-compact"
                                                        onClick={() =>
                                                            router.patch(
                                                                `/admin/users/${user.id}/restore`,
                                                                {},
                                                                {
                                                                    onSuccess: () =>
                                                                        toast.success(
                                                                            'User restored.',
                                                                        ),
                                                                },
                                                            )
                                                        }
                                                    >
                                                        Restore
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-0">
                                            <EmptyState
                                                title="No staff accounts are available."
                                                description="Create an authorized staff account to begin managing users."
                                                action={
                                                    <Link
                                                        href="/admin/users/create"
                                                        className="btn btn-primary"
                                                    >
                                                        Create User
                                                    </Link>
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
