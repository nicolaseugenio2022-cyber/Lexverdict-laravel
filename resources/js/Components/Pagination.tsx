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
    itemLabel?: string;
};

export default function Pagination({
    links,
    from,
    to,
    total,
    currentPage,
    lastPage,
    ariaLabel,
    itemLabel,
}: Props) {
    if (links.length === 0) return null;

    const displayLinks = compactPaginationLinks(links);

    return (
        <div className="pagination-shell">
            <p className="text-sm text-slate-600" aria-live="polite">
                {total !== undefined
                    ? `Showing ${from ?? 0} to ${to ?? 0} of ${total} ${itemLabel ?? 'records'}.`
                    : `Page ${currentPage ?? 1} of ${lastPage ?? 1}`}
            </p>
            <nav aria-label={ariaLabel}>
                <ul className="flex flex-wrap items-center gap-1.5">
                    {displayLinks.map((link, index) => {
                        const label = paginationLabel(link.label);
                        const numeric = /^\d+$/.test(label);
                        const responsiveClass =
                            numeric && !link.active ? 'hidden sm:inline-flex' : 'inline-flex';

                        if (label === '…' || label === '...') {
                            return (
                                <li key={`ellipsis-${index}`} className="hidden sm:block">
                                    <span className="pagination-ellipsis" aria-hidden="true">
                                        …
                                    </span>
                                </li>
                            );
                        }

                        return (
                            <li key={`${link.label}-${index}`}>
                                {link.url ? (
                                    <Link
                                        href={link.url}
                                        aria-current={link.active ? 'page' : undefined}
                                        className={`${responsiveClass} pagination-link`}
                                    >
                                        {label}
                                    </Link>
                                ) : (
                                    <span
                                        aria-disabled="true"
                                        className={`${responsiveClass} pagination-link`}
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

function compactPaginationLinks(links: PaginationLink[]) {
    const numericLinks = links.filter((link) => /^\d+$/.test(paginationLabel(link.label)));
    if (numericLinks.length <= 7) return links;

    const first = numericLinks[0];
    const last = numericLinks[numericLinks.length - 1];
    const current = numericLinks.find((link) => link.active) ?? first;
    const currentPage = Number(paginationLabel(current.label));
    const visiblePages = new Set([
        Number(paginationLabel(first.label)),
        currentPage - 1,
        currentPage,
        currentPage + 1,
        Number(paginationLabel(last.label)),
    ]);
    const visibleLinks = numericLinks.filter((link) =>
        visiblePages.has(Number(paginationLabel(link.label))),
    );
    const compacted: PaginationLink[] = [];

    visibleLinks.forEach((link, index) => {
        const previous = visibleLinks[index - 1];
        if (
            previous &&
            Number(paginationLabel(link.label)) - Number(paginationLabel(previous.label)) > 1
        ) {
            compacted.push({ url: null, label: '…', active: false });
        }
        compacted.push(link);
    });

    return [links[0], ...compacted, links[links.length - 1]];
}
