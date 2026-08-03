import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

type Props = {
    href: string;
    accessibleLabel: string;
    children: ReactNode;
    className?: string;
};

export default function RecordEntryLink({
    href,
    accessibleLabel,
    children,
    className = '',
}: Props) {
    return (
        <Link href={href} aria-label={accessibleLabel} className={`record-entry-link ${className}`}>
            {children}
        </Link>
    );
}
