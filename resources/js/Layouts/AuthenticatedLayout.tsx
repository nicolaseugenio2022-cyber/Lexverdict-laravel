import { Link, router, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import type { PageProps } from '../types/page';

type NavItem = {
    label: string;
    href: string;
    show: boolean;
};

export default function AuthenticatedLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const navItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard', show: true },
        { label: 'Users', href: '/admin/users', show: auth.can.manage_users },
        { label: 'Assignments', href: '/admin/assignments', show: auth.can.manage_assignments },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-blue-900">LexVerdict</p>
                        <p className="text-xs text-slate-600">Prosecutor Office Case Management</p>
                    </div>

                    <div className="flex flex-col gap-2 text-sm md:items-end">
                        <span className="font-medium">{user?.name ?? user?.username}</span>
                        <span className="text-slate-600">{user?.role_label}</span>
                        <button
                            type="button"
                            onClick={() => router.post('/logout')}
                            className="min-h-11 rounded-md border border-slate-300 px-3 text-left font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
                <nav aria-label="Staff navigation" className="rounded-md border border-slate-200 bg-white p-2">
                    {navItems
                        .filter((item) => item.show)
                        .map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="block min-h-11 rounded-md px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            >
                                {item.label}
                            </Link>
                        ))}
                </nav>

                <main>{children}</main>
            </div>
        </div>
    );
}
