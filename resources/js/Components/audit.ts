export function formatAuditAction(value: string) {
    return value
        .split('.')
        .map((part) => part.replace(/[_-]+/g, ' '))
        .join(' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
