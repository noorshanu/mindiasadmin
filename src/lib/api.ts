//const API_BASE ="http://localhost:4000";
const API_BASE = "https://api.mindsai.live";

/**
 * API wraps JSON as `{ success, message, data }`. Nested objects are merged up; arrays stay under `data`.
 */
function unwrapBackendSuccess(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return raw as Record<string, unknown>;
  const o = raw as { success?: boolean; data?: unknown } & Record<string, unknown>;
  if (o.success !== true || o.data === null || o.data === undefined) {
    return o as Record<string, unknown>;
  }
  if (Array.isArray(o.data)) {
    return o as Record<string, unknown>;
  }
  if (typeof o.data === "object") {
    return { ...o, ...(o.data as Record<string, unknown>) } as Record<string, unknown>;
  }
  return o as Record<string, unknown>;
}

function throwIfFailed(res: Response, raw: unknown): void {
  if (res.ok) return;
  const o = raw as { message?: string; error?: string };
  throw new Error(o.message || o.error || `Request failed (${res.status})`);
}

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function readPaginatedRows(flat: Record<string, unknown>): {
  rows: unknown[];
  pagination: PaginationMeta;
} {
  const rows = Array.isArray(flat.items)
    ? flat.items
    : Array.isArray(flat.data)
      ? flat.data
      : [];
  const pagination = flat.pagination as PaginationMeta | undefined;
  if (!pagination) {
    throw new Error("Invalid API response: missing pagination");
  }
  return { rows, pagination };
}

function readArrayData(flat: Record<string, unknown>): unknown[] {
  if (Array.isArray(flat.items)) return flat.items;
  if (Array.isArray(flat.data)) return flat.data;
  return [];
}

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
  const raw = await res.json();
  if (!res.ok) {
    const err = raw as { message?: string; error?: string };
    throw new Error(err.message || err.error || "Login failed");
  }
  const flat = unwrapBackendSuccess(raw);
  if (!flat.token || !flat.user) {
    throw new Error("Invalid login response from server");
  }
  return {
    success: true as const,
    token: flat.token as string,
    user: flat.user as AdminUser,
  };
}

export async function adminSignup(email: string, password: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/admin/auth/signup`, {
    method: "POST",
    headers: getHeaders(false),
    body: JSON.stringify({ email, password, name }),
  });
  const raw = await res.json();
  if (!res.ok) {
    const err = raw as { message?: string; error?: string };
    throw new Error(err.message || err.error || "Signup failed");
  }
  const flat = unwrapBackendSuccess(raw);
  if (!flat.token || !flat.user) {
    throw new Error("Invalid signup response from server");
  }
  return {
    success: true as const,
    token: flat.token as string,
    user: flat.user as AdminUser,
  };
}

export async function adminMe() {
  const res = await fetch(`${API_BASE}/api/admin/auth/me`, {
    headers: getHeaders(true),
  });
  const raw = await res.json();
  if (!res.ok) {
    const err = raw as { message?: string; error?: string };
    throw new Error(err.message || err.error || "Not authenticated");
  }
  const flat = unwrapBackendSuccess(raw);
  if (!flat.user) {
    throw new Error("Invalid /me response from server");
  }
  return { success: true as const, user: flat.user as AdminUser };
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
  const raw = await res.json();
  throwIfFailed(res, raw);
  const { rows, pagination } = readPaginatedRows(unwrapBackendSuccess(raw));
  return {
    success: true as const,
    data: rows as AdminUser[],
    pagination,
  };
}

export async function fetchUser(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}`, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const user = flat.data as AdminUser;
  if (!user) throw new Error("Failed to fetch user");
  return { success: true as const, data: user };
}

export async function fetchUserSessions(userId: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/sessions`, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const sessions = readArrayData(unwrapBackendSuccess(raw)) as AdminChatSession[];
  return { success: true as const, data: sessions };
}

export async function fetchUserSupport(userId: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/support`, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const messages = readArrayData(unwrapBackendSuccess(raw)) as SupportMessage[];
  return { success: true as const, data: messages };
}

export type MoodLogRow = {
  _id: string;
  dateKey: string;
  period: "morning" | "afternoon" | "evening";
  mood: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchUserMoodLogs(userId: string, params?: { limit?: number }) {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const url = `${API_BASE}/api/admin/users/${userId}/mood-logs${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const rows = Array.isArray(flat.data) ? (flat.data as MoodLogRow[]) : [];
  return { success: true as const, data: rows };
}

export type UserJournalEntryRow = {
  _id: string;
  mood: string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchUserJournalEntries(userId: string, params?: { limit?: number }) {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const url = `${API_BASE}/api/admin/users/${userId}/journal-entries${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const rows = Array.isArray(flat.data) ? (flat.data as UserJournalEntryRow[]) : [];
  return { success: true as const, data: rows };
}


export type UserActivityHistoryRow = {
  _id: string;
  activityType: string;
  title: string;
  durationSec?: number | null;
  completed: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchUserActivityHistory(userId: string, params?: { limit?: number }) {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const url = `${API_BASE}/api/admin/users/${userId}/activity-history${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const rows = Array.isArray(flat.data) ? (flat.data as UserActivityHistoryRow[]) : [];
  return { success: true as const, data: rows };
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
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const user = flat.data as AdminUser;
  if (!user) throw new Error("Failed to update user");
  return { success: true as const, data: user };
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  return unwrapBackendSuccess(raw);
}

// ——— Content (Vision & Mission) —————————————————————————————————────────——

export type ContentData = { vision: string; mission: string };

export type HomeHeroSlide = {
  _id: string;
  imageUrl: string;
  alt: string;
  order: number;
};

function parseHomeHeroSlides(raw: unknown): HomeHeroSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const _id = o["_id"];
      const imageUrl = o["imageUrl"];
      if (typeof _id !== "string" || typeof imageUrl !== "string") return null;
      return {
        _id,
        imageUrl,
        alt: typeof o["alt"] === "string" ? o["alt"] : "",
        order: typeof o["order"] === "number" ? o["order"] : 0,
      };
    })
    .filter((x): x is HomeHeroSlide => x != null)
    .sort((a, b) => a.order - b.order);
}

export async function fetchContent() {
  const res = await fetch(`${API_BASE}/api/admin/content`, {
    headers: getHeaders(true),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    vision: String(flat.vision ?? ""),
    mission: String(flat.mission ?? ""),
    thought: String(flat.thought ?? ""),
    homeHeroSlides: parseHomeHeroSlides(flat.homeHeroSlides),
  };
}

export async function updateContent(body: {
  vision?: string;
  mission?: string;
  thought?: string;
}) {
  const res = await fetch(`${API_BASE}/api/admin/content`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    vision: String(flat.vision ?? ""),
    mission: String(flat.mission ?? ""),
    thought: String(flat.thought ?? ""),
    homeHeroSlides: parseHomeHeroSlides(flat.homeHeroSlides),
  };
}

/** Multipart field `image`; optional `alt` text field. */
export async function uploadHomeHeroSlide(file: File, alt?: string) {
  const formData = new FormData();
  formData.append("image", file);
  if (alt != null && alt.trim()) formData.append("alt", alt.trim());
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/admin/content/home-hero-slide`, {
    method: "POST",
    headers,
    body: formData,
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    homeHeroSlides: parseHomeHeroSlides(flat.homeHeroSlides),
    slide: (() => {
      const s = flat.slide;
      if (!s || typeof s !== "object") return null;
      const o = s as Record<string, unknown>;
      const _id = o["_id"];
      const imageUrl = o["imageUrl"];
      if (typeof _id !== "string" || typeof imageUrl !== "string") return null;
      return {
        _id,
        imageUrl,
        alt: typeof o["alt"] === "string" ? o["alt"] : "",
        order: typeof o["order"] === "number" ? o["order"] : 0,
      } satisfies HomeHeroSlide;
    })(),
  };
}

export async function deleteHomeHeroSlide(slideId: string) {
  const res = await fetch(
    `${API_BASE}/api/admin/content/home-hero-slide/${encodeURIComponent(slideId)}`,
    {
      method: "DELETE",
      headers: getHeaders(true),
    },
  );
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    homeHeroSlides: parseHomeHeroSlides(flat.homeHeroSlides),
  };
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
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const data = (flat.data as SocialSettings) ?? {
    facebookUrl: String(flat.facebookUrl ?? ""),
    twitterUrl: String(flat.twitterUrl ?? ""),
    instagramUrl: String(flat.instagramUrl ?? ""),
    linkedinUrl: String(flat.linkedinUrl ?? ""),
    address: String(flat.address ?? ""),
    businessHours: String(flat.businessHours ?? ""),
  };
  return { success: true as const, data };
}

export async function updateSocial(body: SocialSettings) {
  const res = await fetch(`${API_BASE}/api/admin/social`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const data = (flat.data as SocialSettings) ?? {
    facebookUrl: String(flat.facebookUrl ?? ""),
    twitterUrl: String(flat.twitterUrl ?? ""),
    instagramUrl: String(flat.instagramUrl ?? ""),
    linkedinUrl: String(flat.linkedinUrl ?? ""),
    address: String(flat.address ?? ""),
    businessHours: String(flat.businessHours ?? ""),
  };
  return { success: true as const, data };
}

// ——— Team (Our Team) —————————————————————————————————────────────────────

export type TeamMember = { _id: string; name: string; title: string; imageUrl?: string; order: number };

export async function fetchTeam() {
  const res = await fetch(`${API_BASE}/api/admin/team`, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const list = readArrayData(unwrapBackendSuccess(raw)) as TeamMember[];
  return { success: true as const, data: list };
}

export async function addTeamMember(body: { name: string; title: string; imageUrl?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/team`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const member = flat.data as TeamMember;
  if (!member) throw new Error("Failed to add team member");
  return { success: true as const, data: member };
}

export async function updateTeamMember(id: string, body: { name?: string; title?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/team/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const member = flat.data as TeamMember;
  if (!member) throw new Error("Failed to update team member");
  return { success: true as const, data: member };
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
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const member = flat.data as TeamMember;
  if (!member || !flat.imageUrl) throw new Error("Failed to upload image");
  return {
    success: true as const,
    imageUrl: flat.imageUrl as string,
    data: member,
  };
}

export async function deleteTeamMember(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/team/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  return unwrapBackendSuccess(raw);
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
  const raw = await res.json();
  throwIfFailed(res, raw);
  const { rows, pagination } = readPaginatedRows(unwrapBackendSuccess(raw));
  return {
    success: true as const,
    data: rows as SupportMessage[],
    pagination,
  };
}

export async function updateSupportMessageStatus(id: string, status: "pending" | "resolved") {
  const res = await fetch(`${API_BASE}/api/admin/support/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify({ status }),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const doc = flat.data as SupportMessage;
  if (!doc) throw new Error("Failed to update");
  return { success: true as const, data: doc };
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
  couponCode?: string;
  packageAmountPaise: number;
  packageOriginalAmountPaise?: number;
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
  const raw = await res.json();
  throwIfFailed(res, raw);
  const { rows, pagination } = readPaginatedRows(unwrapBackendSuccess(raw));
  return {
    success: true as const,
    data: rows as WebinarRegistration[],
    pagination,
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

export type WebinarCoupon = {
  code: string;
  active: boolean;
  amountPaiseByPackage: Partial<Record<"basic" | "pro" | "premium", number>>;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string | null;
};

export async function fetchWebinarCoupons() {
  const res = await fetch(`${API_BASE}/api/admin/webinar-coupons`, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const coupons = (flat.coupons ?? flat.data) as WebinarCoupon[];
  if (!Array.isArray(coupons)) throw new Error("Failed to fetch webinar coupons");
  return { success: true as const, coupons };
}

export async function upsertWebinarCoupon(body: {
  code: string;
  active: boolean;
  amountPaiseByPackage: Partial<Record<"basic" | "pro" | "premium", number>>;
  maxUses?: number;
  expiresAt?: string | null;
}) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-coupons`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const coupon = flat.coupon as WebinarCoupon;
  if (!coupon) throw new Error("Failed to save webinar coupon");
  return { success: true as const, coupon };
}

export async function deleteWebinarCoupon(code: string) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-coupons/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || "Failed to delete webinar coupon");
  return data as { success: true };
}

export async function fetchWebinarPackages() {
  const res = await fetch(`${API_BASE}/api/admin/webinar-settings/packages`, {
    headers: getHeaders(true),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    currency: String(flat.currency ?? "INR"),
    packages: flat.packages as WebinarPackage[],
  };
}

export async function updateWebinarPackages(packages: WebinarPackage[]) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-settings/packages`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify({ packages }),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    currency: String(flat.currency ?? "INR"),
    packages: flat.packages as WebinarPackage[],
  };
}

// ——— FAQ —————————————————————————————————────────────────────────────────

export type FAQItem = { _id: string; question: string; answer: string; order: number };

export async function fetchFaqs() {
  const res = await fetch(`${API_BASE}/api/admin/faq`, { headers: getHeaders(true) });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const list = readArrayData(unwrapBackendSuccess(raw)) as FAQItem[];
  return { success: true as const, data: list };
}

export async function addFaq(body: { question: string; answer: string; order?: number }) {
  const res = await fetch(`${API_BASE}/api/admin/faq`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const doc = flat.data as FAQItem;
  if (!doc) throw new Error("Failed to add FAQ");
  return { success: true as const, data: doc };
}

export async function updateFaq(id: string, body: { question?: string; answer?: string; order?: number }) {
  const res = await fetch(`${API_BASE}/api/admin/faq/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const doc = flat.data as FAQItem;
  if (!doc) throw new Error("Failed to update FAQ");
  return { success: true as const, data: doc };
}

export async function deleteFaq(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/faq/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  return unwrapBackendSuccess(raw);
}

// ——— Push notifications (FCM) ————————————————————————————————————————————

/** One admin “send to all” action (not per-recipient). */
export type PushBroadcastRow = {
  _id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sentByAdminId: string;
  targeted: number;
  sent: number;
  failed: number;
  skipped: number;
  createdAt: string;
  updatedAt?: string;
};

export async function sendAdminPush(body: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const res = await fetch(`${API_BASE}/api/admin/notifications/send`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const summary = flat.data as
    | { targeted: number; sent: number; failed: number; skipped: number }
    | undefined;
  const out = summary ?? {
    targeted: Number(flat.targeted),
    sent: Number(flat.sent),
    failed: Number(flat.failed),
    skipped: Number(flat.skipped),
  };
  if (Number.isNaN(out.targeted)) {
    throw new Error("Invalid push send response");
  }
  return out;
}

export async function fetchAdminNotifications(params?: { page?: number; limit?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const res = await fetch(`${API_BASE}/api/admin/notifications${qs ? `?${qs}` : ""}`, {
    headers: getHeaders(true),
  });
  const raw = await res.json();
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const broadcasts = flat.broadcasts as PushBroadcastRow[] | undefined;
  const pagination = flat.pagination as PaginationMeta | undefined;
  if (!broadcasts || !pagination) {
    throw new Error("Invalid broadcast history response");
  }
  return { broadcasts, pagination };
}
