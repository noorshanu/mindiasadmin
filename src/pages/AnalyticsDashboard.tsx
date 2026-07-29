import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchPlatformAnalytics,
  fetchMoodTrends,
  type PlatformAnalytics,
} from "../lib/api";

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<PlatformAnalytics | null>(null);
  const [moodData, setMoodData] = useState<{
    totalCheckIns: number;
    moodBreakdown: { mood: string; count: number; percentage: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, moodRes] = await Promise.all([
        fetchPlatformAnalytics(),
        fetchMoodTrends(),
      ]);
      setStats(analyticsRes.data);
      setMoodData(moodRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load platform analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <PageMeta title="Platform & Emotional Analytics | Admin" description="Executive dashboard for platform health and emotional trends" />
      <PageBreadcrumb pageTitle="Platform & Emotional Analytics" />

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading analytics...</div>
        ) : (
          <>
            {/* Top Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Registered Users</div>
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats?.totalUsers || 0}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ {stats?.activeUsers || 0} Active accounts
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Chat Conversations</div>
                <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats?.totalChatSessions || 0}</div>
                <div className="text-xs text-gray-500">Interactive Gemini sessions</div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Daily Mood Check-ins</div>
                <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{stats?.totalMoodLogs || 0}</div>
                <div className="text-xs text-gray-500">Log entries recorded</div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Journal Entries & Exercises</div>
                <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                  {(stats?.totalJournalEntries || 0) + (stats?.totalActivityLogs || 0)}
                </div>
                <div className="text-xs text-gray-500">Reflections & grounding done</div>
              </div>
            </div>

            {/* Emotional Health Breakdown */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aggregate Emotional Health Trends</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Distribution of user-reported moods across all check-in logs ({moodData?.totalCheckIns || 0} check-ins total).
                </p>
              </div>

              <div className="space-y-4">
                {moodData?.moodBreakdown.map((m) => (
                  <div key={m.mood} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
                      <span className="capitalize">{m.mood}</span>
                      <span>{m.count} check-ins ({m.percentage}%)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${m.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!moodData || moodData.moodBreakdown.length === 0) && (
                  <p className="text-sm text-gray-500 py-4">No mood log check-ins recorded yet.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
