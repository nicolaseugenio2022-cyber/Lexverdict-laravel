import { useState } from 'react';

type ExpandableCollectionProps = {
    id: string;
    items: readonly string[];
    singularLabel: string;
    pluralLabel: string;
    visibleCount?: number;
    emptyValue?: string;
    className?: string;
};

export default function ExpandableCollection({
    id,
    items,
    singularLabel,
    pluralLabel,
    visibleCount = 2,
    emptyValue = '-',
    className = '',
}: ExpandableCollectionProps) {
    const [expanded, setExpanded] = useState(false);
    const hasHiddenItems = items.length > visibleCount;
    const visibleItems = expanded ? items : items.slice(0, visibleCount);
    const hiddenCount = items.length - visibleCount;
    const disclosureLabel =
        hiddenCount === 1
            ? `Show 1 remaining ${singularLabel}`
            : `Show all ${items.length} ${items.length === 1 ? singularLabel : pluralLabel}`;

    if (items.length === 0) {
        return (
            <span id={id} className={className}>
                {emptyValue}
            </span>
        );
    }

    return (
        <div className={`min-w-0 max-w-full ${className}`.trim()}>
            <ul id={id} className="space-y-1">
                {visibleItems.map((item, index) => (
                    <li key={index} className="break-words">
                        {item}
                    </li>
                ))}
            </ul>

            {hasHiddenItems && (
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={id}
                    className="record-entry-actions btn btn-ghost btn-compact mt-0.5 max-w-full whitespace-normal"
                    onClick={() => setExpanded((current) => !current)}
                >
                    {expanded ? 'Show less' : disclosureLabel}
                </button>
            )}
        </div>
    );
}
