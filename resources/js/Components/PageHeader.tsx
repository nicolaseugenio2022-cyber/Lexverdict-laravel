import type { ReactNode } from 'react';

type Props = {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
};

export default function PageHeader({ eyebrow, title, description, actions }: Props) {
    return (
        <header className="page-header">
            <div className="min-w-0">
                {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
                <h1 className={`${eyebrow ? 'mt-1' : ''} page-title`}>{title}</h1>
                {description && <p className="page-description mt-1">{description}</p>}
            </div>
            {actions && <div className="page-actions shrink-0">{actions}</div>}
        </header>
    );
}
