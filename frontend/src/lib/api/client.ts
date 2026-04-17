const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  /** Internal flag — danh dau request da retry sau khi refresh token */
  _retry?: boolean;
  /** Bo qua 401 interceptor (VD: goi /auth/login, /auth/refresh) */
  skipAuthRefresh?: boolean;
}

/**
 * ApiError — error chuan cho API, expose status/code de UI xu ly.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  private baseUrl: string;
  // Dedupe refresh requests khi nhieu request fail 401 cung luc
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private setToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) localStorage.setItem('access_token', token);
    else localStorage.removeItem('access_token');
  }

  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }

  /**
   * Goi /auth/refresh de lay access_token moi.
   * Dedupe: nhieu request fail 401 song song chi refresh 1 lan.
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(this.buildUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        // BE co the tra ve { access_token } hoac { accessToken }
        const token: string | undefined =
          data?.access_token ?? data?.accessToken;
        if (!token) return null;
        this.setToken(token);
        return token;
      } catch {
        return null;
      } finally {
        // Reset sau 1 tick de cho cac request song song cung nhan duoc token
        setTimeout(() => {
          this.refreshPromise = null;
        }, 0);
      }
    })();

    return this.refreshPromise;
  }

  /** Chuyen huong sang trang login va clear auth state */
  private redirectToLogin() {
    if (typeof window === 'undefined') return;
    this.setToken(null);
    const redirect = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.href = `/login?redirect=${redirect}`;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      params,
      headers = {},
      _retry = false,
      skipAuthRefresh = false,
    } = options;

    const token = this.getToken();
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

    const response = await fetch(this.buildUrl(endpoint, params), {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    // Interceptor: 401 -> thu refresh token 1 lan
    if (
      response.status === 401 &&
      !_retry &&
      !skipAuthRefresh &&
      typeof window !== 'undefined'
    ) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        return this.request<T>(endpoint, { ...options, _retry: true });
      }
      // Refresh fail — redirect ve login
      this.redirectToLogin();
      throw new ApiError(401, 'Phien dang nhap het han', 'UNAUTHORIZED');
    }

    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: 'Loi khong xac dinh' }));
      throw new ApiError(
        response.status,
        errorBody.message || `HTTP ${response.status}`,
        errorBody.code,
        errorBody,
      );
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) {
    return this.request<T>(endpoint, { params });
  }
  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }
  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }
  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }
  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch(this.buildUrl(endpoint), {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (response.status === 401 && typeof window !== 'undefined') {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        response = await fetch(this.buildUrl(endpoint), {
          method: 'POST',
          headers: { Authorization: `Bearer ${newToken}` },
          body: formData,
          credentials: 'include',
        });
      } else {
        this.redirectToLogin();
        throw new ApiError(401, 'Phien dang nhap het han', 'UNAUTHORIZED');
      }
    }

    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: 'Upload that bai' }));
      throw new ApiError(
        response.status,
        errorBody.message || `HTTP ${response.status}`,
        errorBody.code,
        errorBody,
      );
    }
    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
