const operationalActionLabels: Record<string, string> = {
    'case.created': 'New Case Registered',
    'case.revised': 'Case Revised',
    'subpoena.approved': 'Subpoena Approved',
    'subpoena.denied': 'Subpoena Denied',
    'document.subpoena.generated': 'Subpoena Generated',
    'resolution.submitted': 'Resolution Submitted',
    'resolution.revised': 'Resolution Revised',
    'resolution.approved': 'Resolution Approved',
    'resolution.denied': 'Resolution Denied',
};

const auditAreaSegments = new Set([
    'assignment',
    'auth',
    'case',
    'document',
    'offense',
    'public',
    'report',
    'resolution',
    'staff',
    'subpoena',
]);

const identifierSegmentPattern = /^[a-z][a-z0-9_-]*$/;
const subjectTypePattern = /^(?:[A-Za-z_][A-Za-z0-9_]*\\)*[A-Za-z_][A-Za-z0-9_]*$/;

export function formatAuditAction(value: string) {
    return (
        operationalActionLabels[value] ??
        value
            .split('.')
            .map((part) => part.replace(/[_-]+/g, ' '))
            .join(' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
    );
}

export function formatAuditArea(value: string | null | undefined) {
    if (!value) return 'Area unavailable';

    const [segment] = value.split('.');
    if (!identifierSegmentPattern.test(segment) || !auditAreaSegments.has(segment)) {
        return 'Area unavailable';
    }

    return humanizeIdentifier(segment);
}

export function formatAuditSubjectType(value: string | null | undefined) {
    if (!value || !subjectTypePattern.test(value)) return 'Target unavailable';

    const basename = value.split('\\').at(-1);
    if (!basename) return 'Target unavailable';

    return basename
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanizeIdentifier(value: string) {
    return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type AuditTimestampParts = {
    dateLabel: string;
    timeLabel: string | null;
    accessibleLabel: string;
};

export function formatAuditTimestampParts(
    value: string | null,
    now = new Date(),
): AuditTimestampParts {
    if (value === null) {
        return {
            dateLabel: 'Timestamp unavailable',
            timeLabel: null,
            accessibleLabel: 'Timestamp unavailable',
        };
    }

    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (parts === null) {
        return {
            dateLabel: value,
            timeLabel: null,
            accessibleLabel: value,
        };
    }

    const [, year, month, day, hour, minute, second] = parts;
    const timestamp = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
    );
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
    const dayDifference = Math.round((today.getTime() - eventDate.getTime()) / 86_400_000);
    const dateLabel =
        dayDifference === 0
            ? 'Today'
            : dayDifference === 1
              ? 'Yesterday'
              : new Intl.DateTimeFormat('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: timestamp.getFullYear() === now.getFullYear() ? undefined : 'numeric',
                }).format(timestamp);
    const timeLabel = new Intl.DateTimeFormat('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(timestamp);

    return {
        dateLabel,
        timeLabel,
        accessibleLabel: `${dateLabel}, ${timeLabel}`,
    };
}

export function formatAuditTimestamp(value: string | null, now = new Date()) {
    return formatAuditTimestampParts(value, now).accessibleLabel;
}
