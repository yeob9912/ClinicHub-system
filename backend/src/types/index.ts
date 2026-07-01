// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  error?: string;
  details?: ValidationError[];
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ─── Pagination Query ─────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ─── Request Extension ────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      validated?: {
        body?: Record<string, unknown>;
        params?: Record<string, unknown>;
        query?: Record<string, unknown>;
      };
    }
  }
}

// ─── Admin Types ──────────────────────────────────────────────────────────────

export interface AdminStats {
  users: {
    total: number;
    new_this_period: number;
    by_role: Record<string, number>;
  };
  pharmacies: {
    total: number;
    pending: number;
    approved: number;
    suspended: number;
  };
  medicines: {
    total: number;
    categories: number;
  };
  inventory: {
    total_items: number;
    in_stock_count: number;
  };
  searches: {
    total_this_period: number;
  };
  notifications: {
    sent_this_period: number;
  };
}

export interface ActivityItem {
  type: 'user_registered' | 'pharmacy_registered' | 'inventory_update' | 'medicine_added';
  actor: string;
  target: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}
