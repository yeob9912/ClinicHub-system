export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("medpay_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...getAuthHeader(), ...(opts.headers ?? {}) },
  });
  
  let json: any = {};
  if (res.status !== 204) {
    const text = await res.text();
    if (text) {
      json = JSON.parse(text);
    }
  }
  
  if (!res.ok) throw new Error(json.message ?? "Request failed");
  return json;
}

// ─── Interfaces ───────────────────────────────────────────────────
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  price: number;
  image: string;
  available: boolean;
}

export interface OrderItem {
  _id: string;
  id: string;  // alias for display
  type: "order" | "visit";
  user_id: { full_name: string; phone?: string; avatar_url?: string };
  patient: string;
  items: { name: string; quantity: number; price?: number }[];
  visit_date?: string;
  visit_time?: string;
  notes?: string;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  rejection_reason?: string;
  created_at: string;
  date?: string;
  total?: number;
  comment?: string;
  availableTime?: string;
}

export interface SaleRecord {
  id: string;
  item: string;
  qty: number;
  revenue: number;
  date: string;
  patient: string;
}

export function normaliseInventoryItem(item: any): InventoryItem {
  const med = item.medicine_id ?? {};
  
  let status: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
  if (item.stock_quantity === 0) {
    status = "Out of Stock";
  } else if (item.stock_quantity < (item.low_stock_threshold ?? 15)) {
    status = "Low Stock";
  }

  return {
    id: item._id,
    name: med.name ?? "Unknown Medicine",
    category: med.category === "Analgesics" ? "Pain Relief" : med.category === "Diabetes" ? "Diabetes Care" : med.category ?? "General",
    stock: item.stock_quantity ?? 0,
    status,
    price: item.price ?? 0,
    image: med.image_url ?? "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=60",
    available: item.stock_quantity > 0,
  };
}

export function normaliseSale(order: any): SaleRecord {
  const itemsLabel = order.items?.map((i: any) => `${i.name} (${i.quantity})`).join(", ") ?? "Medicines";
  const revenue = order.items?.reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 1), 0) ?? 0;
  return {
    id: order.id || `SAL-${order._id.substring(18)}`,
    item: itemsLabel,
    qty: order.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) ?? 1,
    revenue: revenue || order.total || 0,
    date: new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    patient: order.patient || order.user_id?.full_name || "Unknown Patient",
  };
}

export function normaliseOrder(order: any): OrderItem {
  // Format items as a comma-separated string if it's an array, for direct display in table
  let itemsStr = "";
  if (Array.isArray(order.items)) {
    itemsStr = order.items.map((i: any) => `${i.name} (${i.quantity})`).join(", ");
  } else if (typeof order.items === "string") {
    itemsStr = order.items;
  }

  let totalNum = 0;
  if (typeof order.total === "number") {
    totalNum = order.total;
  } else if (Array.isArray(order.items)) {
    totalNum = order.items.reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 1), 0);
  }

  let dateStr = "";
  if (order.created_at) {
    dateStr = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } else if (order.date) {
    dateStr = order.date;
  }

  return {
    _id: order._id || "",
    id: order.id || `ORD-${order._id?.substring(18) || ""}`,
    type: order.type || "order",
    user_id: order.user_id || {},
    patient: order.patient || order.user_id?.full_name || "Unknown Patient",
    items: itemsStr as any,
    visit_date: order.visit_date,
    visit_time: order.visit_time,
    notes: order.notes,
    status: order.status || "pending",
    rejection_reason: order.rejection_reason,
    created_at: order.created_at,
    date: dateStr,
    total: totalNum,
    comment: order.staff_comment || order.rejection_reason || order.comment || "",
    availableTime: order.availableTime || (order.visit_date ? `${order.visit_date} ${order.visit_time || ""}` : ""),
  };
}
