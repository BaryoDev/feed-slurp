export function toIsoDate(value: string): string | null {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : new Date(time).toISOString();
}
