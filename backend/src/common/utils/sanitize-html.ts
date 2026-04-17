import sanitizeHtml from 'sanitize-html';

/**
 * Domain whitelist cho iframe embed (Google Forms/Maps, YouTube, Vimeo).
 * Co the them qua ENV neu can.
 */
export const ALLOWED_IFRAME_DOMAINS = [
  'docs.google.com',
  'www.google.com',
  'google.com',
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
];

/**
 * Options chung cho sanitize CMS-rich-HTML: cho phep cac tag pho bien trong
 * Tiptap/rich editor — img, iframe (embed video/form/map), figure, video, source.
 *
 * Loai bo:
 * - script/style (XSS co ban)
 * - on* attribute (click handlers, etc.)
 * - javascript: URI
 *
 * Gatekeeper iframe: chi cho phep nhung domain co trong whitelist.
 */
const CMS_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'iframe',
    'h1',
    'h2',
    'figure',
    'figcaption',
    'video',
    'source',
    'audio',
    'picture',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel', 'title'],
    iframe: [
      'src',
      'width',
      'height',
      'frameborder',
      'allow',
      'allowfullscreen',
      'title',
      'loading',
      'referrerpolicy',
    ],
    img: [
      'src',
      'srcset',
      'sizes',
      'alt',
      'title',
      'width',
      'height',
      'loading',
      'decoding',
    ],
    video: ['src', 'controls', 'width', 'height', 'poster', 'preload'],
    source: ['src', 'type', 'media', 'srcset'],
    audio: ['src', 'controls', 'preload'],
    '*': ['class', 'style', 'id', 'data-*'],
  },
  allowedIframeHostnames: ALLOWED_IFRAME_DOMAINS,
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
  allowedSchemesByTag: {
    // Cho phep data: chi cho img (inline base64) — khong cho video/audio/iframe
    img: ['http', 'https', 'data'],
    iframe: ['http', 'https'],
  },
  // Ep loai bo moi attribute on* (onclick, onmouseover...) — sanitize-html
  // default da block, nhung ta khai bao doubly-safe qua transformTags.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

/**
 * Sanitize rich HTML content cho CMS (Pages, Articles, Products.description...).
 * Return sanitized string. Neu input null/undefined, tra ve chinh no.
 */
export function sanitizeCmsHtml(content: string | null | undefined): string {
  if (!content) return content ?? '';
  return sanitizeHtml(content, CMS_SANITIZE_OPTIONS);
}
