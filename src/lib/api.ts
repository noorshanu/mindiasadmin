//const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE = "https://api.mindsai.live";

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
  fullName?: string;
  gender?: string;
  occupation?: string;
  dateOfBirth?: string;
  persona?: string;
  role: "user" | "admin";
  isActive?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type ChatSessionMessage = { role: string; content: string; timestamp: string };
export type AdminChatSession = {
  _id: string;
  userId: string;
  title: string;
  messages: ChatSessionMessage[];
  createdAt: string;
  updatedAt: string;
};

// ——— Admin Auth —————————————————————————————————————————————————────────

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: getHeaders(false),
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) throw new Error(data.error || data.message || "Login failed");
  return data as { success: true; token: string; user: AdminUser };
}

export async function adminSignup(email: string, password: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/admin/auth/signup`, {
    method: "POST",
    headers: getHeaders(false),
    body: JSON.stringify({ email, password, name }),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) throw new Error(data.error || data.message || "Signup failed");
  return data as { success: true; token: string; user: AdminUser };
}

export async function adminMe() {
  const res = await fetch(`${API_BASE}/api/admin/auth/me`, {
    headers: getHeaders(true),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) throw new Error(data.error || data.message || "Not authenticated");
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

export async function fetchUserSessions(userId: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/sessions`, { headers: getHeaders(true) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch chat sessions");
  return data as { success: true; data: AdminChatSession[] };
}

export async function fetchUserSupport(userId: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/support`, { headers: getHeaders(true) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch support messages");
  return data as { success: true; data: SupportMessage[] };
}

export async function updateUser(
  id: string,
  body: { username?: string; email?: string; role?: "user" | "admin"; isActive?: boolean }
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

// ——— Content (Vision & Mission) —————————————————————————————————──────────

export type ContentData = { vision: string; mission: string };

export async function fetchContent() {
  const res = await fetch(`${API_BASE}/api/admin/content`, {
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to fetch content");
  return data as { success: true; vision: string; mission: string };
}

export async function updateContent(body: { vision?: string; mission?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/content`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to update content");
  return data as { success: true; vision: string; mission: string };
}

// ——— Social (links + office info) —————————————————————————————————────────

export type SocialSettings = {
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  address?: string;
  businessHours?: string;
};

export async function fetchSocial() {
  const res = await fetch(`${API_BASE}/api/admin/social`, {
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      (data as { message?: string; error?: string }).message ||
        (data as { error?: string }).error ||
        "Failed to fetch social settings",
    );
  return data as { success: true; data: SocialSettings };
}

export async function updateSocial(body: SocialSettings) {
  const res = await fetch(`${API_BASE}/api/admin/social`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      (data as { message?: string; error?: string }).message ||
        (data as { error?: string }).error ||
        "Failed to update social settings",
    );
  return data as { success: true; data: SocialSettings };
}

// ——— Team (Our Team) —————————————————————————————————────────────────────

export type TeamMember = { _id: string; name: string; title: string; imageUrl?: string; order: number };

export async function fetchTeam() {
  const res = await fetch(`${API_BASE}/api/admin/team`, { headers: getHeaders(true) });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to fetch team");
  return data as { success: true; data: TeamMember[] };
}

export async function addTeamMember(body: { name: string; title: string; imageUrl?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/team`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to add team member");
  return data as { success: true; data: TeamMember };
}

export async function updateTeamMember(id: string, body: { name?: string; title?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/team/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to update team member");
  return data as { success: true; data: TeamMember };
}

export async function uploadTeamMemberImage(id: string, file: File) {
  const formData = new FormData();
  formData.append("image", file);
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/admin/team/${id}/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to upload image");
  return data as { success: true; imageUrl: string; data: TeamMember };
}

export async function deleteTeamMember(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/team/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to delete team member");
  return data;
}

// ——— Support Messages —————————————————————————————————───────────────────

export type SupportMessage = {
  _id: string;
  subject: string;
  email: string;
  message: string;
  status: "pending" | "resolved";
  createdAt: string;
  updatedAt?: string;
};

export async function fetchSupportMessages(params?: {
  status?: "pending" | "resolved";
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const url = `${API_BASE}/api/admin/support${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(true) });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to fetch support messages");
  return data as {
    success: true;
    data: SupportMessage[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export async function updateSupportMessageStatus(id: string, status: "pending" | "resolved") {
  const res = await fetch(`${API_BASE}/api/admin/support/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to update");
  return data as { success: true; data: SupportMessage };
}

// ——— Webinar Registrations ————————————————————————————————————————————————

export type WebinarRegistration = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  backgroundType: "working_professional" | "student";
  organizationName?: string;
  field?: string;
  familiarity: "very_familiar" | "somewhat_familiar" | "heard_about_it" | "completely_new";
  topics: string[];
  wantsToTestMindsAi: "yes" | "maybe" | "not_now";
  joinEarlyCommunity: "yes" | "no";
  consentUpdates: boolean;
  packageId: "basic" | "pro" | "premium";
  packageAmountPaise: number;
  message?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt?: string;
};

export async function fetchWebinarRegistrations(params?: {
  page?: number;
  limit?: number;
  search?: string;
  paid?: boolean;
  packageId?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.search != null && params.search.trim()) sp.set("search", params.search.trim());
  if (params?.paid === true) sp.set("paid", "true");
  if (params?.paid === false) sp.set("paid", "false");
  if (params?.packageId != null && params.packageId.trim()) sp.set("packageId", params.packageId.trim());
  const qs = sp.toString();
  const url = `${API_BASE}/api/admin/webinar${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(true) });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      (data as { message?: string; error?: string }).message ||
        (data as { error?: string }).error ||
        "Failed to fetch webinar registrations",
    );
  return data as {
    success: true;
    data: WebinarRegistration[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export async function deleteWebinarRegistration(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/webinar/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      (data as { message?: string; error?: string }).message ||
        (data as { error?: string }).error ||
        "Failed to delete registration",
    );
  return data as { success: true };
}

export type WebinarPackage = {
  id: "basic" | "pro" | "premium";
  name: string;
  amountPaise: number;
  active: boolean;
};

export async function fetchWebinarPackages() {
  const res = await fetch(`${API_BASE}/api/admin/webinar-settings/packages`, {
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      (data as { message?: string; error?: string }).message ||
        (data as { error?: string }).error ||
        "Failed to fetch webinar packages",
    );
  return data as { success: true; currency: string; packages: WebinarPackage[] };
}

export async function updateWebinarPackages(packages: WebinarPackage[]) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-settings/packages`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify({ packages }),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      (data as { message?: string; error?: string }).message ||
        (data as { error?: string }).error ||
        "Failed to update webinar packages",
    );
  return data as { success: true; currency: string; packages: WebinarPackage[] };
}

// ——— FAQ —————————————————————————————————────────────────────────────────

export type FAQItem = { _id: string; question: string; answer: string; order: number };

export async function fetchFaqs() {
  const res = await fetch(`${API_BASE}/api/admin/faq`, { headers: getHeaders(true) });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to fetch FAQs");
  return data as { success: true; data: FAQItem[] };
}

export async function addFaq(body: { question: string; answer: string; order?: number }) {
  const res = await fetch(`${API_BASE}/api/admin/faq`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to add FAQ");
  return data as { success: true; data: FAQItem };
}

export async function updateFaq(id: string, body: { question?: string; answer?: string; order?: number }) {
  const res = await fetch(`${API_BASE}/api/admin/faq/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to update FAQ");
  return data as { success: true; data: FAQItem };
}

export async function deleteFaq(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/faq/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to delete FAQ");
  return data;
}
