import { Head, usePage } from '@inertiajs/react';
import PageHeader from '../Components/PageHeader';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import type { PageProps } from '../types/page';

export default function Dashboard() {
    const { auth } = usePage<PageProps>().props;

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />
            <section className="space-y-6">
                <PageHeader eyebrow="Dashboard" title="Identity and authorization foundation" />
                <dl className="grid gap-4 md:grid-cols-3">
                    <div className="summary-card">
                        <dt className="metric-label">Signed in as</dt>
                        <dd className="mt-2 text-lg font-bold text-institution-950">
                            {auth.user?.username}
                        </dd>
                    </div>
                    <div className="summary-card">
                        <dt className="metric-label">Role</dt>
                        <dd className="mt-2 text-lg font-bold text-institution-950">
                            {auth.user?.role_label}
                        </dd>
                    </div>
                    <div className="summary-card">
                        <dt className="metric-label">Account</dt>
                        <dd className="mt-2 text-lg font-bold text-institution-950">Active</dd>
                    </div>
                </dl>
            </section>
        </AuthenticatedLayout>
    );
}
