import { Link } from '@inertiajs/react';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    links: PaginationLink[];
    from?: number | null;
    to?: number | null;
    total?: number;
    currentPage?: number;
    lastPage?: number;
    ariaLabel: string;
};

export default function Pagination({
    links,
    from,
    to,
    total,
    currentPage,
    lastPage,
    ariaLabel,
}: Props) {
    if (links.length === 0) return null;

    return (
        <div className="pagination-shell">
            <p className="text-sm text-slate-600" aria-live="polite">
                {total !== undefined
                    ? `Showing ${from ?? 0} to ${to ?? 0} of ${total}`
                    : `Page ${currentPage ?? 1} of ${lastPage ?? 1}`}
            </p>
            <nav aria-label={ariaLabel}>
                <ul className="flex flex-wrap items-center gap-1.5">
                    {links.map((link, index) => {
                        const label = paginationLabel(link.label);
                        const numeric = /^\d+$/.test(label);
                        const responsiveClass =
                            numeric && !link.active ? 'hidden sm:inline-flex' : 'inline-flex';

                        return (
                            <li key={`${link.label}-${index}`}>
                                {link.url ? (
                                    <Link
                                        href={link.url}
                                        aria-current={link.active ? 'page' : undefined}
                                        className={`${responsiveClass} min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-institution-600 focus:ring-offset-2 ${link.active ? 'border-institution-900 bg-institution-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-institution-600 hover:bg-institution-50'}`}
                                    >
                                        {label}
                                    </Link>
                                ) : (
                                    <span
                                        aria-disabled="true"
                                        className={`${responsiveClass} min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400`}
                                    >
                                        {label}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}

function paginationLabel(label: string) {
    return label.replace('&laquo;', '').replace('&raquo;', '').trim();
}
