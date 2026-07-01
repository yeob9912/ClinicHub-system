import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth-storage";

// Strip trailing /api/v1 (or /api/vN) so paths like /api/v1/users/me don't get doubled.
// NEXT_PUBLIC_API_URL may be "http://localhost:3001/api/v1" or just "http://localhost:3001".
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
)
  .replace(/\/api\/v\d+\/?$/, "")
  .replace(/\/$/, "") || "http://localhost:3001";

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  details?: { field: string; message: string }[];
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: { field: string; message: string }[];

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
};

async function parseResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.success) {
    throw new ApiError(
      body.message || "Request failed",
      res.status,
      body.error,
      body.details
    );
  }
  return body;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return false;

  const body = (await res.json()) as ApiResponse<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }>;

  if (!body.success || !body.data) return false;

  setTokens(body.data.access_token, body.data.refresh_token);
  return true;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, skipRefresh = false, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  // Don't force JSON content-type for FormData — let the browser set it with the boundary
  if (!requestHeaders.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  let res = await fetch(url, { ...rest, headers: requestHeaders });

  if (res.status === 401 && auth && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const token = getAccessToken();
      if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, { ...rest, headers: requestHeaders });
    } else {
      clearTokens();
    }
  }

  return (await parseResponse<T>(res)).data;
}

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details?.length) {
      return error.details.map((d) => d.message).join(" ");
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
