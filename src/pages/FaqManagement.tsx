import { useCallback, useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchFaqs,
  addFaq,
  updateFaq,
  deleteFaq,
  type FAQItem,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";

export default function FaqManagement() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [adding, setAdding] = useState(false);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFaqs();
      setFaqs(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await addFaq({ question: newQuestion.trim(), answer: newAnswer.trim() });
      setFaqs((prev) => [...prev, res.data].sort((a, b) => a.order - b.order));
      setNewQuestion("");
      setNewAnswer("");
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add FAQ");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingId || editingId !== id) return;
    setError(null);
    try {
      const res = await updateFaq(id, {
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
      });
      setFaqs((prev) =>
        prev.map((f) => (f._id === id ? res.data : f)).sort((a, b) => a.order - b.order)
      );
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this FAQ?")) return;
    setError(null);
    try {
      await deleteFaq(id);
      setFaqs((prev) => prev.filter((f) => f._id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <>
      <PageMeta title="FAQ Management | Admin" description="Manage frequently asked questions" />
      <PageBreadcrumb pageTitle="FAQ Management" />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage FAQs shown on the contact support page.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">FAQs</h2>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? "Cancel" : "Add FAQ"}
            </Button>
          </div>

          {showAdd && (
            <form onSubmit={handleAdd} className="mb-6 space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
              <div>
                <Label className="mb-1">Question</Label>
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. What is Mind's AI?"
                />
              </div>
              <div>
                <Label className="mb-1">Answer</Label>
                <TextArea
                  value={newAnswer}
                  onChange={setNewAnswer}
                  rows={4}
                  placeholder="Enter the answer..."
                />
              </div>
              <Button type="submit" disabled={adding || !newQuestion.trim() || !newAnswer.trim()}>
                {adding ? "Adding..." : "Add FAQ"}
              </Button>
            </form>
          )}

          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : faqs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No FAQs yet. Add one above.</div>
          ) : (
            <div className="space-y-4">
              {faqs.map((f) => (
                <div
                  key={f._id}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-600"
                >
                  {editingId === f._id ? (
                    <div className="space-y-3">
                      <Input
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        placeholder="Question"
                      />
                      <TextArea
                        value={editAnswer}
                        onChange={setEditAnswer}
                        rows={4}
                        placeholder="Answer"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(f._id)}>
                          Save
                        </Button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900 dark:text-white">{f.question}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                        {f.answer}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(f._id);
                            setEditQuestion(f.question);
                            setEditAnswer(f.answer);
                          }}
                          className="text-xs text-brand-500 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(f._id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
