/**
 * Brand configuration — tap trung tat ca thong tin thuong hieu
 * Dung cho: metadata, footer, emails, social sharing.
 */

export interface SocialLinks {
  readonly facebook?: string;
  readonly twitter?: string;
  readonly instagram?: string;
  readonly youtube?: string;
  readonly linkedin?: string;
  readonly github?: string;
  readonly tiktok?: string;
}

export interface BrandColors {
  readonly primary: string;
  readonly primaryForeground: string;
  readonly secondary: string;
  readonly accent: string;
}

export interface BrandConfig {
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly tagline: string;
  readonly url: string;
  readonly logo: {
    readonly light: string;
    readonly dark: string;
    readonly favicon: string;
  };
  readonly contact: {
    readonly email: string;
    readonly phone: string;
    readonly address: string;
  };
  readonly colors: BrandColors;
  readonly social: SocialLinks;
  readonly copyright: string;
}

export const brand: BrandConfig = {
  name: 'WebTemplate',
  shortName: 'WebTemplate',
  description:
    'Nen tang web day du tinh nang — thuong mai dien tu, blog, quan tri va hon the nua.',
  tagline: 'Mot nen tang. Moi nhu cau.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:6000',
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
    favicon: '/favicon.ico',
  },
  contact: {
    email: 'hello@webtemplate.dev',
    phone: '+84 900 000 000',
    address: 'Ha Noi, Viet Nam',
  },
  colors: {
    primary: 'hsl(221.2 83.2% 53.3%)',
    primaryForeground: 'hsl(210 40% 98%)',
    secondary: 'hsl(210 40% 96.1%)',
    accent: 'hsl(210 40% 96.1%)',
  },
  social: {
    facebook: 'https://facebook.com/webtemplate',
    twitter: 'https://twitter.com/webtemplate',
    instagram: 'https://instagram.com/webtemplate',
    youtube: 'https://youtube.com/@webtemplate',
    github: 'https://github.com/webtemplate',
  },
  copyright: `© ${new Date().getFullYear()} WebTemplate. All rights reserved.`,
};

export default brand;
