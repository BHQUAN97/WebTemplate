import { ulid } from 'ulid';

/**
 * Generate a ULID (Universally Unique Lexicographically Sortable Identifier).
 * 26 characters, time-sortable, URL-safe.
 * Used as primary key for all entities.
 */
export function generateUlid(): string {
  return ulid();
}
