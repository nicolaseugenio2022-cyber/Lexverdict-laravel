import type { ReactNode } from 'react';

type Props = {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
};

export default function PageHeader({ eyebrow, title, description, actions }: Props) {
    return (
        <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow && <p className="text-sm font-semibold text-blue-900">{eyebrow}</p>}
                <h1 className={`${eyebrow ? 'mt-1' : ''} text-2xl font-semibold text-slate-950`}>
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
                )}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </header>
    );
}
