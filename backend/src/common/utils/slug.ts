import slugify from 'slugify';
import { randomBytes } from 'crypto';

/**
 * Generate a URL-friendly slug from text.
 * Handles Vietnamese and Unicode characters.
 *
 * @param text - Input text to slugify
 * @returns URL-safe slug string
 */
export function generateSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: 'vi',
    trim: true,
  });
}

/**
 * Generate a unique slug by appending a random suffix if the slug already exists.
 *
 * @param text - Input text to slugify
 * @param checkExists - Async function that returns true if slug is taken
 * @param maxAttempts - Maximum retry attempts (default: 10)
 * @returns A unique slug string
 *
 * @example
 * ```ts
 * const slug = await generateUniqueSlug('Hello World', async (s) => {
 *   return !!(await repo.findOne({ where: { slug: s } }));
 * });
 * ```
 */
export async function generateUniqueSlug(
  text: string,
  checkExists: (slug: string) => Promise<boolean>,
  maxAttempts = 10,
): Promise<string> {
  const baseSlug = generateSlug(text);

  // Kiem tra slug goc truoc
  const exists = await checkExists(baseSlug);
  if (!exists) return baseSlug;

  // Them suffix ngau nhien neu trung
  for (let i = 0; i < maxAttempts; i++) {
    const suffix = randomBytes(3).toString('hex'); // 6 ky tu hex
    const candidateSlug = `${baseSlug}-${suffix}`;
    const candidateExists = await checkExists(candidateSlug);
    if (!candidateExists) return candidateSlug;
  }

  // Fallback: timestamp-based suffix
  return `${baseSlug}-${Date.now().toString(36)}`;
}
