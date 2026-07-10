import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import type { PageProps } from '../types/page';

export default function Dashboard() {
    const { auth } = usePage<PageProps>().props;

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />
            <section className="rounded-md border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-blue-900">Dashboard</p>
                <h1 className="mt-2 text-2xl font-semibold">Identity and authorization foundation</h1>
                <dl className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-md border border-slate-200 p-4">
                        <dt className="text-sm text-slate-600">Signed in as</dt>
                        <dd className="mt-1 font-semibold">{auth.user?.username}</dd>
                    </div>
                    <div className="rounded-md border border-slate-200 p-4">
                        <dt className="text-sm text-slate-600">Role</dt>
                        <dd className="mt-1 font-semibold">{auth.user?.role_label}</dd>
                    </div>
                    <div className="rounded-md border border-slate-200 p-4">
                        <dt className="text-sm text-slate-600">Account</dt>
                        <dd className="mt-1 font-semibold">Active</dd>
                    </div>
                </dl>
            </section>
        </AuthenticatedLayout>
    );
}
