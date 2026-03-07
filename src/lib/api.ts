const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

function getHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (includeAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export type AdminUser = {
  _id: string;
  email?: string;
  username?: string;
  phone?: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt?: string;
};

// ——— Admin Auth —————————————————————————————————————————————————────────

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: getHeaders(false),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data as { success: true; token: string; user: AdminUser };
}

export async function adminSignup(email: string, password: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/admin/auth/signup`, {
    method: "POST",
    headers: getHeaders(false),
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Signup failed");
  return data as { success: true; token: string; user: AdminUser };
}

export async function adminMe() {
  const res = await fetch(`${API_BASE}/api/admin/auth/me`, {
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Not authenticated");
  return data as { success: true; user: AdminUser };
}

// ——— User Management —————————————————————————————————───────────────────

export async function fetchUsers(params?: { page?: number; limit?: number; search?: string }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.search != null && params.search.trim()) sp.set("search", params.search.trim());
  const qs = sp.toString();
  const url = `${API_BASE}/api/admin/users${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(true) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch users");
  return data as {
    success: true;
    data: AdminUser[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export async function fetchUser(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}`, { headers: getHeaders(true) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch user");
  return data as { success: true; data: AdminUser };
}

export async function updateUser(
  id: string,
  body: { username?: string; email?: string; role?: "user" | "admin" }
) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update user");
  return data as { success: true; data: AdminUser };
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete user");
  return data;
}
