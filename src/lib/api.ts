/** Live API by default. Override only if you need a different backend. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://api.mindsai.live")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

export const ADMIN_SIGNUP_ENABLED = import.meta.env.VITE_ENABLE_ADMIN_SIGNUP === "true";

const ADMIN_SIGNUP_SECRET = (import.meta.env.VITE_ADMIN_SIGNUP_SECRET || "").trim();

let onUnauthorized: (() => void) | null = null;

/** Register a handler for expired/invalid admin sessions (401 on authenticated routes). */
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function readApiResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("<")) {
    if (res.status === 413) {
      throw new Error(
        "Image is too large for the server. Use a smaller file (under 5MB) or compress the image.",
      );
    }
    throw new Error(
      `Server returned HTML instead of JSON (HTTP ${res.status}). Check VITE_API_BASE_URL — it must be your API host (e.g. https://api.mindsai.live), not the admin website URL.`,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid JSON from server (HTTP ${res.status}): ${text.slice(0, 160)}`);
  }
}

/** Shrink large photos before multipart upload (avoids nginx 413 HTML errors). */
async function compressImageForUpload(file: File, maxWidth = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 900_000) return file;
  if (typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function postMultipart(
  path: string,
  file: File,
  extraFields?: Record<string, string>,
): Promise<{ res: Response; raw: Record<string, unknown> }> {
  const prepared = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append("image", prepared);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      if (value.trim()) formData.append(key, value.trim());
    }
  }
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  const raw = (await readApiResponse(res)) as Record<string, unknown>;
  throwIfFailed(res, raw);
  return { res, raw };
}

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

async function parseJsonResponse(res: Response): Promise<unknown> {
  const raw = await readApiResponse(res);
  if (res.status === 401 && getToken() && onUnauthorized) {
    try {
      const path = new URL(res.url).pathname;
      if (!path.endsWith("/login") && !path.endsWith("/signup")) {
        onUnauthorized();
      }
    } catch {
      onUnauthorized();
    }
  }
  throwIfFailed(res, raw);
  return raw;
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
  adminRole?: "super_admin" | "admin" | "content_manager" | "user_manager" | "webinar_manager" | "support_manager" | "custom";
  permissions?: string[];
  canAddUsers?: boolean;
  isActive?: boolean;
  chatRestricted?: boolean;
  chatRestrictedAt?: string;
  chatRestrictedReason?: string;
  moderationFlagCount?: number;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type ModerationEventStatus = "open" | "reviewed" | "dismissed";

export type ModerationEvent = {
  _id: string;
  userId:
    | string
    | {
        _id: string;
        username?: string;
        email?: string;
        phone?: string;
        chatRestricted?: boolean;
        moderationFlagCount?: number;
        isActive?: boolean;
      };
  sessionId?: string;
  messageExcerpt: string;
  category: string;
  severity: "high" | "critical";
  matchedSignals?: string[];
  actionTaken: "flagged" | "chat_restricted";
  status: ModerationEventStatus;
  adminNote?: string;
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
  const raw = await parseJsonResponse(res);
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

export async function adminSignup(email: string, password: string, name?: string, signupSecret?: string) {
  const headers = getHeaders(false) as Record<string, string>;
  const secret = (signupSecret || ADMIN_SIGNUP_SECRET).trim();
  if (secret) headers["x-admin-signup-secret"] = secret;

  const res = await fetch(`${API_BASE}/api/admin/auth/signup`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, name }),
  });
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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

export async function fetchUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  chatRestricted?: boolean;
}) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.search != null && params.search.trim()) sp.set("search", params.search.trim());
  if (params?.chatRestricted === true) sp.set("chatRestricted", "true");
  if (params?.chatRestricted === false) sp.set("chatRestricted", "false");
  const qs = sp.toString();
  const url = `${API_BASE}/api/admin/users${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const user = flat.data as AdminUser;
  if (!user) throw new Error("Failed to fetch user");
  return { success: true as const, data: user };
}

export async function fetchUserSessions(userId: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/sessions`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const sessions = readArrayData(unwrapBackendSuccess(raw)) as AdminChatSession[];
  return { success: true as const, data: sessions };
}

export async function fetchUserSupport(userId: string) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/support`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const rows = Array.isArray(flat.data) ? (flat.data as UserActivityHistoryRow[]) : [];
  return { success: true as const, data: rows };
}

export async function updateUser(
  id: string,
  body: {
    username?: string;
    email?: string;
    role?: "user" | "admin";
    isActive?: boolean;
    chatRestricted?: boolean;
    chatRestrictedReason?: string;
  }
) {
  const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  return unwrapBackendSuccess(raw);
}

export async function fetchRestrictedUsers() {
  const res = await fetch(`${API_BASE}/api/admin/moderation/restricted-users`, {
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const users = readArrayData(unwrapBackendSuccess(raw)) as AdminUser[];
  return { success: true as const, data: users };
}

export async function fetchModerationEvents(params?: {
  page?: number;
  limit?: number;
  status?: ModerationEventStatus | "";
}) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.status) sp.set("status", params.status);
  const qs = sp.toString();
  const res = await fetch(
    `${API_BASE}/api/admin/moderation${qs ? `?${qs}` : ""}`,
    { headers: getHeaders(true) },
  );
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const { rows, pagination } = readPaginatedRows(unwrapBackendSuccess(raw));
  return {
    success: true as const,
    data: rows as ModerationEvent[],
    pagination,
  };
}

export async function unrestrictUserChat(userId: string, note?: string) {
  const res = await fetch(
    `${API_BASE}/api/admin/moderation/users/${userId}/unrestrict`,
    {
      method: "PATCH",
      headers: getHeaders(true),
      body: JSON.stringify(note ? { note } : {}),
    },
  );
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const user = (flat.data || flat) as AdminUser;
  if (!user || typeof user !== "object" || !("_id" in user)) {
    throw new Error("Failed to unrestrict user");
  }
  return { success: true as const, data: user };
}

export async function updateModerationEvent(
  id: string,
  body: { status: ModerationEventStatus; adminNote?: string },
) {
  const res = await fetch(`${API_BASE}/api/admin/moderation/${id}`, {
    method: "PATCH",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const event = flat.data as ModerationEvent;
  if (!event) throw new Error("Failed to update moderation event");
  return { success: true as const, data: event };
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
  const list = (() => {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const nested = (raw as Record<string, unknown>).homeHeroSlides;
      if (Array.isArray(nested)) return nested;
    }
    return [];
  })();

  return list
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const imageUrl = o["imageUrl"];
      if (typeof imageUrl !== "string" || !imageUrl.trim()) return null;
      const _id = o["_id"] != null ? String(o["_id"]) : "";
      if (!_id) return null;
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

function pickHomeHeroSlides(flat: Record<string, unknown>): HomeHeroSlide[] {
  const direct = parseHomeHeroSlides(flat.homeHeroSlides);
  if (direct.length > 0) return direct;
  const data = flat.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return parseHomeHeroSlides((data as Record<string, unknown>).homeHeroSlides);
  }
  return [];
}

export async function fetchContent() {
  const res = await fetch(`${API_BASE}/api/admin/content`, {
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    vision: String(flat.vision ?? ""),
    mission: String(flat.mission ?? ""),
    thought: String(flat.thought ?? ""),
    homeHeroSlides: pickHomeHeroSlides(flat),
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
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    vision: String(flat.vision ?? ""),
    mission: String(flat.mission ?? ""),
    thought: String(flat.thought ?? ""),
    homeHeroSlides: pickHomeHeroSlides(flat),
  };
}

/** Multipart field `image`; optional `alt` text field. */
export async function uploadHomeHeroSlide(file: File, alt?: string) {
  const { raw } = await postMultipart("/api/admin/content/home-hero-slide", file, {
    alt: alt ?? "",
  });
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    homeHeroSlides: pickHomeHeroSlides(flat),
    slide: (() => {
      const s = flat.slide;
      if (!s || typeof s !== "object") return null;
      const o = s as Record<string, unknown>;
      const imageUrl = o["imageUrl"];
      if (typeof imageUrl !== "string" || !imageUrl.trim()) return null;
      const _id = o["_id"] != null ? String(o["_id"]) : "";
      if (!_id) return null;
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
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    homeHeroSlides: pickHomeHeroSlides(flat),
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const member = flat.data as TeamMember;
  if (!member) throw new Error("Failed to update team member");
  return { success: true as const, data: member };
}

export async function uploadTeamMemberImage(id: string, file: File) {
  const { raw } = await postMultipart(`/api/admin/team/${id}/upload`, file);
  const flat = unwrapBackendSuccess(raw);
  const member = (flat.data ?? flat.item ?? flat) as TeamMember;
  if (!member || typeof member !== "object" || !("_id" in member)) {
    throw new Error("Failed to upload image");
  }
  return {
    success: true as const,
    imageUrl: String(flat.imageUrl ?? (member as TeamMember).imageUrl ?? ""),
    data: member,
  };
}

export async function deleteTeamMember(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/team/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  return unwrapBackendSuccess(raw);
}

export async function reorderTeam(orderedIds: string[]) {
  const res = await fetch(`${API_BASE}/api/admin/team/reorder`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify({ orderedIds }),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const list = readArrayData(unwrapBackendSuccess(raw)) as TeamMember[];
  return { success: true as const, data: list };
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  eventKey?: string;
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
  eventKey?: string;
  couponCode?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.search != null && params.search.trim()) sp.set("search", params.search.trim());
  if (params?.paid === true) sp.set("paid", "true");
  if (params?.paid === false) sp.set("paid", "false");
  if (params?.packageId != null && params.packageId.trim()) sp.set("packageId", params.packageId.trim());
  if (params?.eventKey != null && params.eventKey.trim()) sp.set("eventKey", params.eventKey.trim());
  if (params?.couponCode != null && params.couponCode.trim()) sp.set("couponCode", params.couponCode.trim());
  const qs = sp.toString();
  const url = `${API_BASE}/api/admin/webinar${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
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
  const data = (await parseJsonResponse(res)) as { success?: boolean; message?: string; error?: string };
  return data as { success: true };
}

export type WebinarPackage = {
  id: "basic" | "pro" | "premium";
  name: string;
  amountPaise: number;
  active: boolean;
};

export type WebinarEventSettings = {
  currentEventKey: string;
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const data = (await parseJsonResponse(res)) as { success?: boolean };
  return data as { success: true };
}

export async function fetchWebinarPackages() {
  const res = await fetch(`${API_BASE}/api/admin/webinar-settings/packages`, {
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    currency: String(flat.currency ?? "INR"),
    packages: flat.packages as WebinarPackage[],
  };
}

export async function fetchWebinarEventSettings() {
  const res = await fetch(`${API_BASE}/api/admin/webinar-settings/event`, {
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    currentEventKey: String(flat.currentEventKey ?? ""),
  };
}

export async function updateWebinarEventSettings(body: WebinarEventSettings) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-settings/event`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    currentEventKey: String(flat.currentEventKey ?? ""),
  };
}

// ——— Webinar Events (Webinar 1 / 2 / 3 cards) ——————————————————————————————

export type WebinarEventCard = {
  _id: string;
  eventKey: string;
  title: string;
  description?: string;
  startsAt?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  status: "draft" | "open" | "closed";
  registrationCount: number;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchWebinarEvents() {
  const res = await fetch(`${API_BASE}/api/admin/webinar-events`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const items = (flat.items ?? flat.data) as WebinarEventCard[];
  if (!Array.isArray(items)) throw new Error("Failed to fetch webinars");
  return {
    success: true as const,
    currentEventKey: String(flat.currentEventKey ?? ""),
    items,
  };
}

export async function createWebinarEvent(body: {
  title: string;
  description?: string;
  startsAt?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  status?: "draft" | "open" | "closed";
  activate?: boolean;
  eventKey?: string;
}) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-events`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    event: flat.event as WebinarEventCard,
    currentEventKey: String(flat.currentEventKey ?? ""),
    message: String(flat.message ?? ""),
  };
}

export async function updateWebinarEvent(
  id: string,
  body: {
    title?: string;
    description?: string;
    startsAt?: string | null;
    registrationOpensAt?: string | null;
    registrationClosesAt?: string | null;
    status?: "draft" | "open" | "closed";
  },
) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-events/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, event: flat.event as WebinarEventCard, isCurrent: !!flat.isCurrent };
}

export async function activateWebinarEvent(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-events/${id}/activate`, {
    method: "POST",
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    event: flat.event as WebinarEventCard,
    currentEventKey: String(flat.currentEventKey ?? ""),
    message: String(flat.message ?? ""),
  };
}

export async function closeWebinarRegistration(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/webinar-events/${id}/close-registration`, {
    method: "POST",
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    event: flat.event as WebinarEventCard,
    message: String(flat.message ?? ""),
  };
}

// ——— FAQ —————————————————————————————————────────────────────────────────

export type FAQItem = { _id: string; question: string; answer: string; order: number };

export async function fetchFaqs() {
  const res = await fetch(`${API_BASE}/api/admin/faq`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
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
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const broadcasts = flat.broadcasts as PushBroadcastRow[] | undefined;
  const pagination = flat.pagination as PaginationMeta | undefined;
  if (!broadcasts || !pagination) {
    throw new Error("Invalid broadcast history response");
  }
  return { broadcasts, pagination };
}

// --- Store management --------------------------------------------------------

export type AdminStoreCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminStoreProduct = {
  _id: string;
  title: string;
  slug: string;
  categoryId: string | { _id: string; name?: string; slug?: string };
  shortDescription?: string;
  description?: string;
  priceInr: number;
  mrpInr?: number;
  stockQty: number;
  isDigital?: boolean;
  status: "draft" | "active" | "archived";
  images?: Array<{ url: string; alt?: string }>;
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminStoreOrder = {
  _id: string;
  orderNumber: string;
  status: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
  totalInr: number;
  email: string;
  customerName: string;
  paymentMethod: "upi" | "card" | "cod";
  createdAt?: string;
};

export async function fetchStoreCategories() {
  const res = await fetch(`${API_BASE}/api/admin/store/categories`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const items = (flat.items ?? flat.data) as AdminStoreCategory[] | undefined;
  return { success: true as const, items: Array.isArray(items) ? items : [] };
}

export async function createStoreCategory(body: {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const res = await fetch(`${API_BASE}/api/admin/store/categories`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, item: flat.item as AdminStoreCategory };
}

export async function updateStoreCategory(id: string, body: Partial<Omit<AdminStoreCategory, "_id">>) {
  const res = await fetch(`${API_BASE}/api/admin/store/categories/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, item: flat.item as AdminStoreCategory };
}

export async function deleteStoreCategory(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/store/categories/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  return { success: true as const };
}

export async function uploadStoreCategoryImage(id: string, file: File) {
  const { raw } = await postMultipart(`/api/admin/store/categories/${id}/upload-image`, file);
  const flat = unwrapBackendSuccess(raw);
  const item = (flat.item ?? flat.data) as AdminStoreCategory;
  return {
    success: true as const,
    imageUrl: String(flat.imageUrl ?? item?.imageUrl ?? ""),
    item,
  };
}

export async function fetchStoreProducts(params?: { page?: number; limit?: number; search?: string }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.search != null && params.search.trim()) sp.set("search", params.search.trim());
  const qs = sp.toString();
  const res = await fetch(`${API_BASE}/api/admin/store/products${qs ? `?${qs}` : ""}`, {
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    items: ((flat.items ?? flat.data) as AdminStoreProduct[]) ?? [],
    pagination: flat.pagination as PaginationMeta,
  };
}

export async function createStoreProduct(body: {
  title: string;
  slug: string;
  categoryId: string;
  shortDescription?: string;
  description?: string;
  priceInr: number;
  mrpInr?: number;
  stockQty?: number;
  isDigital?: boolean;
  status?: "draft" | "active" | "archived";
}) {
  const res = await fetch(`${API_BASE}/api/admin/store/products`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, item: flat.item as AdminStoreProduct };
}

export async function updateStoreProduct(id: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/admin/store/products/${id}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, item: flat.item as AdminStoreProduct };
}

export async function deleteStoreProduct(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/store/products/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  return { success: true as const };
}

export async function uploadStoreProductImage(id: string, file: File, alt?: string) {
  const { raw } = await postMultipart(`/api/admin/store/products/${id}/upload-image`, file, {
    alt: alt ?? "",
  });
  const flat = unwrapBackendSuccess(raw);
  const item = (flat.item ?? flat.data) as AdminStoreProduct;
  if (!item || typeof item !== "object") {
    throw new Error("Upload succeeded but product data was missing from the response.");
  }
  return {
    success: true as const,
    imageUrl: String(flat.imageUrl ?? ""),
    item,
  };
}

export async function fetchStoreOrders(params?: { page?: number; limit?: number; status?: string }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.status != null && params.status.trim()) sp.set("status", params.status.trim());
  const qs = sp.toString();
  const res = await fetch(`${API_BASE}/api/admin/store/orders${qs ? `?${qs}` : ""}`, {
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    items: ((flat.items ?? flat.data) as AdminStoreOrder[]) ?? [],
    pagination: flat.pagination as PaginationMeta,
  };
}

export async function updateStoreOrderStatus(
  id: string,
  status: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled",
) {
  const res = await fetch(`${API_BASE}/api/admin/store/orders/${id}/status`, {
    method: "PATCH",
    headers: getHeaders(true),
    body: JSON.stringify({ status }),
  });
  const raw = await parseJsonResponse(res);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, item: flat.item as AdminStoreOrder };
}

// ——— Admin Staff & Roles Management —————————————————————————————————————

export async function fetchAdminStaff() {
  const res = await fetch(`${API_BASE}/api/admin/staff`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  const data = (Array.isArray(flat.data) ? flat.data : Array.isArray(flat.items) ? flat.items : []) as AdminUser[];
  return { success: true as const, data };
}

export async function createAdminStaff(body: {
  email: string;
  password: string;
  name?: string;
  adminRole?: string;
  permissions?: string[];
  canAddUsers?: boolean;
}) {
  const res = await fetch(`${API_BASE}/api/admin/staff`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, data: flat.data as AdminUser };
}

export async function updateAdminStaff(
  id: string,
  body: {
    name?: string;
    adminRole?: string;
    permissions?: string[];
    canAddUsers?: boolean;
    isActive?: boolean;
  }
) {
  const res = await fetch(`${API_BASE}/api/admin/staff/${id}`, {
    method: "PATCH",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, data: flat.data as AdminUser };
}

export async function deleteAdminStaff(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/staff/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  return unwrapBackendSuccess(raw);
}

// ——— RAG & Knowledge Base Management —————————————————————————————————————

export type KnowledgeBaseItem = {
  _id: string;
  title: string;
  content: string;
  category: "anxiety" | "depression" | "trauma" | "relationships" | "stress" | "sleep" | "grief" | "general";
  createdAt: string;
};

export type RagMatch = {
  _id: string;
  title: string;
  category: string;
  contentSnippet: string;
  similarityScore: number;
  matchPercentage: number;
};

export async function fetchKnowledgeBase(params?: { page?: number; limit?: number; search?: string; category?: string }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.search != null && params.search.trim()) sp.set("search", params.search.trim());
  if (params?.category != null && params.category.trim()) sp.set("category", params.category.trim());
  const qs = sp.toString();
  const res = await fetch(`${API_BASE}/api/admin/knowledge-base${qs ? `?${qs}` : ""}`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    data: (Array.isArray(flat.data) ? flat.data : Array.isArray(flat.items) ? flat.items : []) as KnowledgeBaseItem[],
    pagination: flat.pagination as PaginationMeta,
  };
}

export async function createKnowledgeBaseItem(body: { title: string; content: string; category: string }) {
  const res = await fetch(`${API_BASE}/api/admin/knowledge-base`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, data: flat.data as KnowledgeBaseItem };
}

export async function testRagQuery(query: string) {
  const res = await fetch(`${API_BASE}/api/admin/knowledge-base/test-query`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify({ query }),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    query: String(flat.query || ""),
    matches: (flat.matches ?? []) as RagMatch[],
    formattedRagContext: String(flat.formattedRagContext || ""),
  };
}

export async function deleteKnowledgeBaseItem(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/knowledge-base/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  return unwrapBackendSuccess(raw);
}

// ——— Gamification & User Rewards —————————————————————————————————————————

export type UserRewardRow = {
  _id: string;
  user: {
    _id: string;
    email: string;
    username?: string;
    fullName?: string;
    isActive: boolean;
  };
  points: number;
  currentStreak: number;
  bestStreak: number;
  completedDaysCount: number;
  updatedAt: string;
};

export async function fetchRewardsLeaderboard(params?: { page?: number; limit?: number }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const res = await fetch(`${API_BASE}/api/admin/rewards/leaderboard${qs ? `?${qs}` : ""}`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    data: (Array.isArray(flat.data) ? flat.data : Array.isArray(flat.items) ? flat.items : []) as UserRewardRow[],
    pagination: flat.pagination as PaginationMeta,
  };
}

export async function grantUserPoints(body: { userId: string; points: number; description?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/rewards/grant`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(body),
  });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  return unwrapBackendSuccess(raw);
}

// ——— Platform Analytics —————————————————————————————————────────────────—

export type PlatformAnalytics = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalChatSessions: number;
  totalMoodLogs: number;
  totalJournalEntries: number;
  totalActivityLogs: number;
  pendingSupport: number;
  timestamp: string;
};

export async function fetchPlatformAnalytics() {
  const res = await fetch(`${API_BASE}/api/admin/analytics/overview`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return { success: true as const, data: (flat.data ?? flat) as PlatformAnalytics };
}

export async function fetchMoodTrends() {
  const res = await fetch(`${API_BASE}/api/admin/analytics/mood-trends`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    data: (flat.data ?? flat) as {
      totalCheckIns: number;
      moodBreakdown: { mood: string; count: number; percentage: number }[];
    },
  };
}

// ——— System Audit Trail —————————————————————————————————─────────────────

export type AuditLogRow = {
  _id: string;
  adminEmail: string;
  adminName?: string;
  action: string;
  targetModel?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
};

export async function fetchAuditLogs(params?: { page?: number; limit?: number; search?: string }) {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.search != null && params.search.trim()) sp.set("search", params.search.trim());
  const qs = sp.toString();
  const res = await fetch(`${API_BASE}/api/admin/audit-logs${qs ? `?${qs}` : ""}`, { headers: getHeaders(true) });
  const raw = await parseJsonResponse(res);
  throwIfFailed(res, raw);
  const flat = unwrapBackendSuccess(raw);
  return {
    success: true as const,
    data: (Array.isArray(flat.data) ? flat.data : Array.isArray(flat.items) ? flat.items : []) as AuditLogRow[],
    pagination: flat.pagination as PaginationMeta,
  };
}
