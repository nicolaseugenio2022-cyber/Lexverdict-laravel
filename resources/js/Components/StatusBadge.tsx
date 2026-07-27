type Props = {
    value: string | null | undefined;
};

export default function StatusBadge({ value }: Props) {
    if (!value) {
        return <span className="text-slate-600">-</span>;
    }

    const tone =
        value === 'Approved' || value === 'For Filing' || value === 'Resolved'
            ? 'status-success'
            : value === 'Denied' || value === 'Dismissed'
              ? 'status-danger'
              : value === 'Pending' || value === 'PENDING' || value === 'Generating'
                ? 'status-warning'
                : 'status-neutral';

    return <span className={`status-badge ${tone}`}>{value}</span>;
}
