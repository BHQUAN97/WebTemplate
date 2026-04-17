/**
 * BaseDto — utility static methods cho DTO.
 * Extend class nay hoac goi sanitize() truc tiep de trim va lam sach input.
 */
export class BaseDto {
  /**
   * Trim moi string field trong object (shallow) va convert empty string -> undefined.
   * Khong mutate input goc — tra ve object moi.
   */
  static sanitize<T extends Record<string, unknown>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        result[key] = trimmed.length === 0 ? undefined : trimmed;
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  /** Loai bo ky tu NUL va control char nguy hiem khoi string */
  static cleanControlChars(input: string): string {
    return input.replace(/[\u0000-\u001F\u007F]/g, '');
  }
}
