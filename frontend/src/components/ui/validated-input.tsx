'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ValidatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  /** Label text hien thi phia tren input */
  label?: string;
  /** Ten field (dung cho react-hook-form register) */
  name: string;
  /** Description / helper text ben duoi input */
  description?: string;
  /** Error message — neu co, input border do va hien error */
  error?: string;
  /** Da touched va hop le — hien check xanh */
  success?: boolean;
  /** Required indicator (them dau * ben canh label) */
  required?: boolean;
  /** Wrapper className */
  wrapperClassName?: string;
  /** Label className */
  labelClassName?: string;
}

/**
 * ValidatedInput — input co san label, error, description, success indicator.
 * Tich hop tot voi react-hook-form qua forwardRef.
 * Tu dong set aria-invalid & aria-describedby.
 */
export const ValidatedInput = React.forwardRef<
  HTMLInputElement,
  ValidatedInputProps
>(
  (
    {
      label,
      name,
      type = 'text',
      description,
      error,
      success,
      required,
      className,
      wrapperClassName,
      labelClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? `field-${name}`;
    const errorId = `${inputId}-error`;
    const descId = `${inputId}-desc`;
    const hasError = Boolean(error);

    // Gom aria-describedby tu error + description
    const describedBy =
      [hasError ? errorId : null, description ? descId : null]
        .filter(Boolean)
        .join(' ') || undefined;

    return (
      <div className={cn('flex w-full flex-col gap-1.5', wrapperClassName)}>
        {label ? (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium text-gray-700 dark:text-gray-200',
              labelClassName,
            )}
          >
            {label}
            {required ? (
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        <div className="relative">
          <input
            id={inputId}
            name={name}
            type={type}
            ref={ref}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm',
              'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500',
              hasError
                ? 'border-red-500 focus:ring-red-500 dark:border-red-400'
                : success
                  ? 'border-green-500 focus:ring-green-500 pr-9 dark:border-green-400'
                  : 'border-gray-300 focus:ring-blue-500 dark:border-gray-700',
              className,
            )}
            {...props}
          />

          {success && !hasError ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          ) : null}
        </div>

        {hasError ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : description ? (
          <p
            id={descId}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {description}
          </p>
        ) : null}
      </div>
    );
  },
);

ValidatedInput.displayName = 'ValidatedInput';
