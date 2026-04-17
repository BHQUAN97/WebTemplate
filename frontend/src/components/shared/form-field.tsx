'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label?: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Neu khong truyen — se auto-generate qua useId() de dam bao stable va unique */
  htmlFor?: string;
  /** Dat tren input con — neu khong truyen se fallback ve htmlFor */
  id?: string;
}

/**
 * Wrapper cho form field — label, error message (tieng Viet), description.
 * A11y: htmlFor <-> id, role="alert" + aria-live cho error, aria-invalid,
 * aria-describedby noi voi desc + error, required co asterisk + screen-reader text.
 *
 * Clone child input (first React element) va inject id/aria attrs tu dong —
 * neu caller da tu set id/aria-* thi uu tien gia tri cua caller.
 */
export function FormField({
  label,
  error,
  description,
  required,
  children,
  className,
  htmlFor,
  id,
}: FormFieldProps) {
  // Generate stable unique id neu caller khong truyen
  const autoId = React.useId();
  const fieldId = id ?? htmlFor ?? autoId;
  const descId = description ? `${fieldId}-desc` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  // Ghep describedby: desc + error (neu co)
  const describedBy =
    [descId, errorId].filter(Boolean).join(' ') || undefined;

  // Clone first React element child de inject a11y props — non-breaking: caller
  // van co the override bang cach tu set props tren child.
  const enhancedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const existing = child.props as Record<string, unknown>;
    return React.cloneElement(child, {
      id: existing.id ?? fieldId,
      'aria-invalid':
        existing['aria-invalid'] !== undefined
          ? existing['aria-invalid']
          : error
            ? true
            : undefined,
      'aria-describedby':
        existing['aria-describedby'] !== undefined
          ? existing['aria-describedby']
          : describedBy,
      'aria-required':
        existing['aria-required'] !== undefined
          ? existing['aria-required']
          : required
            ? true
            : undefined,
    } as Record<string, unknown>);
  });

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label
          htmlFor={fieldId}
          className={cn(error && 'text-red-500 dark:text-red-400')}
        >
          {label}
          {required && (
            <>
              <span
                aria-hidden="true"
                className="text-red-500 dark:text-red-400 ml-1"
              >
                *
              </span>
              <span className="sr-only"> (bat buoc)</span>
            </>
          )}
        </Label>
      )}

      {enhancedChildren}

      {description && !error && (
        <p id={descId} className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-xs text-red-500 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
