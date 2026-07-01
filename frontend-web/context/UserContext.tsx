"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchMe,
  loginWithEmail,
  registerAccount,
  logoutApi,
  mapBackendRole,
  homePathForRole,
  type ApiUserProfile,
} from "@/lib/auth";
import { getAccessToken, clearTokens, setTokens } from "@/lib/auth-storage";
import { apiRequest } from "@/lib/api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  link?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "user" | "pharmacy" | "admin";
  avatarUrl?: string | null;
  favorites?: {
    pharmacies: string[];
    medicines: string[];
  };
}

interface UserContextType {
  user: User | null;
  authReady: boolean;
  isAuthenticated: boolean;
  favorites: {
    pharmacies: string[];
    medicines: string[];
  };
  notifications: Notification[];
  login: (email: string, password: string) => Promise<string>;
  register: (input: {
    email: string;
    password?: string;
    full_name: string;
    phone?: string;
    google_id?: string;
  }) => Promise<{ needsEmailConfirmation: boolean; redirectTo: string }>;
  logout: () => Promise<void>;
  establishSession: (accessToken: string, refreshToken: string) => Promise<string>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updatedData: { name: string; phone?: string; avatarUrl?: string | null; email?: string }) => Promise<void>;
  uploadAvatarFile: (file: File) => Promise<string>;
  toggleFavoritePharmacy: (id: string) => void;
  toggleFavoriteMedicine: (name: string) => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  clearNotifications: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function profileToUser(profile: ApiUserProfile): User {
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? null,
    role: mapBackendRole(profile.role),
    avatarUrl: profile.avatar_url,
    favorites: profile.favorites || { pharmacies: [], medicines: [] },
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [favorites, setFavorites] = useState<{ pharmacies: string[]; medicines: string[] }>({
    pharmacies: [],
    medicines: [],
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchMe();
    setUser(profileToUser(profile));
  }, []);

  const fetchNotifications = useCallback(async (userRole?: "user" | "pharmacy" | "admin") => {
    // Skip if there is no access token — avoids 401 errors when logged out
    if (!getAccessToken()) return;
    try {
      // apiRequest already unwraps body.data, so we receive { data: [...], meta, unread_count }
      const res = await apiRequest<any>("/api/v1/notifications", {
        method: "GET",
        auth: true,
      });
      // Handle both flat array and paginated { data: [...] } shapes
      const rawNotifications: any[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.notifications)
        ? res.notifications
        : [];
      const parsed = rawNotifications.map((n: any) => ({
        id: n._id || n.id || Math.random().toString(36).substr(2, 9),
        type: n.type || "system",
        title: n.title || "Notification",
        message: n.body || n.message || "",
        timestamp: n.created_at ? new Date(n.created_at) : new Date(),
        // Trust the backend's is_read field
        isRead: !!(n.is_read ?? n.isRead ?? false),
        link: (() => {
          if (userRole === "admin") {
            if (n.type === "complaint_update" || n.type === "new_complaint" || n.type?.includes("complaint")) {
              const cId = n.data?.complaint_id || n.data?.id || n._id || "";
              return `/admin/complaints?id=${cId}`;
            }
            if (n.type === "new_pharmacy_request" || n.type === "pharmacy_registered") {
              const pId = n.data?.pharmacy_id || n.data?.id || n._id || "";
              return `/admin/pharmacy-management?tab=requests&request_id=${pId}`;
            }
            if (n.type === "pharmacy_approved" || n.type === "pharmacy_rejected" || n.type === "pharmacy_rated" || n.type?.startsWith("pharmacy_")) {
              const pId = n.data?.pharmacy_id || n.data?.id || n._id || "";
              return `/admin/pharmacy-management?partner_id=${pId}`;
            }
            return "/admin";
          }

          if (n.link) return n.link;
          if (n.data?.link) return n.data.link;
          if (n.type === "complaint_update" || n.type === "complaint_priority_assigned") return "/favorites/complaint";
          if (n.type === "new_complaint") return "/admin/complaints";
          if (n.type === "pharmacy_approved" || n.type === "pharmacy_rejected") return "/favorites/register";
          if (n.type === "new_pharmacy_request" || n.type === "pharmacy_registered") return "/admin/pharmacy-management?tab=requests";
          if (n.type === "pharmacy_rated") return "/admin/pharmacy-management";
          if (n.data?.order_id) return `/account?tab=history&order_id=${n.data.order_id}`;
          if (n.data?.pharmacy_id && n.type?.startsWith("pharmacy_")) return "/favorites/register";
          return undefined;
        })(),
        data: n.data || null,
      }));

      // Merge: preserve local `isRead=true` — once read, never unread again
      setNotifications((prev) => {
        const localReadIds = new Set(prev.filter((p) => p.isRead).map((p) => p.id));
        return parsed.map((n) => ({
          ...n,
          isRead: n.isRead || localReadIds.has(n.id),
        }));
      });
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!getAccessToken()) {
        setNotifications([
          {
            id: "mock-1",
            type: "appointment",
            title: "Welcome to MedPay!",
            message: "Find the best pharmacies and medicines near you. Check your favorites to get started.",
            timestamp: new Date(),
            isRead: false,
          },
          {
            id: "mock-2",
            type: "order",
            title: "Ready for Pickup",
            message: "Your medicine order at Red Cross Pharmacy is ready for pickup.",
            timestamp: new Date(Date.now() - 3600000),
            isRead: false,
          },
        ]);
        setAuthReady(true);
        return;
      }

      try {
        const profile = await fetchMe();
        const mapped = profileToUser(profile);
        setUser(mapped);
        if (mapped.favorites) {
          setFavorites(mapped.favorites);
        }
        await fetchNotifications(mapped.role);
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    void bootstrap();
  }, [fetchNotifications]);

  useEffect(() => {
    // Only poll when user is authenticated AND a token is present
    if (!user || !getAccessToken()) return;
    const interval = setInterval(() => {
      if (getAccessToken()) fetchNotifications(user.role);
    }, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const login = async (email: string, password: string): Promise<string> => {
    const result = await loginWithEmail(email, password);
    const mapped = profileToUser(result.user);
    setUser(mapped);
    if (mapped.favorites) {
      setFavorites(mapped.favorites);
    }
    await fetchNotifications(mapped.role);
    return homePathForRole(mapped.role);
  };

  const register = async (input: {
    email: string;
    password?: string;
    full_name: string;
    phone?: string;
    google_id?: string;
  }) => {
    const result = await registerAccount(input);

    if (result.session && result.user) {
      const mapped: User = {
        id: result.user.id,
        name: result.user.full_name,
        email: result.user.email,
        role: mapBackendRole(result.user.role),
        favorites: { pharmacies: [], medicines: [] },
      };
      setUser(mapped);
      setFavorites({ pharmacies: [], medicines: [] });
      await fetchNotifications(mapped.role);
      return {
        needsEmailConfirmation: false,
        redirectTo: homePathForRole(mapped.role),
      };
    }

    return {
      needsEmailConfirmation: result.email_confirmation_required,
      redirectTo: "/login",
    };
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    setFavorites({ pharmacies: [], medicines: [] });
    setNotifications([]);
  };

  const updateProfile = async (updatedData: { name: string; phone?: string; avatarUrl?: string | null; email?: string }) => {
    if (!user) return;

    setUser(prev => prev ? {
      ...prev,
      name: updatedData.name,
      phone: updatedData.phone ?? prev.phone,
      email: updatedData.email ?? prev.email,
      avatarUrl: updatedData.avatarUrl !== undefined ? updatedData.avatarUrl : prev.avatarUrl,
    } : null);

    await apiRequest<any>("/api/v1/users/me", {
      method: "PUT",
      auth: true,
      body: JSON.stringify({
        full_name: updatedData.name,
        phone: updatedData.phone || undefined,
        avatar_url: updatedData.avatarUrl ?? undefined,
      }),
    });
  };

  const uploadAvatarFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("avatar", file);

    const result = await apiRequest<{ avatar_url: string }>("/api/v1/users/me/avatar", {
      method: "POST",
      auth: true,
      body: formData,
    });

    setUser(prev => prev ? { ...prev, avatarUrl: result.avatar_url } : null);
    return result.avatar_url;
  };

  const establishSession = async (accessToken: string, refreshToken: string) => {
    setTokens(accessToken, refreshToken);
    const profile = await fetchMe(accessToken);
    const mapped = profileToUser(profile);
    setUser(mapped);
    if (mapped.favorites) {
      setFavorites(mapped.favorites);
    }
    await fetchNotifications(mapped.role);
    return homePathForRole(mapped.role);
  };

  const toggleFavoritePharmacy = async (id: string) => {
    setFavorites((prev) => ({
      ...prev,
      pharmacies: prev.pharmacies.includes(id)
        ? prev.pharmacies.filter((fid) => fid !== id)
        : [...prev.pharmacies, id],
    }));

    if (user) {
      try {
        await apiRequest("/api/v1/users/me/favorites", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ type: "pharmacy", id }),
        });
      } catch (e) {
        console.error("Failed to toggle favorite pharmacy in backend", e);
        // Rollback state if it fails
        setFavorites((prev) => ({
          ...prev,
          pharmacies: prev.pharmacies.includes(id)
            ? prev.pharmacies.filter((fid) => fid !== id)
            : [...prev.pharmacies, id],
        }));
      }
    }
  };

  const toggleFavoriteMedicine = async (name: string) => {
    setFavorites((prev) => ({
      ...prev,
      medicines: prev.medicines.includes(name)
        ? prev.medicines.filter((m) => m !== name)
        : [...prev.medicines, name],
    }));

    if (user) {
      try {
        await apiRequest("/api/v1/users/me/favorites", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ type: "medicine", id: name }),
        });
      } catch (e) {
        console.error("Failed to toggle favorite medicine in backend", e);
        // Rollback state if it fails
        setFavorites((prev) => ({
          ...prev,
          medicines: prev.medicines.includes(name)
            ? prev.medicines.filter((m) => m !== name)
            : [...prev.medicines, name],
        }));
      }
    }
  };

  const addNotification = (n: Omit<Notification, "id" | "timestamp" | "isRead">) => {
    const newNotification: Notification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      isRead: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (user) {
      try {
        await apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH", auth: true });
      } catch {
        // Silently ignore — local state is already updated
      }
    }
  };

  const markAllAsRead = async () => {
    // Optimistically mark all as read locally
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (user) {
      try {
        await apiRequest("/api/v1/notifications/read-all", { method: "PATCH", auth: true });
      } catch {
        // Silently ignore — local state already updated
      }
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const dismissNotification = async (id: string) => {
    // Remove from local state immediately
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (user) {
      try {
        await apiRequest(`/api/v1/notifications/${id}`, { method: "DELETE", auth: true });
      } catch {
        // Silently ignore
      }
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        authReady,
        isAuthenticated: Boolean(user),
        favorites,
        notifications,
        login,
        register,
        logout,
        establishSession,
        refreshProfile,
        updateProfile,
        uploadAvatarFile,
        toggleFavoritePharmacy,
        toggleFavoriteMedicine,
        addNotification,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        clearNotifications,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
