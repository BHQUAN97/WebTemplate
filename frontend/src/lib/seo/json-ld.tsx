import * as React from 'react';
import { brand } from '@/lib/config/brand';
import type { Article, Product } from '@/lib/types';

/**
 * JSON-LD structured data helpers.
 *
 * Dung de inject Schema.org markup vao trang — cai thien SEO rich results.
 * Tat ca helper deu tra ve plain object; component <JsonLd /> chiu trach nhiem render.
 */

// Kieu du lieu chung cho JSON-LD payload
export type JsonLdPayload = Record<string, unknown>;

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export interface JsonLdProps {
  data: JsonLdPayload | JsonLdPayload[];
}

/**
 * Render mot (hoac nhieu) JSON-LD payload vao <script type="application/ld+json">.
 * An toan khi inject: dung dangerouslySetInnerHTML voi JSON.stringify.
 */
export function JsonLd({ data }: JsonLdProps): React.ReactElement {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Lay absolute URL tu path tuong doi hoac absolute.
 * Neu input da la URL day du, tra ve nguyen; neu khong, noi voi brand.url.
 */
function toAbsoluteUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const base = (brand.url || '').replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Sinh Product schema tu domain Product object.
 * Tham khao: https://schema.org/Product
 */
export function productJsonLd(product: Product): JsonLdPayload {
  const images: string[] = (product.images ?? [])
    .map((img) => toAbsoluteUrl(img?.url))
    .filter((u): u is string => typeof u === 'string');

  const availability =
    product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description ?? product.description ?? product.name,
    image: images.length > 0 ? images : undefined,
    sku: product.sku ?? undefined,
    url: toAbsoluteUrl(`/products/${product.slug}`),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'VND',
      availability,
      url: toAbsoluteUrl(`/products/${product.slug}`),
    },
  };
}

/**
 * Sinh Article schema (BlogPosting tuong thich) tu domain Article object.
 * Tham khao: https://schema.org/Article
 */
export function articleJsonLd(article: Article): JsonLdPayload {
  const imageUrl = toAbsoluteUrl(article.featured_image);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: article.published_at ?? article.created_at,
    dateModified: article.updated_at,
    author: article.author
      ? {
          '@type': 'Person',
          name: article.author.name,
        }
      : {
          '@type': 'Organization',
          name: brand.name,
        },
    publisher: {
      '@type': 'Organization',
      name: brand.name,
      logo: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl(brand.logo.light),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': toAbsoluteUrl(`/blog/${article.slug}`),
    },
  };
}

/**
 * Item cho breadcrumb: co ten va URL (tuong doi hoac absolute).
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Sinh BreadcrumbList schema.
 * Tham khao: https://schema.org/BreadcrumbList
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdPayload {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: toAbsoluteUrl(item.url),
    })),
  };
}

/**
 * Sinh Organization schema tu brand config.
 * Tham khao: https://schema.org/Organization
 */
export function organizationJsonLd(): JsonLdPayload {
  const sameAs = Object.values(brand.social).filter((v): v is string => typeof v === 'string' && v.length > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: brand.url,
    logo: toAbsoluteUrl(brand.logo.light),
    description: brand.description,
    email: brand.contact.email,
    telephone: brand.contact.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: brand.contact.address,
    },
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

/**
 * Sinh WebSite schema voi SearchAction de Google hien search box.
 * Tham khao: https://schema.org/WebSite
 */
export function websiteJsonLd(): JsonLdPayload {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand.name,
    url: brand.url,
    description: brand.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${brand.url.replace(/\/$/, '')}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
