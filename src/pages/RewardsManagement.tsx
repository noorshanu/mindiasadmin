import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchRewardsLeaderboard,
  grantUserPoints,
  type UserRewardRow,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";

export default function RewardsManagement() {
  const [rows, setRows] = useState<UserRewardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Grant Points Modal
  const [grantingUser, setGrantingUser] = useState<UserRewardRow | null>(null);
  const [pointsInput, setPointsInput] = useState("50");
  const [descInput, setDescInput] = useState("Support bonus / Community reward");
  const [submitting, setSubmitting] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRewardsLeaderboard();
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rewards leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantingUser) return;
    const pts = parseInt(pointsInput, 10);
    if (isNaN(pts) || pts === 0) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await grantUserPoints({
        userId: grantingUser.user._id,
        points: pts,
        description: descInput,
      });
      setSuccess(typeof res.message === "string" ? res.message : "Points updated successfully");
      setGrantingUser(null);
      loadLeaderboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grant points");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta title="Gamification & User Rewards | Admin" description="View user points leaderboard and grant custom reward points" />
      <PageBreadcrumb pageTitle="User Gamification & Rewards" />

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm border border-emerald-200 dark:border-emerald-800">
            {success}
          </div>
        )}

        {/* Overview Header */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rewards Leaderboard & Streaks</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track user engagement points, daily check-in streaks, and grant bonus points.
            </p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading rewards data...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No user rewards data recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Total Points</th>
                    <th className="px-6 py-4">Current Streak</th>
                    <th className="px-6 py-4">Best Streak</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {rows.map((row, idx) => (
                    <tr key={row._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                      <td className="px-6 py-4 font-bold text-gray-400">#{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {row.user.fullName || row.user.username || "User"}
                        </div>
                        <div className="text-xs text-gray-500">{row.user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                          🏆 {row.points} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-orange-600 dark:text-orange-400">
                        🔥 {row.currentStreak} days
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        ⭐ {row.bestStreak} days
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setGrantingUser(row);
                            setPointsInput("50");
                            setDescInput("Support bonus / Community reward");
                          }}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 underline"
                        >
                          + Grant Points
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* GRANT POINTS MODAL */}
      {grantingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Grant Bonus Points to {grantingUser.user.fullName || grantingUser.user.email}
            </h3>
            <form onSubmit={handleGrantSubmit} className="space-y-4">
              <div>
                <Label>Points Amount (positive to add, negative to deduct)</Label>
                <Input
                  type="number"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>

              <div>
                <Label>Reason / Description</Label>
                <Input
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="e.g. Community contribution reward"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button type="button" variant="outline" onClick={() => setGrantingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {submitting ? "Granting..." : "Grant Points"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
