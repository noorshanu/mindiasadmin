import { useCallback, useEffect, useState } from "react";
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
  fetchSocial,
  updateSocial,
  type TeamMember,
  type SocialSettings,
} from "../lib/api";
import Button from "../components/ui/button/Button";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";

const DEFAULT_VISION =
  "A world where no one has to pretend they're okay. Where silence doesn't mean strength, and asking for help isn't a last option—it's a normal one. We imagine a future where technology doesn't replace human warmth, but holds space until humans can reach each other. Mind's AI dreams of being that quiet presence—the one that listens when the world doesn't, the one that stays when everything feels heavy, the one that reminds you: you're not broken, you're becoming.";

const DEFAULT_MISSION =
  "To be there for the 3 AM thoughts. For the unsent messages. For the feelings that don't have names yet. Our mission is to build an AI that listens without judgment, guides without control, and supports without pretending to replace real humans. We exist to help people slow down, feel seen, and find clarity—one honest conversation at a time. Because healing doesn't always start with answers. Sometimes, it starts with being heard.";

export default function ContentManagement() {
  const [vision, setVision] = useState(DEFAULT_VISION);
  const [mission, setMission] = useState(DEFAULT_MISSION);
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
      setTeam(teamRes.data || []);
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
      setTeam((prev) => [...prev, res.data]);
      setNewName("");
      setNewTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setAddingMember(false);
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
      await updateContent({ vision, mission });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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
      <PageMeta title="Content | Admin" description="Manage Vision & Mission" />
      <PageBreadcrumb pageTitle="Content" />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Vision & Mission
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update the content shown on the app&apos;s about/landing section.
          </p>
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
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <Label htmlFor="vision" className="mb-2 block text-base font-medium">
                Our Vision
              </Label>
              <TextArea
                value={vision}
                onChange={setVision}
                rows={6}
                placeholder="Enter vision text..."
                className="min-h-[140px]"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <Label htmlFor="mission" className="mb-2 block text-base font-medium">
                Our Mission
              </Label>
              <TextArea
                value={mission}
                onChange={setMission}
                rows={6}
                placeholder="Enter mission text..."
                className="min-h-[140px]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Vision & Mission"}
              </Button>
            </div>

            {/* Our Team Section */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
                Our Team
              </h2>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                Add, edit, or remove team members. Click &quot;Upload image&quot; on each card to add their photo (stored on Cloudinary).
              </p>

              {/* Add new member */}
              <div className="mb-6 flex flex-wrap items-end gap-4">
                <div className="min-w-[180px]">
                  <Label className="mb-1">Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Mr. Sai Prasanth AB"
                  />
                </div>
                <div className="min-w-[180px]">
                  <Label className="mb-1">Title</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Founder and CEO"
                  />
                </div>
                <Button
                  onClick={handleAddMember}
                  disabled={addingMember || !newName.trim() || !newTitle.trim()}
                >
                  {addingMember ? "Adding..." : "Add Member"}
                </Button>
              </div>

              {/* Team list */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {team.map((m) => (
                  <div
                    key={m._id}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-600"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl text-gray-400">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-brand-500 bg-brand-500/10 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-500/20 dark:text-brand-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {uploadingId === m._id ? "Uploading..." : "Upload image"}
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
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {editingId === m._id ? (
                      <div className="space-y-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name"
                        />
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateMember(m._id)}
                          >
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
                        <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{m.title}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m._id);
                            setEditName(m.name);
                            setEditTitle(m.title);
                          }}
                          className="mt-2 text-xs text-brand-500 hover:underline"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {team.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">No team members yet. Add one above.</p>
              )}
            </div>

            {/* Social & Office Info Section */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-4">
              <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                Social & Office Info
              </h2>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Manage social media links and office details used on the contact/support page.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1">Facebook URL</Label>
                  <Input
                    value={social.facebookUrl || ""}
                    onChange={(e) => setSocial((s) => ({ ...s, facebookUrl: e.target.value }))}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div>
                  <Label className="mb-1">Twitter URL</Label>
                  <Input
                    value={social.twitterUrl || ""}
                    onChange={(e) => setSocial((s) => ({ ...s, twitterUrl: e.target.value }))}
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>
                <div>
                  <Label className="mb-1">Instagram URL</Label>
                  <Input
                    value={social.instagramUrl || ""}
                    onChange={(e) => setSocial((s) => ({ ...s, instagramUrl: e.target.value }))}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>
                <div>
                  <Label className="mb-1">LinkedIn URL</Label>
                  <Input
                    value={social.linkedinUrl || ""}
                    onChange={(e) => setSocial((s) => ({ ...s, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/company/yourcompany"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1">Office Address</Label>
                <TextArea
                  value={social.address || ""}
                  onChange={(val) => setSocial((s) => ({ ...s, address: val }))}
                  rows={3}
                  placeholder="Enter office address..."
                />
              </div>

              <div>
                <Label className="mb-1">Business Hours</Label>
                <TextArea
                  value={social.businessHours || ""}
                  onChange={(val) => setSocial((s) => ({ ...s, businessHours: val }))}
                  rows={3}
                  placeholder={"Monday – Friday: 9:00 AM – 6:00 PM\nWeekend: 10:00 AM – 4:00 PM"}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSocial} disabled={savingSocial}>
                  {savingSocial ? "Saving..." : "Save Social & Office Info"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
