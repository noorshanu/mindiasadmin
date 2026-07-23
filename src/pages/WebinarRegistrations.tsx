import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  activateWebinarEvent,
  closeWebinarRegistration,
  createWebinarEvent,
  deleteWebinarCoupon,
  deleteWebinarRegistration,
  fetchWebinarCoupons,
  fetchWebinarEvents,
  fetchWebinarPackages,
  fetchWebinarRegistrations,
  updateWebinarEvent,
  updateWebinarPackages,
  upsertWebinarCoupon,
  type WebinarCoupon,
  type WebinarEventCard,
  type WebinarPackage,
  type WebinarRegistration,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";

type PaidFilter = "all" | "paid" | "unpaid";
type PackageFilter = "all" | "basic" | "pro" | "premium";
/** all | __ANY__ | __NONE__ | specific code */
type CouponFilter = string;

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function toLocalInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function escapeCsvCell(value: string): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function registrationsToCsv(rows: WebinarRegistration[]): string {
  const headers = [
    "#",
    "Name",
    "Email",
    "Phone",
    "City",
    "Coupon / Referral Code",
    "Package",
    "Amount Paid (₹)",
    "Original Amount (₹)",
    "Event Key",
    "Paid",
    "Payment ID",
    "Order ID",
    "Submitted",
  ];
  const lines = [headers.map(escapeCsvCell).join(",")];
  rows.forEach((r, idx) => {
    lines.push(
      [
        String(idx + 1),
        r.name,
        r.email,
        r.phone ?? "",
        r.city ?? "",
        r.couponCode?.trim() ? r.couponCode.trim().toUpperCase() : "",
        r.packageId ?? "",
        r.packageAmountPaise != null ? String(Math.round(r.packageAmountPaise / 100)) : "",
        r.packageOriginalAmountPaise != null
          ? String(Math.round(r.packageOriginalAmountPaise / 100))
          : "",
        r.eventKey ?? "",
        r.razorpayPaymentId ? "Yes" : "No",
        r.razorpayPaymentId ?? "",
        r.razorpayOrderId ?? "",
        r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  });
  return lines.join("\r\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusBadge(status: WebinarEventCard["status"], isCurrent: boolean) {
  // Current event key ≠ registration open. After "Close", isCurrent stays true but status is closed.
  if (isCurrent && status === "open") {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-200">
        Active signup
      </span>
    );
  }
  if (isCurrent && status === "closed") {
    return (
      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">
        Current · reg. closed
      </span>
    );
  }
  if (isCurrent && status === "draft") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
        Current · draft
      </span>
    );
  }
  const map: Record<WebinarEventCard["status"], string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

export default function WebinarRegistrations() {
  const [view, setView] = useState<"cards" | "regs">("cards");
  const [events, setEvents] = useState<WebinarEventCard[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<WebinarEventCard | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [packageFilter, setPackageFilter] = useState<PackageFilter>("all");
  const [couponFilter, setCouponFilter] = useState<CouponFilter>("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [downloading, setDownloading] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; email?: string } | null>(null);

  const [packages, setPackages] = useState<WebinarPackage[]>([]);
  const [coupons, setCoupons] = useState<WebinarCoupon[]>([]);
  const [showPackages, setShowPackages] = useState(false);
  const [showCoupons, setShowCoupons] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WebinarEventCard | null>(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    registrationOpensAt: "",
    registrationClosesAt: "",
    activate: true,
  });

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponActive, setCouponActive] = useState(true);
  const [couponBasicRupees, setCouponBasicRupees] = useState(99);
  const [couponProRupees, setCouponProRupees] = useState(299);
  const [couponPremiumRupees, setCouponPremiumRupees] = useState(999);
  const [couponMaxUses, setCouponMaxUses] = useState("");
  const [couponExpiresAt, setCouponExpiresAt] = useState("");

  const selectedView = useMemo(
    () => (viewId ? registrations.find((r) => r._id === viewId) || null : null),
    [registrations, viewId],
  );

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setError(null);
    try {
      const res = await fetchWebinarEvents();
      setEvents(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load webinars");
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      const res = await fetchWebinarPackages();
      setPackages(res.packages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load packages");
    }
  }, []);

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetchWebinarCoupons();
      setCoupons(res.coupons);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coupons");
    }
  }, []);

  const loadRegistrations = useCallback(async () => {
    if (!selectedEvent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWebinarRegistrations({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        paid: paidFilter === "all" ? undefined : paidFilter === "paid" ? true : false,
        packageId: packageFilter === "all" ? undefined : packageFilter,
        eventKey: selectedEvent.eventKey,
        couponCode: couponFilter === "all" ? undefined : couponFilter,
      });
      setRegistrations(res.data);
      setPagination(res.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  }, [
    selectedEvent,
    pagination.page,
    pagination.limit,
    search,
    paidFilter,
    packageFilter,
    couponFilter,
  ]);

  useEffect(() => {
    void loadEvents();
    void loadPackages();
    void loadCoupons();
  }, [loadEvents, loadPackages, loadCoupons]);

  useEffect(() => {
    if (view === "regs" && selectedEvent) void loadRegistrations();
  }, [view, selectedEvent, loadRegistrations]);

  const openEventRegs = (ev: WebinarEventCard) => {
    setSelectedEvent(ev);
    setView("regs");
    setSearch("");
    setSearchInput("");
    setPaidFilter("all");
    setPackageFilter("all");
    setCouponFilter("all");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const openEvent = useMemo(() => events.find((e) => e.status === "open") || null, [events]);
  const mustCloseFirst = !!openEvent;

  const handleCreateWebinar = async () => {
    if (!createForm.title.trim() || saving) return;
    if (createForm.activate && mustCloseFirst) {
      setError(
        `Close registration on "${openEvent?.title}" first, then create/activate a new webinar.`,
      );
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await createWebinarEvent({
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        startsAt: fromLocalInputValue(createForm.startsAt),
        registrationOpensAt: fromLocalInputValue(createForm.registrationOpensAt),
        registrationClosesAt: fromLocalInputValue(createForm.registrationClosesAt),
        activate: createForm.activate && !mustCloseFirst,
      });
      setInfo(
        res.message ||
          "Webinar created. Same emails can register again because this uses a new event key.",
      );
      setShowCreate(false);
      setCreateForm({
        title: "",
        description: "",
        startsAt: "",
        registrationOpensAt: "",
        registrationClosesAt: "",
        activate: !mustCloseFirst,
      });
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create webinar");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (ev: WebinarEventCard) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await activateWebinarEvent(ev._id);
      setInfo(
        res.message ||
          "This webinar is now active. New signups (and duplicate emails from older webinars) go here.",
      );
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseReg = async (ev: WebinarEventCard) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await closeWebinarRegistration(ev._id);
      setInfo(
        res.message ||
          `Registration closed for ${ev.title}. Public form is blocked until you re-open or activate another webinar.`,
      );
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to close registration");
    } finally {
      setSaving(false);
    }
  };

  const handleReopenReg = async (ev: WebinarEventCard) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      // activate clears registrationClosesAt and sets status open
      const res = await activateWebinarEvent(ev._id);
      setInfo(res.message || `Registration re-opened for ${ev.title}.`);
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to re-open registration");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditEvent = async () => {
    if (!editingEvent || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateWebinarEvent(editingEvent._id, {
        title: editingEvent.title,
        description: editingEvent.description,
        startsAt: editingEvent.startsAt ?? null,
        registrationOpensAt: editingEvent.registrationOpensAt ?? null,
        registrationClosesAt: editingEvent.registrationClosesAt ?? null,
        status: editingEvent.status,
      });
      setEditingEvent(null);
      await loadEvents();
      if (selectedEvent?._id === editingEvent._id) {
        setSelectedEvent((prev) => (prev ? { ...prev, ...editingEvent } : prev));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save webinar");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePackages = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateWebinarPackages(packages);
      setPackages(res.packages);
      setShowPackages(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save packages");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCoupon = async () => {
    if (!couponCodeInput.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await upsertWebinarCoupon({
        code: couponCodeInput.trim(),
        active: couponActive,
        amountPaiseByPackage: {
          basic: Math.max(1, Math.round(couponBasicRupees * 100)),
          pro: Math.max(1, Math.round(couponProRupees * 100)),
          premium: Math.max(1, Math.round(couponPremiumRupees * 100)),
        },
        maxUses: couponMaxUses.trim() ? Math.max(1, Number(couponMaxUses)) : undefined,
        expiresAt: couponExpiresAt ? fromLocalInputValue(couponExpiresAt) : null,
      });
      setCouponCodeInput("");
      setCouponMaxUses("");
      setCouponExpiresAt("");
      await loadCoupons();
      setInfo("Coupon saved. Users enter this code on the registration form to get the discounted package price.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleEditCoupon = (c: WebinarCoupon) => {
    setCouponCodeInput(c.code);
    setCouponActive(c.active !== false);
    setCouponBasicRupees(Math.round((c.amountPaiseByPackage.basic ?? 9900) / 100));
    setCouponProRupees(Math.round((c.amountPaiseByPackage.pro ?? 29900) / 100));
    setCouponPremiumRupees(Math.round((c.amountPaiseByPackage.premium ?? 99900) / 100));
    setCouponMaxUses(c.maxUses != null ? String(c.maxUses) : "");
    setCouponExpiresAt(toLocalInputValue(c.expiresAt));
  };

  const handleDeleteCoupon = async (code: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteWebinarCoupon(code);
      await loadCoupons();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteWebinarRegistration(id);
      setRegistrations((prev) => prev.filter((r) => r._id !== id));
      setViewId((prev) => (prev === id ? null : prev));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      setConfirmDelete(null);
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async () => {
    if (!selectedEvent) return;
    setDownloading(true);
    try {
      const res = await fetchWebinarRegistrations({
        page: 1,
        limit: 10000,
        search: search || undefined,
        paid: paidFilter === "all" ? undefined : paidFilter === "paid" ? true : false,
        packageId: packageFilter === "all" ? undefined : packageFilter,
        eventKey: selectedEvent.eventKey,
        couponCode: couponFilter === "all" ? undefined : couponFilter,
      });
      const csv = registrationsToCsv(res.data);
      downloadCsv(csv, `${selectedEvent.title.replace(/\s+/g, "-").toLowerCase()}-regs.csv`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageMeta title="Webinars | Admin" description="Manage webinars, registrations, and coupons" />
      <PageBreadcrumb pageTitle={view === "cards" ? "Webinars" : selectedEvent?.title || "Registrations"} />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {view === "cards" ? "Webinars" : selectedEvent?.title || "Registrations"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {view === "cards"
                ? "Each webinar has its own registrations. Activate a new webinar so the same emails can sign up again."
                : `Showing signups for this webinar only (event key: ${selectedEvent?.eventKey || "—"})`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {view === "regs" ? (
              <Button size="sm" variant="outline" onClick={() => { setView("cards"); setSelectedEvent(null); void loadEvents(); }}>
                ← All webinars
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => setShowPackages(true)}>
              Package prices
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCoupons(true)}>
              Coupons
            </Button>
            {view === "cards" ? (
              <Button
                size="sm"
                onClick={() => {
                  setCreateForm((p) => ({ ...p, activate: !mustCloseFirst }));
                  setShowCreate(true);
                }}
              >
                + Create webinar
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {info ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200">
            {info}
          </div>
        ) : null}

        {/* ── WEBINAR CARDS ── */}
        {view === "cards" ? (
          <div className="space-y-4">
            {eventsLoading ? <p className="text-sm text-gray-500">Loading webinars…</p> : null}
            {!eventsLoading && events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
                <p className="font-medium text-gray-800 dark:text-white/90">No webinars yet</p>
                <p className="mt-1 text-sm text-gray-500">Create Webinar 1 / Webinar 2 to organize registrations.</p>
                <Button className="mt-4" size="sm" onClick={() => setShowCreate(true)}>
                  Create first webinar
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((ev) => (
                <article
                  key={ev._id}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{ev.title}</h2>
                    {statusBadge(ev.status, ev.isCurrent)}
                  </div>
                  {ev.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500">{ev.description}</p>
                  ) : null}

                  <dl className="mt-4 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between gap-2">
                      <dt>Webinar starts</dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{fmtDate(ev.startsAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Reg. opens</dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{fmtDate(ev.registrationOpensAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Reg. closes</dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{fmtDate(ev.registrationClosesAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Registrations</dt>
                      <dd className="font-semibold text-gray-900 dark:text-white">{ev.registrationCount}</dd>
                    </div>
                  </dl>

                  <p className="mt-3 truncate rounded-lg bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-500 dark:bg-gray-900/50">
                    key: {ev.eventKey}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openEventRegs(ev)}>
                      View registrations
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingEvent({ ...ev })}>
                      Edit
                    </Button>
                    {!ev.isCurrent ? (
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleActivate(ev)}>
                        Make active
                      </Button>
                    ) : ev.status === "open" ? (
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleCloseReg(ev)}>
                        Close registration
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleReopenReg(ev)}>
                        Re-open registration
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── REGISTRATIONS FOR ONE WEBINAR ── */}
        {view === "regs" && selectedEvent ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(searchInput.trim());
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="flex min-w-[200px] flex-1 gap-2"
              >
                <Input
                  type="text"
                  placeholder="Search by email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm">
                  Search
                </Button>
              </form>
              <select
                value={paidFilter}
                onChange={(e) => {
                  setPaidFilter(e.target.value as PaidFilter);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="all">All payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <select
                value={packageFilter}
                onChange={(e) => {
                  setPackageFilter(e.target.value as PackageFilter);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="all">All packages</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
              <select
                value={couponFilter}
                onChange={(e) => {
                  setCouponFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 max-w-[200px] rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                title="Filter by coupon / referral code"
              >
                <option value="all">All coupons</option>
                <option value="__ANY__">Used any coupon</option>
                <option value="__NONE__">No coupon</option>
                {coupons.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" disabled={downloading || pagination.total === 0} onClick={() => void handleDownload()}>
                {downloading ? "Downloading…" : "Download CSV"}
              </Button>
              <span className="text-sm text-gray-500">{pagination.total} registration{pagination.total !== 1 ? "s" : ""}</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Coupon / Referral</th>
                    <th className="px-4 py-3">Package</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Loading…
                      </td>
                    </tr>
                  ) : registrations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No registrations for this webinar yet.
                      </td>
                    </tr>
                  ) : (
                    registrations.map((r) => (
                      <Fragment key={r._id}>
                        <tr className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.name}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.email}</td>
                          <td className="px-4 py-3">
                            {r.couponCode?.trim() ? (
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                                {r.couponCode}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 capitalize">
                            {r.packageId}
                            {r.packageAmountPaise != null ? ` · ₹${Math.round(r.packageAmountPaise / 100)}` : ""}
                          </td>
                          <td className="px-4 py-3">{r.razorpayPaymentId ? "Yes" : "No"}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(r.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button type="button" className="text-sm text-brand-500 hover:underline" onClick={() => setViewId(r._id)}>
                                View
                              </button>
                              <button
                                type="button"
                                className="text-sm text-red-500 hover:underline"
                                onClick={() => setConfirmDelete({ id: r._id, email: r.email })}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 ? (
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Prev
                </Button>
                <span className="text-sm text-gray-500">
                  Page {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Create webinar modal */}
      {showCreate ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create webinar</h3>
            <p className="mt-1 text-sm text-gray-500">
              Creates a new event key. Old webinar emails can register again once this one is active.
            </p>
            {mustCloseFirst ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                <strong>{openEvent?.title}</strong> still has open registration. Close it first, then you can
                activate a new webinar. You can still create this one as a <em>draft</em> now.
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Title
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Webinar 2"
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Description (optional)
                <Input
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Webinar starts
                <Input
                  type="datetime-local"
                  value={createForm.startsAt}
                  onChange={(e) => setCreateForm((p) => ({ ...p, startsAt: e.target.value }))}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Registration opens
                <Input
                  type="datetime-local"
                  value={createForm.registrationOpensAt}
                  onChange={(e) => setCreateForm((p) => ({ ...p, registrationOpensAt: e.target.value }))}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Registration closes
                <Input
                  type="datetime-local"
                  value={createForm.registrationClosesAt}
                  onChange={(e) => setCreateForm((p) => ({ ...p, registrationClosesAt: e.target.value }))}
                  className="mt-1"
                />
              </label>
              <label className={`flex items-center gap-2 text-sm ${mustCloseFirst ? "opacity-60" : ""}`}>
                <input
                  type="checkbox"
                  checked={createForm.activate && !mustCloseFirst}
                  disabled={mustCloseFirst}
                  onChange={(e) => setCreateForm((p) => ({ ...p, activate: e.target.checked }))}
                />
                Make this the active webinar for new signups now
                {mustCloseFirst ? " (disabled until you close the open webinar)" : ""}
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving || !createForm.title.trim()} onClick={() => void handleCreateWebinar()}>
                {saving ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit webinar modal */}
      {editingEvent ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h3 className="text-lg font-bold">Edit {editingEvent.title}</h3>
            <p className="mt-1 font-mono text-xs text-gray-500">key: {editingEvent.eventKey} (cannot change)</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Title
                <Input
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Description
                <Input
                  value={editingEvent.description || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Status
                <select
                  value={editingEvent.status}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      status: e.target.value as WebinarEventCard["status"],
                    })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="draft">draft</option>
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                </select>
              </label>
              <label className="block text-sm">
                Webinar starts
                <Input
                  type="datetime-local"
                  value={toLocalInputValue(editingEvent.startsAt)}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, startsAt: fromLocalInputValue(e.target.value) })
                  }
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Registration opens
                <Input
                  type="datetime-local"
                  value={toLocalInputValue(editingEvent.registrationOpensAt)}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      registrationOpensAt: fromLocalInputValue(e.target.value),
                    })
                  }
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Registration closes
                <Input
                  type="datetime-local"
                  value={toLocalInputValue(editingEvent.registrationClosesAt)}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      registrationClosesAt: fromLocalInputValue(e.target.value),
                    })
                  }
                  className="mt-1"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingEvent(null)}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void handleSaveEditEvent()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Packages modal */}
      {showPackages ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h3 className="text-lg font-bold">Package prices (₹)</h3>
            <p className="mt-1 text-sm text-gray-500">These are the normal prices before any coupon.</p>
            <div className="mt-4 space-y-3">
              {packages.map((pkg, idx) => (
                <div key={pkg.id} className="flex items-center gap-3">
                  <span className="w-24 capitalize text-sm font-medium">{pkg.id}</span>
                  <Input
                    type="number"
                    value={Math.round(pkg.amountPaise / 100)}
                    onChange={(e) => {
                      const rupees = Math.max(1, Number(e.target.value) || 1);
                      setPackages((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, amountPaise: rupees * 100 } : p)),
                      );
                    }}
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={pkg.active !== false}
                      onChange={(e) =>
                        setPackages((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, active: e.target.checked } : p)),
                        )
                      }
                    />
                    Active
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPackages(false)}>
                Close
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void handleSavePackages()}>
                Save prices
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Coupons modal — clearer copy */}
      {showCoupons ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h3 className="text-lg font-bold">Coupon codes</h3>
            <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
              <p className="font-semibold">How coupons work</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs sm:text-sm">
                <li>User picks a package on the public form (Basic / Pro / Premium).</li>
                <li>They enter your coupon code (e.g. <code className="rounded bg-white/70 px-1">LAUNCH50</code>).</li>
                <li>
                  The amounts below are the <strong>final price in ₹</strong> they pay for each package — not a % off.
                </li>
                <li>Example: Basic normally ₹99 → set Basic to ₹49 under the coupon → they pay ₹49.</li>
              </ol>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                Coupon code
                <Input
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  placeholder="LAUNCH50"
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Final Basic ₹
                <Input
                  type="number"
                  value={couponBasicRupees}
                  onChange={(e) => setCouponBasicRupees(Number(e.target.value) || 1)}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Final Pro ₹
                <Input
                  type="number"
                  value={couponProRupees}
                  onChange={(e) => setCouponProRupees(Number(e.target.value) || 1)}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Final Premium ₹
                <Input
                  type="number"
                  value={couponPremiumRupees}
                  onChange={(e) => setCouponPremiumRupees(Number(e.target.value) || 1)}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                Max uses (optional)
                <Input
                  type="number"
                  value={couponMaxUses}
                  onChange={(e) => setCouponMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                Expires at (optional)
                <Input
                  type="datetime-local"
                  value={couponExpiresAt}
                  onChange={(e) => setCouponExpiresAt(e.target.value)}
                  className="mt-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={couponActive} onChange={(e) => setCouponActive(e.target.checked)} />
                Active (users can use it)
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" disabled={saving || !couponCodeInput.trim()} onClick={() => void handleSaveCoupon()}>
                {saving ? "Saving…" : "Save coupon"}
              </Button>
            </div>

            <h4 className="mt-6 text-sm font-semibold text-gray-800 dark:text-white">Existing coupons</h4>
            <ul className="mt-2 space-y-2">
              {coupons.length === 0 ? <li className="text-sm text-gray-500">No coupons yet.</li> : null}
              {coupons.map((c) => (
                <li
                  key={c.code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2 text-sm dark:border-gray-800"
                >
                  <div>
                    <p className="font-semibold">{c.code}</p>
                    <p className="text-xs text-gray-500">
                      Final ₹ — Basic {Math.round((c.amountPaiseByPackage.basic ?? 0) / 100) || "—"} · Pro{" "}
                      {Math.round((c.amountPaiseByPackage.pro ?? 0) / 100) || "—"} · Premium{" "}
                      {Math.round((c.amountPaiseByPackage.premium ?? 0) / 100) || "—"}
                      {" · "}used {c.usedCount}
                      {c.maxUses != null ? `/${c.maxUses}` : ""}
                      {!c.active ? " · inactive" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="text-brand-500 hover:underline" onClick={() => handleEditCoupon(c)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-500 hover:underline"
                      onClick={() => void handleDeleteCoupon(c.code)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCoupons(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Registration detail */}
      {selectedView ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
            <h3 className="text-lg font-bold">{selectedView.name}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-gray-500">Email</dt><dd>{selectedView.email}</dd></div>
              <div><dt className="text-gray-500">Phone</dt><dd>{selectedView.phone}</dd></div>
              <div><dt className="text-gray-500">City</dt><dd>{selectedView.city}</dd></div>
              <div>
                <dt className="text-gray-500">Coupon / Referral code</dt>
                <dd className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                  {selectedView.couponCode?.trim() ? selectedView.couponCode : "— (none used)"}
                </dd>
              </div>
              <div><dt className="text-gray-500">Event key</dt><dd className="font-mono text-xs">{selectedView.eventKey || "—"}</dd></div>
              <div>
                <dt className="text-gray-500">Package</dt>
                <dd className="capitalize">
                  {selectedView.packageId}
                  {selectedView.packageAmountPaise != null
                    ? ` · paid ₹${Math.round(selectedView.packageAmountPaise / 100)}`
                    : ""}
                  {selectedView.packageOriginalAmountPaise != null &&
                  selectedView.packageOriginalAmountPaise !== selectedView.packageAmountPaise
                    ? ` (was ₹${Math.round(selectedView.packageOriginalAmountPaise / 100)})`
                    : ""}
                </dd>
              </div>
              <div><dt className="text-gray-500">Paid</dt><dd>{selectedView.razorpayPaymentId || "No"}</dd></div>
            </dl>
            <div className="mt-5 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setViewId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-gray-900">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Delete registration for <strong>{confirmDelete.email}</strong>?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" disabled={!!deletingId} onClick={() => void handleDelete(confirmDelete.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
