import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Ket hop class names voi Tailwind CSS merge
 * Uu tien class sau, xu ly conflict (vd: "p-4 p-2" -> "p-2")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
