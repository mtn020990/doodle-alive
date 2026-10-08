declare global {
  interface Window {
    /** Set by public/config.js; scripts/deploy-azure.ps1 rewrites it with the backend URL. */
    DOODLE_CONFIG?: { apiBaseUrl?: string };
  }
}

/** Backend base URL; empty means the backend serves this page (scripts/run.ps1). */
const API_BASE = (window.DOODLE_CONFIG?.apiBaseUrl ?? '').replace(/\/+$/, '');

/** Absolute URL for an API path or a `/media/...` file. */
export function apiUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Reads FastAPI's `{ detail }` error body, falling back to the status code. */
async function errorText(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') return data.detail;
  } catch {
    // body was not JSON
  }
  return `Request failed (${res.status})`;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), init);
  if (!res.ok) throw new ApiError(await errorText(res), res.status);
  return res.json() as Promise<T>;
}
