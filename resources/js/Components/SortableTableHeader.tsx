type SortableTableHeaderProps = {
    label: string;
    name: string;
    current: string;
    onSort: (name: string) => void;
    className?: string;
};

export default function SortableTableHeader({
    label,
    name,
    current,
    onSort,
    className = '',
}: SortableTableHeaderProps) {
    return (
        <th className={`table-heading ${className}`}>
            <button
                type="button"
                onClick={() => onSort(name)}
                className="-ml-2 min-h-10 rounded-md px-2 text-left hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
                {label} {current === name ? '(sorted)' : ''}
            </button>
        </th>
    );
}
