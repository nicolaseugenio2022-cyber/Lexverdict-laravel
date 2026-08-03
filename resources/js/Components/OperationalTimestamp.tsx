type Props = {
    value: string | null;
    className?: string;
};

const operationalTimestampFormatter = new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
});

export default function OperationalTimestamp({ value, className = '' }: Props) {
    if (value === null) {
        return <span className={className}>Not set</span>;
    }

    const timestamp = new Date(value);
    const displayValue = Number.isNaN(timestamp.getTime())
        ? value
        : operationalTimestampFormatter.format(timestamp);

    return (
        <time dateTime={value} title={value} className={className}>
            {displayValue}
        </time>
    );
}
