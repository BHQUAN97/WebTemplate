'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  breadcrumbJsonLd,
  JsonLd,
  type BreadcrumbItem as JsonLdBreadcrumbItem,
} from '@/lib/seo/json-ld';

/**
 * Breadcrumb item — label hien thi, href optional (last item khong co href)
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
  /** Bo qua JSON-LD schema neu khong muon render script */
  withJsonLd?: boolean;
}

/**
 * Tinh toan danh sach items hien thi tren mobile — collapse neu > 3 items
 * Giu lai: first + 1 middle (gan cuoi) + last, cac phan tu bi thay bang "..."
 */
function collapseForMobile(items: BreadcrumbItem[]): Array<BreadcrumbItem | 'ellipsis'> {
  if (items.length <= 3) return items;
  const first = items[0];
  const last = items[items.length - 1];
  const middle = items[items.length - 2];
  return [first, 'ellipsis', middle, last];
}

/**
 * Breadcrumbs reusable — co a11y (nav aria-label + aria-current), responsive collapse,
 * auto JSON-LD BreadcrumbList schema.
 */
export function Breadcrumbs({
  items,
  separator,
  className,
  withJsonLd = true,
}: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  const sep = separator ?? (
    <ChevronRight
      className="h-4 w-4 text-gray-400 dark:text-gray-500"
      aria-hidden="true"
    />
  );

  const desktopItems = items;
  const mobileItems = collapseForMobile(items);

  // JSON-LD: chi include cac item co href (khong ke ellipsis va cac item la current page khong co href)
  const jsonLdItems: JsonLdBreadcrumbItem[] = items.map((item) => ({
    name: item.label,
    url: item.href ?? '',
  }));

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className={cn('w-full text-sm', className)}
      >
        {/* Desktop — full list */}
        <ol className="hidden sm:flex flex-wrap items-center gap-1.5">
          {desktopItems.map((item, idx) => {
            const isLast = idx === desktopItems.length - 1;
            return (
              <BreadcrumbListItem
                key={`d-${idx}-${item.label}`}
                item={item}
                isLast={isLast}
                separator={idx > 0 ? sep : null}
              />
            );
          })}
        </ol>

        {/* Mobile — collapsed */}
        <ol className="flex sm:hidden flex-wrap items-center gap-1.5">
          {mobileItems.map((item, idx) => {
            if (item === 'ellipsis') {
              return (
                <React.Fragment key={`m-ellipsis-${idx}`}>
                  <li aria-hidden="true" className="flex items-center">
                    {sep}
                  </li>
                  <li
                    className="text-gray-500 dark:text-gray-400 select-none"
                    aria-label="Cac muc bi an"
                  >
                    ...
                  </li>
                </React.Fragment>
              );
            }
            const isLast = idx === mobileItems.length - 1;
            return (
              <BreadcrumbListItem
                key={`m-${idx}-${item.label}`}
                item={item}
                isLast={isLast}
                separator={idx > 0 ? sep : null}
              />
            );
          })}
        </ol>
      </nav>

      {withJsonLd && items.length > 0 && (
        <JsonLd data={breadcrumbJsonLd(jsonLdItems)} />
      )}
    </>
  );
}

interface BreadcrumbListItemProps {
  item: BreadcrumbItem;
  isLast: boolean;
  separator: React.ReactNode;
}

function BreadcrumbListItem({ item, isLast, separator }: BreadcrumbListItemProps) {
  return (
    <>
      {separator && (
        <li aria-hidden="true" className="flex items-center">
          {separator}
        </li>
      )}
      <li className="flex items-center">
        {isLast || !item.href ? (
          <span
            aria-current={isLast ? 'page' : undefined}
            className={cn(
              'truncate max-w-[12rem]',
              isLast
                ? 'text-gray-900 dark:text-gray-100 font-medium'
                : 'text-gray-500 dark:text-gray-400',
            )}
          >
            {item.label}
          </span>
        ) : (
          <Link
            href={item.href}
            className="truncate max-w-[12rem] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline underline-offset-4 transition-colors"
          >
            {item.label}
          </Link>
        )}
      </li>
    </>
  );
}

export default Breadcrumbs;
