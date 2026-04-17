import { Node, mergeAttributes } from '@tiptap/core';

export interface IframeEmbedOptions {
  /** Class ap dung len wrapper cua iframe (responsive) */
  HTMLAttributes: Record<string, unknown>;
}

/**
 * Danh sach domain duoc phep embed iframe.
 * Bat buoc de chong XSS khi user dan URL la.
 */
const ALLOWED_DOMAINS = [
  'docs.google.com',
  'www.google.com',
  'google.com',
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'codepen.io',
  'codesandbox.io',
  'stackblitz.com',
  'maps.google.com',
  'www.google.com/maps',
  'open.spotify.com',
  'w.soundcloud.com',
];

/** Kiem tra URL co nam trong whitelist khong */
function isAllowedDomain(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_DOMAINS.some(
      (d) => u.hostname === d || u.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframeEmbed: {
      /** Chen iframe voi URL + kich thuoc tuy chon */
      addEmbedIframe: (options: {
        src: string;
        width?: string | number;
        height?: string | number;
        title?: string;
      }) => ReturnType;
    };
  }
}

/**
 * Custom Tiptap Node — cho phep nhung iframe vao editor.
 * Chi cho phep cac domain trong ALLOWED_DOMAINS.
 */
export const IframeEmbed = Node.create<IframeEmbedOptions>({
  name: 'iframe',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'editor-iframe-embed',
      },
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
      height: { default: 500 },
      title: { default: 'Embedded content' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe',
        getAttrs: (el) => {
          const src = (el as HTMLElement).getAttribute('src');
          if (!src || !isAllowedDomain(src)) return false;
          return {
            src,
            width: (el as HTMLElement).getAttribute('width') || '100%',
            height: (el as HTMLElement).getAttribute('height') || 500,
            title: (el as HTMLElement).getAttribute('title') || 'Embedded content',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src as string | undefined;
    // Safe-by-default: neu khong hop le thi render placeholder
    if (!src || !isAllowedDomain(src)) {
      return [
        'div',
        { class: 'editor-iframe-blocked text-xs text-red-500 border border-red-200 p-2 rounded' },
        'Iframe tu domain nay khong duoc phep nhung',
      ];
    }
    return [
      'div',
      mergeAttributes(
        { class: 'editor-iframe-wrapper' },
        this.options.HTMLAttributes,
      ),
      [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          loading: 'lazy',
          referrerpolicy: 'no-referrer',
          sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms',
          frameborder: '0',
          allowfullscreen: 'true',
        }),
      ],
    ];
  },

  addCommands() {
    return {
      addEmbedIframe:
        (options) =>
        ({ commands }) => {
          if (!isAllowedDomain(options.src)) {
            // Sai domain -> bo qua
            return false;
          }
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              width: options.width ?? '100%',
              height: options.height ?? 500,
              title: options.title ?? 'Embedded content',
            },
          });
        },
    };
  },
});

/**
 * Chuan hoa URL Google Form: dam bao co ?embedded=true.
 */
export function normalizeGoogleFormUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'docs.google.com') return null;
    if (!u.pathname.includes('/forms/')) return null;
    // Chap nhan /viewform, /formResponse... — uu tien viewform voi embedded=true
    if (u.pathname.endsWith('/viewform') || !u.pathname.endsWith('/viewform')) {
      // Dam bao pathname ket thuc la /viewform
      if (!u.pathname.endsWith('/viewform')) {
        // Cat het phan cuoi, gan viewform
        const parts = u.pathname.split('/').filter(Boolean);
        const lastIdx = parts.findIndex((p) => p === 'e' || p === 'd');
        if (lastIdx >= 0) {
          // Giu phan "/forms/d/e/ID" -> noi them /viewform
          const beforeViewform = parts.slice(0, lastIdx + 3).join('/');
          u.pathname = `/${beforeViewform}/viewform`;
        }
      }
    }
    u.searchParams.set('embedded', 'true');
    return u.toString();
  } catch {
    return null;
  }
}

export { isAllowedDomain };
