import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchWebinarPackages,
  fetchWebinarRegistrations,
  deleteWebinarRegistration,
  updateWebinarPackages,
  fetchWebinarCoupons,
  upsertWebinarCoupon,
  type WebinarCoupon,
  type WebinarPackage,
  type WebinarRegistration,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";

type PaidFilter = "all" | "paid" | "unpaid";
type PackageFilter = "all" | "basic" | "pro" | "premium";

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
    "Background",
    "Organization/College",
    "Field",
    "Familiarity",
    "Topics",
    "Test Mind's AI",
    "Join community",
    "Consent",
    "Package",
    "Package Amount (₹)",
    "Coupon",
    "Message",
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
        r.backgroundType ?? "",
        r.organizationName ?? "",
        r.field ?? "",
        r.familiarity ?? "",
        Array.isArray(r.topics) ? r.topics.join(" | ") : "",
        r.wantsToTestMindsAi ?? "",
        r.joinEarlyCommunity ?? "",
        r.consentUpdates ? "Yes" : "No",
        r.packageId ?? "",
        r.packageAmountPaise != null ? String(Math.round(r.packageAmountPaise / 100)) : "",
        r.couponCode ?? "",
        r.message ?? "",
        r.razorpayPaymentId ? "Yes" : "No",
        r.razorpayPaymentId ?? "",
        r.razorpayOrderId ?? "",
        r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
      ].map(escapeCsvCell).join(","),
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

export default function WebinarRegistrations() {
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [packageFilter, setPackageFilter] = useState<PackageFilter>("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [downloading, setDownloading] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [packages, setPackages] = useState<WebinarPackage[]>([]);
  const [coupons, setCoupons] = useState<WebinarCoupon[]>([]);
  const [editingPackages, setEditingPackages] = useState(false);
  const [savingPackages, setSavingPackages] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponActive, setCouponActive] = useState(true);
  const [couponBasicRupees, setCouponBasicRupees] = useState(99);
  const [couponProRupees, setCouponProRupees] = useState(299);
  const [couponPremiumRupees, setCouponPremiumRupees] = useState(999);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; email?: string } | null>(
    null,
  );

  const selectedView = useMemo(
    () => (viewId ? registrations.find((r) => r._id === viewId) || null : null),
    [registrations, viewId],
  );

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWebinarRegistrations({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        paid:
          paidFilter === "all" ? undefined : paidFilter === "paid" ? true : false,
        packageId: packageFilter === "all" ? undefined : packageFilter,
      });
      setRegistrations(res.data);
      setPagination(res.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, paidFilter, packageFilter]);

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

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleFilterChange = (value: PaidFilter) => {
    setPaidFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handlePackageFilterChange = (value: PackageFilter) => {
    setPackageFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleSavePackages = async () => {
    setSavingPackages(true);
    setError(null);
    try {
      const res = await updateWebinarPackages(packages);
      setPackages(res.packages);
      setEditingPackages(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save packages");
    } finally {
      setSavingPackages(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteWebinarRegistration(id);
      setRegistrations((prev) => prev.filter((r) => r._id !== id));
      setViewId((prev) => (prev === id ? null : prev));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetchWebinarRegistrations({
        page: 1,
        limit: 10000,
        search: search || undefined,
        paid:
          paidFilter === "all" ? undefined : paidFilter === "paid" ? true : false,
        packageId: packageFilter === "all" ? undefined : packageFilter,
      });
      const csv = registrationsToCsv(res.data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `webinar-registrations-${date}.csv`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Webinar Registrations | Admin"
        description="View webinar form submissions"
      />
      <PageBreadcrumb pageTitle="Webinar Registrations" />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Webinar Registrations
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {pagination.total}
            </span>{" "}
            form submission{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters, search, download */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[200px]">
            <Input
              type="text"
              placeholder="Search by email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600 dark:text-gray-400">Paid</label>
            <select
              value={paidFilter}
              onChange={(e) => handleFilterChange(e.target.value as PaidFilter)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600 dark:text-gray-400">Package</label>
            <select
              value={packageFilter}
              onChange={(e) => handlePackageFilterChange(e.target.value as PackageFilter)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">All</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={downloading || pagination.total === 0}
            onClick={handleDownload}
          >
            {downloading ? "Downloading..." : "Download as Excel (CSV)"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingPackages((v) => !v)}
          >
            {editingPackages ? "Close Package Prices" : "Edit Package Prices"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingCoupon((v) => !v)}
          >
            {editingCoupon ? "Close Coupons" : "Manage Coupons"}
          </Button>
        </div>

        {/* Package prices modal */}
        {editingPackages && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => !savingPackages && setEditingPackages(false)}
          >
            <div
              className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Edit package prices
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Update prices (in ₹). Frontend will use these dynamically.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => !savingPackages && setEditingPackages(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {packages.map((p, idx) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={p.active !== false}
                          onChange={(e) => {
                            const next = [...packages];
                            next[idx] = { ...next[idx], active: e.target.checked };
                            setPackages(next);
                          }}
                        />
                        Active
                      </label>
                    </div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Price (₹)</label>
                    <input
                      type="number"
                      min={1}
                      value={Math.max(1, Math.round((p.amountPaise ?? 100) / 100))}
                      onChange={(e) => {
                        const rupees = Number(e.target.value || 1);
                        const next = [...packages];
                        next[idx] = {
                          ...next[idx],
                          amountPaise: Math.max(1, Math.round(rupees * 100)),
                        };
                        setPackages(next);
                      }}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingPackages}
                  onClick={() => setEditingPackages(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" disabled={savingPackages} onClick={handleSavePackages}>
                  {savingPackages ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Coupon modal */}
        {editingCoupon && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => !savingCoupon && setEditingCoupon(false)}
          >
            <div
              className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Manage webinar coupon
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Set discounted amount (in ₹) per selected package. Coupon will be applied only if the
                    package key is set here.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => !savingCoupon && setEditingCoupon(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Coupon code</label>
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    placeholder="e.g. MIND199"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Basic (₹)</p>
                  <input
                    type="number"
                    min={1}
                    value={couponBasicRupees}
                    onChange={(e) => setCouponBasicRupees(Math.max(1, Number(e.target.value || 1)))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Pro (₹)</p>
                  <input
                    type="number"
                    min={1}
                    value={couponProRupees}
                    onChange={(e) => setCouponProRupees(Math.max(1, Number(e.target.value || 1)))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Premium (₹)</p>
                  <input
                    type="number"
                    min={1}
                    value={couponPremiumRupees}
                    onChange={(e) => setCouponPremiumRupees(Math.max(1, Number(e.target.value || 1)))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700 flex items-center">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={couponActive}
                      onChange={(e) => setCouponActive(e.target.checked)}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-800 dark:text-white mb-2">Existing coupons</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {coupons.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No coupons found.</p>
                  ) : (
                    coupons.slice(0, 10).map((c) => (
                      <div
                        key={c.code}
                        className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                      >
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900 dark:text-white">{c.code}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {c.active ? "Active" : "Inactive"} ·{" "}
                            Basic:{" "}
                            {typeof c.amountPaiseByPackage.basic === "number"
                              ? Math.round(c.amountPaiseByPackage.basic / 100)
                              : "—"}
                            {" · "}Pro:{" "}
                            {typeof c.amountPaiseByPackage.pro === "number"
                              ? Math.round(c.amountPaiseByPackage.pro / 100)
                              : "—"}
                            {" · "}Premium:{" "}
                            {typeof c.amountPaiseByPackage.premium === "number"
                              ? Math.round(c.amountPaiseByPackage.premium / 100)
                              : "—"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                          onClick={() => {
                            setCouponCodeInput(c.code);
                            setCouponActive(c.active);
                            setCouponBasicRupees(
                              typeof c.amountPaiseByPackage.basic === "number"
                                ? Math.round(c.amountPaiseByPackage.basic / 100)
                                : 99,
                            );
                            setCouponProRupees(
                              typeof c.amountPaiseByPackage.pro === "number"
                                ? Math.round(c.amountPaiseByPackage.pro / 100)
                                : 299,
                            );
                            setCouponPremiumRupees(
                              typeof c.amountPaiseByPackage.premium === "number"
                                ? Math.round(c.amountPaiseByPackage.premium / 100)
                                : 999,
                            );
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingCoupon}
                  onClick={() => setEditingCoupon(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={savingCoupon || !couponCodeInput.trim()}
                  onClick={async () => {
                    setSavingCoupon(true);
                    setError(null);
                    try {
                      await upsertWebinarCoupon({
                        code: couponCodeInput.trim(),
                        active: couponActive,
                        amountPaiseByPackage: {
                          basic: Math.round(couponBasicRupees * 100),
                          pro: Math.round(couponProRupees * 100),
                          premium: Math.round(couponPremiumRupees * 100),
                        },
                      });
                      await loadCoupons();
                      setEditingCoupon(false);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to save coupon");
                    } finally {
                      setSavingCoupon(false);
                    }
                  }}
                >
                  {savingCoupon ? "Saving..." : "Save coupon"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : registrations.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800">
            No webinar registrations found.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Email</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Phone</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Package</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Submitted</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <Fragment key={r._id}>
                      <tr className="border-b border-gray-100 last:border-0 dark:border-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          <a
                            href={`mailto:${r.email}`}
                            className="text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {r.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {r.phone || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          <span className="inline-flex items-center gap-2">
                            <span className="capitalize">{r.packageId || "—"}</span>
                            {r.packageAmountPaise != null && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                (₹{Math.round(r.packageAmountPaise / 100)})
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setViewId(r._id)}
                            className="text-brand-600 hover:underline dark:text-brand-400 text-sm"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({ id: r._id, email: r.email })}
                            disabled={deletingId === r._id}
                            className="ml-3 text-red-600 hover:underline text-sm disabled:opacity-50"
                          >
                            {deletingId === r._id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
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
            )}
          </div>
        )}
      </div>

      {/* View details modal */}
      {selectedView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewId(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Registration details
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedView.name} · {selectedView.email}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setViewId(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div><span className="font-medium">Phone:</span> {selectedView.phone || "—"}</div>
              <div><span className="font-medium">City:</span> {selectedView.city || "—"}</div>
              <div>
                <span className="font-medium">Package:</span> {selectedView.packageId} (₹
                {selectedView.packageAmountPaise != null ? Math.round(selectedView.packageAmountPaise / 100) : "—"}
                )
                {selectedView.packageOriginalAmountPaise != null &&
                  selectedView.packageOriginalAmountPaise !== selectedView.packageAmountPaise && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {" "}
                      | Original ₹{Math.round(selectedView.packageOriginalAmountPaise / 100)}
                    </span>
                  )}
              </div>
              <div>
                <span className="font-medium">Coupon:</span> {selectedView.couponCode || "—"}
              </div>
              <div>
                <span className="font-medium">Background:</span>{" "}
                {selectedView.backgroundType === "working_professional"
                  ? "Working professional"
                  : selectedView.backgroundType === "student"
                    ? "Student"
                    : "—"}
              </div>
              <div><span className="font-medium">Organization/College:</span> {selectedView.organizationName || "—"}</div>
              <div><span className="font-medium">Field:</span> {selectedView.field || "—"}</div>
              <div><span className="font-medium">Familiarity:</span> {selectedView.familiarity || "—"}</div>
              <div><span className="font-medium">Test Mind&apos;s AI:</span> {selectedView.wantsToTestMindsAi || "—"}</div>
              <div><span className="font-medium">Join community:</span> {selectedView.joinEarlyCommunity || "—"}</div>
              <div><span className="font-medium">Consent:</span> {selectedView.consentUpdates ? "Yes" : "No"}</div>
              <div className="md:col-span-2">
                <span className="font-medium">Topics:</span>{" "}
                {Array.isArray(selectedView.topics) && selectedView.topics.length
                  ? selectedView.topics.join(", ")
                  : "—"}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Message:</span> {selectedView.message || "—"}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Payment:</span>{" "}
                {selectedView.razorpayPaymentId ? "Paid" : "—"}{" "}
                {selectedView.razorpayPaymentId ? `(${selectedView.razorpayPaymentId})` : ""}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setViewId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !deletingId && setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Are you sure?
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Delete registration for <span className="font-medium">{confirmDelete.email || confirmDelete.id}</span>. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!!deletingId}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={deletingId === confirmDelete.id}
                onClick={async () => {
                  const id = confirmDelete.id;
                  setConfirmDelete(null);
                  await handleDelete(id);
                }}
              >
                {deletingId === confirmDelete.id ? "Deleting..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

