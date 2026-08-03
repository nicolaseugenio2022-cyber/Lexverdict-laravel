import type { ReactNode } from 'react';

type Props = {
    title: string;
    description?: string;
    action?: ReactNode;
};

export default function EmptyState({ title, description, action }: Props) {
    return (
        <div className="empty-state">
            <p className="empty-state-title">{title}</p>
            {description && <p className="empty-state-description">{description}</p>}
            {action && <div className="empty-state-action">{action}</div>}
        </div>
    );
}
