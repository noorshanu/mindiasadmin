import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchKnowledgeBase,
  createKnowledgeBaseItem,
  testRagQuery,
  deleteKnowledgeBaseItem,
  type KnowledgeBaseItem,
  type RagMatch,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import { AdminDialog } from "../components/ui/modal/AdminDialog";

const CATEGORIES = [
  { key: "all", label: "All Categories" },
  { key: "anxiety", label: "Anxiety" },
  { key: "depression", label: "Depression" },
  { key: "trauma", label: "Trauma" },
  { key: "relationships", label: "Relationships" },
  { key: "stress", label: "Stress" },
  { key: "sleep", label: "Sleep" },
  { key: "grief", label: "Grief" },
  { key: "general", label: "General & AI Identity" },
];

export default function KnowledgeBaseManagement() {
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Add Item Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("anxiety");
  const [submitting, setSubmitting] = useState(false);

  // RAG Query Simulator Widget
  const [simQuery, setSimQuery] = useState("");
  const [simMatches, setSimMatches] = useState<RagMatch[]>([]);
  const [simFormattedContext, setSimFormattedContext] = useState("");
  const [simulating, setSimulating] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchKnowledgeBase({
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        search: search || undefined,
      });
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Knowledge Base");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createKnowledgeBaseItem({ title, content, category });
      setSuccess("Knowledge Base snippet added & indexed into RAG memory");
      setTitle("");
      setContent("");
      setIsAddOpen(false);
      loadItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add snippet");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateRag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simQuery.trim()) return;
    setSimulating(true);
    setError(null);
    try {
      const res = await testRagQuery(simQuery);
      setSimMatches(res.matches);
      setSimFormattedContext(res.formattedRagContext);
    } catch (e) {
      setError(e instanceof Error ? e.message : "RAG Query test failed");
    } finally {
      setSimulating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this RAG snippet?")) return;
    try {
      await deleteKnowledgeBaseItem(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
      setSuccess("Snippet removed from Knowledge Base");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete snippet");
    }
  };

  return (
    <>
      <PageMeta title="RAG & Knowledge Base Control | Admin" description="Manage vector memory and test AI retrieval" />
      <PageBreadcrumb pageTitle="AI Knowledge Base & RAG Memory" />

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

        {/* RAG Context Tester Widget */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-indigo-800/40 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ✨ Live AI Memory Tester
              </div>
              <h2 className="text-xl font-bold mt-1">RAG Context Simulator</h2>
              <p className="text-xs text-indigo-200/80">
                Test any user prompt to preview exact vector-matched context snippets passed to Gemini AI.
              </p>
            </div>
            <Button onClick={() => setIsAddOpen(true)} className="bg-brand-500 hover:bg-brand-600 text-white whitespace-nowrap">
              + Add Knowledge Snippet
            </Button>
          </div>

          <form onSubmit={handleSimulateRag} className="flex gap-2">
            <input
              value={simQuery}
              onChange={(e) => setSimQuery(e.target.value)}
              placeholder="e.g. How to manage severe panic attacks at night?"
              className="flex-1 bg-white/10 text-white placeholder-indigo-300/50 border border-indigo-700/50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <Button type="submit" disabled={simulating} className="bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap">
              {simulating ? "Testing..." : "Test RAG Memory"}
            </Button>
          </form>

          {/* Test Results Output */}
          {simMatches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-indigo-800/50 space-y-3">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Top Vector Memory Matches ({simMatches.length})
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {simMatches.map((m) => (
                  <div key={m._id} className="bg-white/5 p-3 rounded-xl border border-indigo-700/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{m.title}</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                        {m.matchPercentage}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-200/80 line-clamp-3">{m.contentSnippet}</p>
                  </div>
                ))}
              </div>

              {simFormattedContext && (
                <div className="mt-3 p-3 bg-black/30 rounded-xl border border-indigo-700/30 space-y-1">
                  <div className="text-[11px] font-bold text-indigo-300">Raw Formatted RAG Context for Gemini Prompt:</div>
                  <pre className="text-[10px] text-indigo-100/90 whitespace-pre-wrap font-mono max-h-36 overflow-y-auto">
                    {simFormattedContext}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter & List Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategoryFilter(c.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  categoryFilter === c.key
                    ? "bg-brand-500 text-white font-bold"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search knowledge items..."
            />
          </div>
        </div>

        {/* Knowledge Base Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading knowledge base...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No knowledge base items found.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {items.map((item) => (
                <div key={item._id} className="p-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-block text-[10px] uppercase font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/60 dark:text-brand-400 px-2 py-0.5 rounded mb-1 border border-brand-200 dark:border-brand-800">
                        {item.category}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{item.title}</h3>
                    </div>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 underline shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add RAG knowledge snippet"
        description="Index psychological guidance the AI can retrieve."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-knowledge-form"
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              {submitting ? "Indexing..." : "Index Knowledge Snippet"}
            </Button>
          </>
        }
      >
        <form id="add-knowledge-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label>Title / Topic</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Managing Social Anxiety" />
          </div>
          <div>
            <Label>Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Content Snippet (Psychological Guidance / Facts)</Label>
            <TextArea
              value={content}
              onChange={setContent}
              rows={6}
              placeholder="Enter detailed facts, CBT exercises, or advice..."
            />
          </div>
        </form>
      </AdminDialog>
    </>
  );
}
