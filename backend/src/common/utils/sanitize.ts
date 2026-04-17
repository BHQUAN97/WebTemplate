import sanitize from 'sanitize-html';

/**
 * Sanitize HTML input to prevent XSS attacks.
 * Allows safe tags (p, b, i, a, ul, ol, li, br, img, h1-h6, blockquote, code, pre).
 *
 * @param input - Raw HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  return sanitize(input, {
    allowedTags: [
      'p',
      'br',
      'b',
      'i',
      'em',
      'strong',
      'u',
      's',
      'a',
      'img',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['class', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Tu dong them rel="noopener noreferrer" cho link ngoai
    transformTags: {
      a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}

/**
 * Strip all HTML tags from input, returning plain text.
 *
 * @param input - HTML string
 * @returns Plain text without any HTML
 */
export function stripTags(input: string): string {
  if (!input) return '';

  return sanitize(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}
