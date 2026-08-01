import { useCallback, useEffect, useRef, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  fetchContent,
  updateContent,
  fetchTeam,
  addTeamMember,
  updateTeamMember,
  uploadTeamMemberImage,
  deleteTeamMember,
  reorderTeam,
  fetchSocial,
  updateSocial,
  uploadHomeHeroSlide,
  deleteHomeHeroSlide,
  type TeamMember,
  type SocialSettings,
  type HomeHeroSlide,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const DEFAULT_VISION =
  "A world where no one has to pretend they're okay. Where silence doesn't mean strength, and asking for help isn't a last option—it's a normal one. We imagine a future where technology doesn't replace human warmth, but holds space until humans can reach each other. Mind's AI dreams of being that quiet presence—the one that listens when the world doesn't, the one that stays when everything feels heavy, the one that reminds you: you're not broken, you're becoming.";

const DEFAULT_MISSION =
  "To be there for the 3 AM thoughts. For the unsent messages. For the feelings that don't have names yet. Our mission is to build an AI that listens without judgment, guides without control, and supports without pretending to replace real humans. We exist to help people slow down, feel seen, and find clarity—one honest conversation at a time. Because healing doesn't always start with answers. Sometimes, it starts with being heard.";

const DEFAULT_THOUGHT =
  "Small steps still move you forward. Be gentle with yourself today.";

const TEAM_CARD_TYPE = "TEAM_CARD";

interface DraggableTeamCardProps {
  member: TeamMember;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  editingId: string | null;
  editName: string;
  editTitle: string;
  setEditName: (v: string) => void;
  setEditTitle: (v: string) => void;
  setEditingId: (v: string | null) => void;
  uploadingId: string | null;
  handleUploadImage: (id: string, file: File) => void;
  handleDeleteMember: (id: string) => void;
  handleUpdateMember: (id: string) => void;
}

function DraggableTeamCard({
  member: m,
  index,
  moveCard,
  editingId,
  editName,
  editTitle,
  setEditName,
  setEditTitle,
  setEditingId,
  uploadingId,
  handleUploadImage,
  handleDeleteMember,
  handleUpdateMember,
}: DraggableTeamCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: TEAM_CARD_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: TEAM_CARD_TYPE,
    hover(item: { index: number }) {
      if (!cardRef.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  preview(drop(cardRef));

  return (
    <div
      ref={cardRef}
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isDragging
          ? "opacity-40 scale-[0.98] border-brand-400 bg-brand-50 dark:bg-brand-950/20"
          : isOver
            ? "border-brand-400 bg-brand-50/50 dark:bg-brand-950/10 shadow-md"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          ref={(node) => { drag(node); }}
          className="shrink-0 cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500"
          title="Drag to reorder"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Position Badge */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold">
          {index + 1}
        </div>

        {/* Photo */}
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {m.imageUrl ? (
            <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg text-gray-400 font-bold">👤</div>
          )}
        </div>

        {/* Name / Title or Edit Form */}
        <div className="flex-1 min-w-0">
          {editingId === m._id ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
                className="max-w-[180px]"
              />
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
                className="max-w-[180px]"
              />
              <Button size="sm" onClick={() => handleUpdateMember(m._id)} className="bg-brand-500 text-white text-xs">
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="text-xs">
                Cancel
              </Button>
            </div>
          ) : (
            <div>
              <div className="font-bold text-gray-900 dark:text-white text-sm truncate">{m.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.title}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {editingId !== m._id && (
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => {
                setEditingId(m._id);
                setEditName(m.name);
                setEditTitle(m.title);
              }}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap"
            >
              Edit
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition whitespace-nowrap">
              {uploadingId === m._id ? "Uploading..." : "Photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingId === m._id}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadImage(m._id, f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={() => {
                if (window.confirm(`Delete ${m.name}?`)) handleDeleteMember(m._id);
              }}
              className="text-xs text-rose-500 hover:underline font-medium whitespace-nowrap"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContentManagement() {
  const [vision, setVision] = useState(DEFAULT_VISION);
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [thought, setThought] = useState(DEFAULT_THOUGHT);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [social, setSocial] = useState<SocialSettings>({
    facebookUrl: "",
    twitterUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    address: "",
    businessHours: "",
  });
  const [homeHeroSlides, setHomeHeroSlides] = useState<HomeHeroSlide[]>([]);
  const [heroAlt, setHeroAlt] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [deletingHeroId, setDeletingHeroId] = useState<string | null>(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const originalOrderRef = useRef<string[]>([]);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contentRes, teamRes, socialRes] = await Promise.all([
        fetchContent(),
        fetchTeam(),
        fetchSocial(),
      ]);
      setVision(contentRes.vision || DEFAULT_VISION);
      setMission(contentRes.mission || DEFAULT_MISSION);
      setThought(
        typeof contentRes.thought === "string"
          ? contentRes.thought
          : DEFAULT_THOUGHT,
      );
      setHomeHeroSlides(contentRes.homeHeroSlides ?? []);
      const teamData = teamRes.data || [];
      setTeam(teamData);
      originalOrderRef.current = teamData.map((m: TeamMember) => m._id);
      setOrderChanged(false);
      setSocial({
        facebookUrl: socialRes.data.facebookUrl || "",
        twitterUrl: socialRes.data.twitterUrl || "",
        instagramUrl: socialRes.data.instagramUrl || "",
        linkedinUrl: socialRes.data.linkedinUrl || "",
        address: socialRes.data.address || "",
        businessHours: socialRes.data.businessHours || "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleAddMember = async () => {
    if (!newName.trim() || !newTitle.trim()) return;
    setAddingMember(true);
    setError(null);
    try {
      const res = await addTeamMember({ name: newName.trim(), title: newTitle.trim() });
      setTeam((prev) => {
        const next = [...prev, res.data];
        originalOrderRef.current = next.map((m) => m._id);
        return next;
      });
      setNewName("");
      setNewTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const moveTeamMember = useCallback((dragIndex: number, hoverIndex: number) => {
    setTeam((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, removed);
      return next;
    });
    setOrderChanged(true);
  }, []);

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    setError(null);
    try {
      const orderedIds = team.map((m) => m._id);
      const res = await reorderTeam(orderedIds);
      setTeam(res.data);
      originalOrderRef.current = res.data.map((m: TeamMember) => m._id);
      setOrderChanged(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save order");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleUpdateMember = async (id: string) => {
    if (!editingId || editingId !== id) return;
    setError(null);
    try {
      const res = await updateTeamMember(id, { name: editName.trim(), title: editTitle.trim() });
      setTeam((prev) => prev.map((m) => (m._id === id ? res.data : m)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const handleUploadImage = async (id: string, file: File) => {
    setUploadingId(id);
    setError(null);
    try {
      const res = await uploadTeamMemberImage(id, file);
      setTeam((prev) => prev.map((m) => (m._id === id ? res.data : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload image");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteMember = async (id: string) => {
    setError(null);
    try {
      await deleteTeamMember(id);
      setTeam((prev) => prev.filter((m) => m._id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await updateContent({ vision, mission, thought });
      setHomeHeroSlides(res.homeHeroSlides);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadHeroSlide = async (file: File) => {
    if (uploadingHero) return;
    setUploadingHero(true);
    setError(null);
    try {
      const res = await uploadHomeHeroSlide(file, heroAlt || undefined);
      if (Array.isArray(res.homeHeroSlides)) {
        setHomeHeroSlides(res.homeHeroSlides);
      } else if (res.slide) {
        setHomeHeroSlides((prev) => {
          const exists = prev.some((s) => s._id === res.slide!._id || s.imageUrl === res.slide!.imageUrl);
          return exists ? prev : [...prev, res.slide!];
        });
      }
      setHeroAlt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload hero image");
    } finally {
      setUploadingHero(false);
    }
  };

  const handleDeleteHeroSlide = async (id: string) => {
    if (deletingHeroId) return;
    setDeletingHeroId(id);
    setError(null);
    try {
      const res = await deleteHomeHeroSlide(id);
      if (Array.isArray(res.homeHeroSlides)) {
        setHomeHeroSlides(res.homeHeroSlides);
      } else {
        setHomeHeroSlides((prev) => prev.filter((s) => s._id !== id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete slide");
    } finally {
      setDeletingHeroId(null);
    }
  };

  const [activeTab, setActiveTab] = useState<"app_content" | "hero_slides" | "team_members" | "social_info">("app_content");

  const handleSaveSocial = async () => {
    setSavingSocial(true);
    setError(null);
    setSuccess(false);
    try {
      await updateSocial(social);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save social settings");
    } finally {
      setSavingSocial(false);
    }
  };

  return (
    <>
      <PageMeta title="Content Management | Admin" description="Manage Vision, Mission, Hero Slides, Team Members, and Social Info" />
      <PageBreadcrumb pageTitle="Content Management" />
      <div className="space-y-6">
        {/* Top Overview & Shortcuts */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Content Management Hub
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage all app branding, copy, banner slides, store items, and public metadata in one organized place.
              </p>
            </div>
          </div>

          {/* Quick Nav Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <a
              href="/store-management"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-500 bg-gray-50/50 dark:bg-gray-800/40 transition group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                🛍️
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Store & Products →
                </div>
                <div className="text-[11px] text-gray-500">Categories, items & orders</div>
              </div>
            </a>

            <a
              href="/push-notifications"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-500 bg-gray-50/50 dark:bg-gray-800/40 transition group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                🔔
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Push Notifications →
                </div>
                <div className="text-[11px] text-gray-500">Broadcast app announcements</div>
              </div>
            </a>

            <a
              href="/faq"
              className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-500 bg-gray-50/50 dark:bg-gray-800/40 transition group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                ❓
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  FAQ Management →
                </div>
                <div className="text-[11px] text-gray-500">Help center questions & answers</div>
              </div>
            </a>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-4">
          {[
            { key: "app_content", label: "Vision & Mission", icon: "✨" },
            { key: "hero_slides", label: "Banner Slides", icon: "🖼️" },
            { key: "team_members", label: "Our Team", icon: "👥" },
            { key: "social_info", label: "Social & Office Info", icon: "🌐" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 px-2 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === tab.key
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 text-sm text-green-600 bg-green-50 rounded-lg dark:bg-green-900/20 dark:text-green-400">
            Content saved successfully.
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading content...</div>
        ) : (
          <div className="space-y-6">
            {/* TAB 1: App Content (Vision, Mission, Thought) */}
            {activeTab === "app_content" && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <Label htmlFor="vision" className="mb-2 block text-base font-medium">
                    Our Vision
                  </Label>
                  <TextArea
                    value={vision}
                    onChange={setVision}
                    rows={5}
                    placeholder="Enter vision text..."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <Label htmlFor="mission" className="mb-2 block text-base font-medium">
                    Our Mission
                  </Label>
                  <TextArea
                    value={mission}
                    onChange={setMission}
                    rows={5}
                    placeholder="Enter mission text..."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <Label htmlFor="thought" className="mb-2 block text-base font-medium">
                    Thought of the Day
                  </Label>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    Short motivational line shown in the mobile app / VR interface.
                  </p>
                  <TextArea
                    value={thought}
                    onChange={setThought}
                    rows={3}
                    placeholder="Enter today's thought..."
                    className="min-h-[90px]"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button onClick={handleSave} disabled={saving} className="bg-brand-500 hover:bg-brand-600 text-white">
                    {saving ? "Saving..." : "Save App Content"}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: Home Hero Carousel */}
            {activeTab === "hero_slides" && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Home Hero Banner Carousel
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Upload and manage high-resolution banner slides displayed on the mobile app home screen.
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="min-w-[240px] flex-1">
                    <Label className="mb-1">Slide Description / Alt Text (Optional)</Label>
                    <Input
                      value={heroAlt}
                      onChange={(e) => setHeroAlt(e.target.value)}
                      placeholder="e.g. Welcome to Mind's AI platform"
                    />
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand-500 bg-brand-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-600 transition shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploadingHero ? "Uploading..." : "Upload Slide Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingHero}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadHeroSlide(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {homeHeroSlides.map((s) => (
                    <div
                      key={s._id}
                      className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
                    >
                      <div className="relative aspect-[5/2] bg-gray-100 dark:bg-gray-800">
                        <img
                          src={s.imageUrl}
                          alt={s.alt || "Hero slide"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 p-3">
                        <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300" title={s.alt}>
                          {s.alt || "Banner Slide"}
                        </span>
                        <button
                          type="button"
                          disabled={deletingHeroId === s._id}
                          onClick={() => {
                            if (window.confirm("Remove this slide from the carousel?")) {
                              void handleDeleteHeroSlide(s._id);
                            }
                          }}
                          className="shrink-0 text-xs font-semibold text-rose-500 hover:text-rose-700 underline disabled:opacity-50"
                        >
                          {deletingHeroId === s._id ? "Deleting..." : "Delete Slide"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {homeHeroSlides.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No slides active. Upload your first banner slide image above!
                  </p>
                )}
              </div>
            )}

            {/* TAB 3: Our Team Members */}
            {activeTab === "team_members" && (
              <DndProvider backend={HTML5Backend}>
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Our Team Members
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Drag and drop to reorder team members. The order here is how they appear on the public website.
                      </p>
                    </div>
                    {orderChanged && (
                      <Button
                        onClick={handleSaveOrder}
                        disabled={savingOrder}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0 flex items-center gap-2"
                      >
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                        </span>
                        {savingOrder ? "Saving..." : "Save New Order"}
                      </Button>
                    )}
                  </div>

                  {/* Add new member form */}
                  <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="min-w-[200px]">
                      <Label className="mb-1">Full Name</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Mr. Sai Prasanth AB"
                      />
                    </div>
                    <div className="min-w-[200px]">
                      <Label className="mb-1">Title / Role</Label>
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Founder & CEO"
                      />
                    </div>
                    <Button
                      onClick={handleAddMember}
                      disabled={addingMember || !newName.trim() || !newTitle.trim()}
                      className="bg-brand-500 hover:bg-brand-600 text-white"
                    >
                      {addingMember ? "Adding..." : "+ Add Team Member"}
                    </Button>
                  </div>

                  {orderChanged && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      You have unsaved order changes. Click "Save New Order" to apply them to the live website.
                    </div>
                  )}

                  {/* Team List — Draggable */}
                  <div className="space-y-3">
                    {team.map((m, index) => (
                      <DraggableTeamCard
                        key={m._id}
                        member={m}
                        index={index}
                        moveCard={moveTeamMember}
                        editingId={editingId}
                        editName={editName}
                        editTitle={editTitle}
                        setEditName={setEditName}
                        setEditTitle={setEditTitle}
                        setEditingId={setEditingId}
                        uploadingId={uploadingId}
                        handleUploadImage={handleUploadImage}
                        handleDeleteMember={handleDeleteMember}
                        handleUpdateMember={handleUpdateMember}
                      />
                    ))}
                  </div>
                  {team.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-500">
                      No team members added yet. Add member profile above!
                    </p>
                  )}
                </div>
              </DndProvider>
            )}

            {/* TAB 4: Social & Office Info */}
            {activeTab === "social_info" && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Social Handles & Business Info
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage official social media URLs, office address, and support business hours.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1">Facebook URL</Label>
                    <Input
                      value={social.facebookUrl}
                      onChange={(e) => setSocial({ ...social, facebookUrl: e.target.value })}
                      placeholder="https://facebook.com/mindsai"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Instagram URL</Label>
                    <Input
                      value={social.instagramUrl}
                      onChange={(e) => setSocial({ ...social, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/mindsai"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Twitter / X URL</Label>
                    <Input
                      value={social.twitterUrl}
                      onChange={(e) => setSocial({ ...social, twitterUrl: e.target.value })}
                      placeholder="https://x.com/mindsai"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">LinkedIn URL</Label>
                    <Input
                      value={social.linkedinUrl}
                      onChange={(e) => setSocial({ ...social, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/company/mindsai"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1">Official Office Address</Label>
                    <Input
                      value={social.address}
                      onChange={(e) => setSocial({ ...social, address: e.target.value })}
                      placeholder="e.g. Bangalore, Karnataka, India"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1">Business Operating Hours</Label>
                    <Input
                      value={social.businessHours}
                      onChange={(e) => setSocial({ ...social, businessHours: e.target.value })}
                      placeholder="e.g. Mon - Fri: 9:00 AM - 6:00 PM IST"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSocial} disabled={savingSocial} className="bg-brand-500 hover:bg-brand-600 text-white">
                    {savingSocial ? "Saving..." : "Save Social & Office Info"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
