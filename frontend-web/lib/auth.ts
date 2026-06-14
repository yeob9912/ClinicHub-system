import { apiRequest } from "./api";
import { setTokens, clearTokens } from "./auth-storage";

export type BackendRole = "patient" | "pharmacy_staff" | "admin";

export interface ApiUserProfile {
  id: string;
  email: string;
  full_name: string;
  role: BackendRole | string;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  favorites?: {
    pharmacies: string[];
    medicines: string[];
  };
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
}

export interface LoginResponse {
  user: ApiUserProfile;
  session: AuthSession;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  session: AuthSession | null;
  email_confirmation_required: boolean;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one digit";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return null;
}

export async function loginWithEmail(email: string, password: string): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.session.access_token, data.session.refresh_token);
  return data;
}
export async function registerAccount(input: {
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  role?: "patient" | "pharmacy_staff";
  google_id?: string;
}): Promise<RegisterResponse> {
  const data = await apiRequest<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      full_name: input.full_name,
      phone: input.phone,
      role: input.role ?? "patient",
      google_id: input.google_id,
    }),
  });

  if (data.session) {
    setTokens(data.session.access_token, data.session.refresh_token);
  }

  return data;
}

export async function fetchMe(accessToken?: string): Promise<ApiUserProfile> {
  return apiRequest<ApiUserProfile>("/api/v1/users/me", {
    method: "GET",
    auth: !accessToken, // use stored token if none provided
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function logoutApi(): Promise<void> {
  // Always clear local tokens first — even if the server call fails
  // (e.g. token already expired / missing Authorization header)
  const token = typeof window !== "undefined"
    ? localStorage.getItem("medpay_access_token")
    : null;

  clearTokens();

  if (token) {
    // Fire-and-forget: tell the backend to invalidate — ignore any errors
    try {
      await fetch(`${(await import("./api")).API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
    } catch {
      // Silently ignore — tokens are already cleared locally
    }
  }
}

export function mapBackendRole(role: string): "user" | "pharmacy" | "admin" {
  if (role === "admin") return "admin";
  if (role === "pharmacy_staff") return "pharmacy";
  return "user";
}

export function homePathForRole(role: "user" | "pharmacy" | "admin"): string {
  if (role === "admin") return "/admin";
  if (role === "pharmacy") return "/staff";
  return "/";
}
