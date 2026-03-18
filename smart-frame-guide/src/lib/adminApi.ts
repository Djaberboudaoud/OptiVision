/**
 * Admin API client — handles JWT auth and all admin endpoints.
 * Backend at http://localhost:8001
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001";
const TOKEN_KEY = "djaber_admin_token";

// ─── Token helpers ──────────────────────────────────────────
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
    return !!getToken();
}

// ─── Fetch wrapper (JSON) ───────────────────────────────────
async function apiFetch(path: string, options: RequestInit = {}) {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
        clearToken();
        window.location.href = "/DjAbEr/login";
        throw new Error("Session expired");
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || `Error ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
}

// ─── Multipart fetch (for file uploads) ─────────────────────
async function apiFormFetch(path: string, formData: FormData, method = "POST") {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    // Do NOT set Content-Type — browser sets it with boundary for multipart

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: formData,
    });

    if (res.status === 401) {
        clearToken();
        window.location.href = "/DjAbEr/login";
        throw new Error("Session expired");
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || `Error ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
}

// ─── Auth ───────────────────────────────────────────────────
export async function login(username: string, password: string) {
    const data = await apiFetch("/DjAbEr/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
    });
    setToken(data.access_token);
    return data;
}

export function logout() {
    clearToken();
    window.location.href = "/DjAbEr/login";
}

// ─── Glasses ────────────────────────────────────────────────
export interface GlassesItem {
    id: number;
    glasses_name: string;
    brand: string | null;
    frame_type: string;
    material: string | null;
    lens_color: string | null;
    frame_color: string | null;
    gender: string | null;
    anti_blue_light: boolean;
    purchase_price: number;
    selling_price: number;
    quantity: number;
    image_path: string | null;
    model_path: string | null;
    frame_shape: string | null;
    created_at: string;
    san_glasses: boolean;
    anti_fracture: boolean;
}

export async function fetchGlasses(): Promise<{ glasses: GlassesItem[]; total: number }> {
    return apiFetch("/api/glasses");
}

export async function createGlasses(data: Record<string, any>, photo?: File, model3d?: File) {
    const fd = new FormData();
    // Append all text fields
    for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== "") {
            fd.append(key, String(value));
        }
    }
    if (photo) fd.append("photo", photo);
    if (model3d) fd.append("model_3d", model3d);

    return apiFormFetch("/api/glasses", fd, "POST");
}

export async function updateGlasses(id: number, data: Record<string, any>, photo?: File, model3d?: File) {
    const fd = new FormData();
    for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== "") {
            fd.append(key, String(value));
        }
    }
    if (photo) fd.append("photo", photo);
    if (model3d) fd.append("model_3d", model3d);

    return apiFormFetch(`/api/glasses/${id}`, fd, "PUT");
}

export async function deleteGlasses(id: number) {
    return apiFetch(`/api/glasses/${id}`, { method: "DELETE" });
}

/** Get full URL for a glasses photo */
export function getPhotoUrl(imagePath: string | null): string | null {
    if (!imagePath) return null;
    return `${API_BASE}/glasses_photos/${imagePath}`;
}

/** Get full URL for a glasses 3D model */
export function getModelUrl(modelPath: string | null): string | null {
    if (!modelPath) return null;
    return `${API_BASE}/glasses_models/${modelPath}`;
}

// ─── Orders ─────────────────────────────────────────────────
export interface OrderItem {
    id: number;
    glasses_id: number;
    quantity: number;
}

export interface Order {
    id: number;
    client_id: number;
    total_price: number;
    order_status: string;
    created_at: string;
    items: OrderItem[];
    client_name: string | null;
}

export async function fetchOrders(): Promise<Order[]> {
    return apiFetch("/api/orders");
}

// ─── Notifications ──────────────────────────────────────────
export interface Notification {
    id: number;
    message: string;
    is_read: boolean;
    created_at: string;
}

export async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
    const query = unreadOnly ? "?unread=true" : "";
    return apiFetch(`/api/notifications${query}`);
}

export async function markNotificationRead(id: number): Promise<Notification> {
    return apiFetch(`/api/notifications/${id}/read`, { method: "PUT" });
}
