import { Link, router, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import type { PageProps } from '../types/page';

type NavItem = {
    label: string;
    href: string;
    show: boolean;
};

export default function AuthenticatedLayout({ children }: PropsWithChildren) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const user = auth.user;

    const navItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard', show: auth.can.view_dashboard },
        {
            label: 'Cases',
            href: auth.can.process_server_scope ? '/process-server/cases' : '/cases',
            show: auth.can.case_management || auth.can.process_server_scope,
        },
        {
            label: 'Verifying Cases',
            href: '/secretary/verifying-cases',
            show: auth.can.view_secretary_verification,
        },
        { label: 'Subpoena Review', href: '/subpoena-reviews', show: auth.can.review_subpoenas },
        {
            label: 'Resolution Review',
            href: '/resolution-reviews',
            show: auth.can.review_resolutions,
        },
        { label: 'Users', href: '/admin/users', show: auth.can.manage_users },
        { label: 'Assignments', href: '/admin/assignments', show: auth.can.manage_assignments },
        { label: 'Manage Crimes', href: '/admin/offenses', show: auth.can.manage_offenses },
        { label: 'Reports', href: '/admin/reports', show: auth.can.view_reports },
        { label: 'Audit', href: '/admin/audit', show: auth.can.view_audit },
    ];
    const currentPath = page.url.split('?')[0];

    function isActive(href: string) {
        return currentPath === href || currentPath.startsWith(`${href}/`);
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            <a
                href="#main-content"
                className="sr-only z-50 rounded-md bg-white px-3 py-2 font-semibold text-blue-900 focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:ring-2 focus:ring-blue-900"
            >
                Skip to main content
            </a>
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4 lg:px-6">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-blue-900">LexVerdict</p>
                        <p className="hidden text-xs text-slate-600 sm:block">
                            Prosecutor Office Case Management
                        </p>
                    </div>

                    <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
                        <div className="min-w-0 text-right">
                            <p className="truncate font-medium">{user?.name ?? user?.username}</p>
                            <p className="truncate text-xs text-slate-600">{user?.role_label}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.post('/logout')}
                            className="min-h-11 shrink-0 rounded-md border border-slate-300 px-3 font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-[1800px] min-w-0 gap-4 px-3 py-4 sm:px-4 md:grid-cols-[176px_minmax(0,1fr)] lg:gap-5 lg:px-6">
                <nav
                    aria-label="Staff navigation"
                    className="flex min-w-0 gap-1 overflow-x-auto rounded-md border border-slate-200 bg-white p-1.5 md:sticky md:top-4 md:block md:self-start md:overflow-visible"
                >
                    {navItems
                        .filter((item) => item.show)
                        .map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                                className={`flex min-h-11 shrink-0 items-center rounded-md border-l-4 px-2.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-1 md:mb-0.5 md:w-full ${isActive(item.href) ? 'border-blue-900 bg-blue-50 text-blue-950' : 'border-transparent text-slate-700 hover:bg-slate-100'}`}
                            >
                                {item.label}
                            </Link>
                        ))}
                </nav>

                <main id="main-content" className="min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
