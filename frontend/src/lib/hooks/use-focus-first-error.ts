'use client';

import { useEffect } from 'react';
import type { FieldErrors, FieldValues } from 'react-hook-form';

/**
 * Tra ve key cua loi dau tien theo thu tu key xuat hien trong object errors.
 * Neu loi la nested (object), chi lay key cap cao nhat — react-hook-form van dat
 * `name` attribute theo path day du, nhung focus field cha la du cho UX.
 */
function getFirstErrorName<T extends FieldValues>(
  errors: FieldErrors<T>,
): string | null {
  const keys = Object.keys(errors);
  if (keys.length === 0) return null;
  return keys[0] ?? null;
}

/**
 * Hook tu dong focus vao field dau tien co loi khi errors thay doi.
 * Cach dung:
 *   const { formState: { errors } } = useForm();
 *   useFocusFirstError(errors);
 *
 * Tim element qua querySelector `[name="${firstErrorKey}"]` — phu hop voi
 * react-hook-form register() (mac dinh gan `name` attribute).
 */
export function useFocusFirstError<T extends FieldValues>(
  errors: FieldErrors<T>,
): void {
  // Dung JSON.stringify keys de ReactCompiler/React detect thay doi noi dung errors
  // thay vi reference moi luc re-render.
  const errorKey = getFirstErrorName(errors);

  useEffect(() => {
    if (!errorKey || typeof document === 'undefined') return;

    // CSS.escape de an toan voi key co ky tu dac biet (dot, bracket cho nested fields)
    const safeName =
      typeof CSS !== 'undefined' && 'escape' in CSS
        ? CSS.escape(errorKey)
        : errorKey.replace(/"/g, '\\"');

    const el = document.querySelector<HTMLElement>(`[name="${safeName}"]`);
    if (el && typeof el.focus === 'function') {
      // Defer mot tick de DOM kip render error message truoc khi focus
      requestAnimationFrame(() => {
        el.focus();
        // Scroll vao view neu bi khuat — block center de tranh giat layout
        if (typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }, [errorKey]);
}

export default useFocusFirstError;
