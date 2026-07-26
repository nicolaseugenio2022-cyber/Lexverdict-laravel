type Props = {
    value: string | null | undefined;
};

export default function StatusBadge({ value }: Props) {
    if (!value) {
        return <span className="text-slate-600">-</span>;
    }

    const tone =
        value === 'Approved' || value === 'For Filing' || value === 'Resolved'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : value === 'Denied' || value === 'Dismissed'
              ? 'border-red-200 bg-red-50 text-red-800'
              : value === 'Pending' || value === 'PENDING' || value === 'Generating'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${tone}`}>
            {value}
        </span>
    );
}
