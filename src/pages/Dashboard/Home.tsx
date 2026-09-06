import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import {
  fetchUsers,
  fetchWebinarRegistrations,
  fetchSupportMessages,
} from "../../lib/api";

type Stats = {
  users: number | null;
  webinarRegistrations: number | null;
  supportMessages: number | null;
  supportPending: number | null;
};

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    users: null,
    webinarRegistrations: null,
    supportMessages: null,
    supportPending: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, webinarRes, supportRes, supportPendingRes] = await Promise.all([
        fetchUsers({ page: 1, limit: 1 }),
        fetchWebinarRegistrations({ page: 1, limit: 1 }),
        fetchSupportMessages({ page: 1, limit: 1 }),
        fetchSupportMessages({ page: 1, limit: 1, status: "pending" }),
      ]);
      setStats({
        users: usersRes.pagination.total,
        webinarRegistrations: webinarRes.pagination.total,
        supportMessages: supportRes.pagination.total,
        supportPending: supportPendingRes.pagination.total,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const welcomeName = user?.username || user?.email || user?.fullName || "Admin";

  const barOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "60%", borderRadius: 4 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Users", "Webinar Regs", "Support"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (val) => String(Math.round(val)) } },
    grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    colors: ["#465fff", "#10b981", "#f59e0b"],
    tooltip: { y: { formatter: (val) => String(val) } },
  };
  const barSeries = [
    {
      name: "Count",
      data: [
        stats.users ?? 0,
        stats.webinarRegistrations ?? 0,
        stats.supportMessages ?? 0,
      ],
    },
  ];

  const resolvedSupport = Math.max(0, (stats.supportMessages ?? 0) - (stats.supportPending ?? 0));
  const donutOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Pending", "Resolved"],
    colors: ["#f59e0b", "#10b981"],
    legend: { position: "bottom" },
    dataLabels: { enabled: true },
  };
  const donutSeries = [stats.supportPending ?? 0, resolvedSupport];

  return (
    <>
      <PageMeta
        title="Dashboard | MIND'S AI Admin"
        description="MIND'S AI admin dashboard – users, webinar registrations, support"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {welcomeName}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/users"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Users
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? "—" : stats.users ?? 0}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">View users →</p>
          </Link>

          <Link
            to="/webinar"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Webinar Registrations
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? "—" : stats.webinarRegistrations ?? 0}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">View registrations →</p>
          </Link>

          <Link
            to="/support"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Support Messages
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? "—" : stats.supportMessages ?? 0}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">View support →</p>
          </Link>

          <Link
            to="/support"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending Support
                </p>
                <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
                  {loading ? "—" : stats.supportPending ?? 0}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Needs attention →</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-base font-medium text-gray-800 dark:text-white/90 mb-4">
              Overview
            </h2>
            {loading ? (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                Loading...
              </div>
            ) : (
              <Chart
                options={barOptions}
                series={barSeries}
                type="bar"
                height={280}
              />
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-base font-medium text-gray-800 dark:text-white/90 mb-4">
              Support status
            </h2>
            {loading ? (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                Loading...
              </div>
            ) : (
              <Chart
                options={donutOptions}
                series={donutSeries}
                type="donut"
                height={280}
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-base font-medium text-gray-800 dark:text-white/90">Quick links</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/users"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              User Management
            </Link>
            <Link
              to="/webinar"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Webinar Registrations
            </Link>
            <Link
              to="/support"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Support Messages
            </Link>
            <Link
              to="/content"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Content
            </Link>
            <Link
              to="/faq"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
