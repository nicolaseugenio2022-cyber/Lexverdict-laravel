import { Link, router, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import type { PageProps } from '../types/page';

type NavItem = {
    label: string;
    href: string;
    show: boolean;
};

type Props = PropsWithChildren<{ printable?: boolean }>;

export default function AuthenticatedLayout({ children, printable = false }: Props) {
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
    const [navigating, setNavigating] = useState(false);
    const [navigationOpen, setNavigationOpen] = useState(false);

    useEffect(() => {
        const removeStartListener = router.on('start', () => setNavigating(true));
        const removeFinishListener = router.on('finish', () => setNavigating(false));

        return () => {
            removeStartListener();
            removeFinishListener();
        };
    }, []);

    function isActive(href: string) {
        return currentPath === href || currentPath.startsWith(`${href}/`);
    }

    return (
        <div className={`app-shell ${printable ? 'print-layout' : ''}`}>
            <a href="#main-content" className="skip-link sr-only focus:not-sr-only">
                Skip to main content
            </a>
            <header className="app-header">
                <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <img
                            src="/images/branding/doj-seal.png"
                            alt="Department of Justice seal"
                            className="brand-logo"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white">LexVerdict</p>
                            <p className="hidden text-xs text-slate-300 sm:block">
                                Prosecutor Office Case Management
                            </p>
                        </div>
                    </div>

                    <div className="app-account flex min-w-0 items-center gap-2 text-sm sm:gap-3">
                        <div className="min-w-0 text-right text-white">
                            <p className="truncate font-semibold">{user?.name ?? user?.username}</p>
                            <p className="truncate text-xs text-slate-300">{user?.role_label}</p>
                        </div>
                        <span className="sr-only" role="status" aria-live="polite">
                            {navigating ? 'Loading page' : ''}
                        </span>
                        <button
                            type="button"
                            onClick={() => router.post('/logout')}
                            className="btn btn-header shrink-0 px-3"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="app-content-grid mx-auto grid max-w-[1800px] min-w-0 gap-5 px-3 py-5 sm:px-4 md:grid-cols-[196px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-6">
                <button
                    type="button"
                    aria-expanded={navigationOpen}
                    aria-controls="staff-navigation"
                    onClick={() => setNavigationOpen((open) => !open)}
                    className="navigation-toggle md:hidden"
                >
                    <span>Navigation</span>
                    <span aria-hidden="true">{navigationOpen ? 'Close' : 'Open'}</span>
                </button>
                <nav
                    id="staff-navigation"
                    aria-label="Staff navigation"
                    className={`app-nav min-w-0 grid-cols-2 gap-1 p-2 sm:grid-cols-3 md:sticky md:top-5 md:block md:self-start ${navigationOpen ? 'grid' : 'hidden'}`}
                >
                    {navItems
                        .filter((item) => item.show)
                        .map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setNavigationOpen(false)}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                                className="nav-link justify-center text-center md:mb-1 md:w-full md:justify-start md:text-left md:last:mb-0"
                            >
                                {item.label}
                            </Link>
                        ))}
                </nav>

                <main id="main-content" className="min-w-0 pb-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
