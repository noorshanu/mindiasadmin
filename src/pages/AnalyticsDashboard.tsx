import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router"
import { Brain, Coins, Users, Zap } from "lucide-react"
import PageMeta from "../components/common/PageMeta"
import PageBreadcrumb from "../components/common/PageBreadCrumb"
import AdminPageHeader from "../components/admin/AdminPageHeader"
import AdminAlert from "../components/admin/AdminAlert"
import {
  fetchPlatformAnalytics,
  fetchMoodTrends,
  fetchAiUsageSummary,
  fetchAiUsageByUser,
  type PlatformAnalytics,
  type AiUsageSummary,
  type AiUsageUserRow,
} from "../lib/api"

const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)

const formatTokens = (n: number) => new Intl.NumberFormat("en-US").format(n)

const featureLabel: Record<string, string> = {
  chat: "AI Chat",
  vr_chat: "VR Chat",
  journal_summary: "Journal Summary",
  view_insight: "Monthly Insight",
  embedding: "Embeddings (RAG)",
  admin_kb: "Knowledge Base",
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<PlatformAnalytics | null>(null)
  const [aiUsage, setAiUsage] = useState<AiUsageSummary | null>(null)
  const [aiUsers, setAiUsers] = useState<AiUsageUserRow[]>([])
  const [moodData, setMoodData] = useState<{
    totalCheckIns: number
    moodBreakdown: { mood: string; count: number; percentage: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [analyticsRes, moodRes, aiSummaryRes, aiUsersRes] = await Promise.all([
        fetchPlatformAnalytics(),
        fetchMoodTrends(),
        fetchAiUsageSummary(),
        fetchAiUsageByUser({ page: 1, limit: 15 }),
      ])
      setStats(analyticsRes.data)
      setMoodData(moodRes.data)
      setAiUsage(aiSummaryRes.data)
      setAiUsers(aiUsersRes.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return (
    <>
      <PageMeta title="Platform Analytics | Admin" description="Platform health, AI usage, and mood trends" />
      <PageBreadcrumb pageTitle="Platform Analytics" />

      <div className="space-y-6">
        <AdminPageHeader
          title="Platform Analytics"
          description="User engagement, AI token usage, estimated costs, and mood trends."
        />

        {error ? <AdminAlert variant="error" message={error} onDismiss={() => setError(null)} /> : null}

        {loading ? (
          <div className="flex justify-center rounded-xl border border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Platform overview */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Registered users", value: stats?.totalUsers ?? 0, sub: `${stats?.activeUsers ?? 0} active` },
                { label: "Chat sessions", value: stats?.totalChatSessions ?? 0, sub: "Total conversations" },
                { label: "Mood check-ins", value: stats?.totalMoodLogs ?? 0, sub: "All time" },
                {
                  label: "Journal + activities",
                  value: (stats?.totalJournalEntries ?? 0) + (stats?.totalActivityLogs ?? 0),
                  sub: "Reflections & exercises",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* AI usage & cost */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-2">
                <Brain className="h-5 w-5 text-brand-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Usage & Cost</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    Users with AI usage
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {aiUsage?.usersWithAiUsage ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Unique users who triggered LLM calls</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                    <Zap className="h-3.5 w-3.5" />
                    Total tokens
                  </div>
                  <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {formatTokens(aiUsage?.totalTokens ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg {formatTokens(aiUsage?.avgTokensPerUser ?? 0)} / user
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-gray-500">
                    <Coins className="h-3.5 w-3.5" />
                    Est. AI spend
                  </div>
                  <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatUsd(aiUsage?.totalEstimatedCostUsd ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg {formatUsd(aiUsage?.avgCostPerUser ?? 0)} / user
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <p className="text-xs font-medium uppercase text-gray-500">AI requests</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {formatTokens(aiUsage?.totalRequests ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    ~{formatTokens(aiUsage?.avgTokensPerRequest ?? 0)} tokens / request
                  </p>
                </div>
              </div>

              {aiUsage && aiUsage.totalRequests === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  No AI usage logged yet. New chat messages will start recording tokens automatically after backend deploy.
                </p>
              ) : null}

              {/* By feature */}
              {aiUsage && aiUsage.byFeature.length > 0 ? (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">Usage by feature</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700">
                        <tr>
                          <th className="py-2 pr-4">Feature</th>
                          <th className="py-2 pr-4">Requests</th>
                          <th className="py-2 pr-4">Tokens</th>
                          <th className="py-2">Est. cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiUsage.byFeature.map((row) => (
                          <tr key={row.feature} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2.5 pr-4 font-medium">
                              {featureLabel[row.feature] ?? row.feature}
                            </td>
                            <td className="py-2.5 pr-4">{row.requests}</td>
                            <td className="py-2.5 pr-4">{formatTokens(row.totalTokens)}</td>
                            <td className="py-2.5">{formatUsd(row.estimatedCostUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Per-user AI usage */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Top users by AI usage</h3>
              {aiUsers.length === 0 ? (
                <p className="text-sm text-gray-500">No per-user AI data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700">
                      <tr>
                        <th className="py-2 pr-4">User</th>
                        <th className="py-2 pr-4">Requests</th>
                        <th className="py-2 pr-4">Input tokens</th>
                        <th className="py-2 pr-4">Output tokens</th>
                        <th className="py-2 pr-4">Total tokens</th>
                        <th className="py-2">Est. cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiUsers.map((row) => (
                        <tr key={row.userId} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2.5 pr-4">
                            <Link
                              to={`/users/${row.userId}`}
                              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {row.email || row.username || row.phone || row.userId}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-4">{row.requests}</td>
                          <td className="py-2.5 pr-4">{formatTokens(row.totalInputTokens)}</td>
                          <td className="py-2.5 pr-4">{formatTokens(row.totalOutputTokens)}</td>
                          <td className="py-2.5 pr-4 font-medium">{formatTokens(row.totalTokens)}</td>
                          <td className="py-2.5">{formatUsd(row.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Mood trends */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Mood trends</h3>
              <p className="mb-4 text-xs text-gray-500">
                {moodData?.totalCheckIns ?? 0} check-ins total
              </p>
              <div className="space-y-4">
                {moodData?.moodBreakdown.map((m) => (
                  <div key={m.mood} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                      <span>{m.mood}</span>
                      <span>
                        {m.count} ({m.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500"
                        style={{ width: `${m.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
