/**
 * Format a Date to 'YYYY-MM-DD' string.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date to 'YYYY-MM-DD HH:mm:ss' string.
 */
export function formatDateTime(date: Date): string {
  const time = [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join(':');
  return `${formatDate(date)} ${time}`;
}

/**
 * Check if a given date has passed (is in the past).
 *
 * @param date - Date to check
 * @returns true if the date is before now
 */
export function isExpired(date: Date): boolean {
  return new Date(date).getTime() < Date.now();
}

/**
 * Add days to a date, returns new Date.
 *
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add minutes to a date, returns new Date.
 *
 * @param date - Base date
 * @param minutes - Number of minutes to add (can be negative)
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + minutes * 60 * 1000);
  return result;
}
