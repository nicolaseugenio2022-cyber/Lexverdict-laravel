import { formatAuditTimestampParts } from './audit';

type Props = {
    value: string | null;
    className?: string;
    showExact?: boolean;
};

export default function AuditTimestamp({ value, className = '', showExact = false }: Props) {
    const timestamp = formatAuditTimestampParts(value);

    return (
        <time
            dateTime={value?.replace(' ', 'T')}
            title={value ?? undefined}
            aria-label={timestamp.accessibleLabel}
            className={`flex flex-col ${className}`}
        >
            <span>{timestamp.dateLabel}</span>
            {timestamp.timeLabel && <span>{timestamp.timeLabel}</span>}
            {showExact && value && (
                <span className="mt-1 break-all font-mono text-[0.6875rem] leading-4 text-slate-600">
                    {value}
                </span>
            )}
        </time>
    );
}
