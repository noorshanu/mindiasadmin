import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import {
  GripVertical,
  Pencil,
  Trash2,
  Users,
  Sparkles,
  ImageIcon,
  Globe,
  Store,
  Bell,
  HelpCircle,
  Plus,
  Save,
} from "lucide-react"
import PageMeta from "../components/common/PageMeta"
import PageBreadcrumb from "../components/common/PageBreadCrumb"
import AdminPageHeader from "../components/admin/AdminPageHeader"
import AdminAlert from "../components/admin/AdminAlert"
import AdminEmptyState from "../components/admin/AdminEmptyState"
import AdminConfirmDialog from "../components/admin/AdminConfirmDialog"
import ImageUploadField from "../components/admin/ImageUploadField"
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
  ensureArray,
  type TeamMember,
  type SocialSettings,
  type HomeHeroSlide,
} from "../lib/api"
import Button from "../components/ui/button/Button"
import TextArea from "../components/form/input/TextArea"
import Label from "../components/form/Label"
import Input from "../components/form/input/InputField"
import { AdminDialog } from "../components/ui/modal/AdminDialog"

const DEFAULT_VISION =
  "A world where no one has to pretend they're okay. Where silence doesn't mean strength, and asking for help isn't a last option—it's a normal one. We imagine a future where technology doesn't replace human warmth, but holds space until humans can reach each other. Mind's AI dreams of being that quiet presence—the one that listens when the world doesn't, the one that stays when everything feels heavy, the one that reminds you: you're not broken, you're becoming."

const DEFAULT_MISSION =
  "To be there for the 3 AM thoughts. For the unsent messages. For the feelings that don't have names yet. Our mission is to build an AI that listens without judgment, guides without control, and supports without pretending to replace real humans. We exist to help people slow down, feel seen, and find clarity—one honest conversation at a time. Because healing doesn't always start with answers. Sometimes, it starts with being heard."

const DEFAULT_THOUGHT = "Small steps still move you forward. Be gentle with yourself today."

const TEAM_CARD_TYPE = "TEAM_CARD"

type ContentTab = "app_content" | "hero_slides" | "team_members" | "social_info"

const TABS: { key: ContentTab; label: string; icon: React.ReactNode }[] = [
  { key: "app_content", label: "Vision & Mission", icon: <Sparkles className="h-4 w-4" /> },
  { key: "hero_slides", label: "Banner Slides", icon: <ImageIcon className="h-4 w-4" /> },
  { key: "team_members", label: "Our Team", icon: <Users className="h-4 w-4" /> },
  { key: "social_info", label: "Social & Office", icon: <Globe className="h-4 w-4" /> },
]

type DraggableTeamCardProps = {
  member: TeamMember
  index: number
  moveCard: (dragIndex: number, hoverIndex: number) => void
  onEdit: (member: TeamMember) => void
  onDelete: (member: TeamMember) => void
}

function DraggableTeamCard({ member, index, moveCard, onEdit, onDelete }: DraggableTeamCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag, preview] = useDrag({
    type: TEAM_CARD_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  })

  const [{ isOver }, drop] = useDrop({
    accept: TEAM_CARD_TYPE,
    hover(item: { index: number }) {
      if (!cardRef.current) return
      const dragIndex = item.index
      const hoverIndex = index
      if (dragIndex === hoverIndex) return
      moveCard(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  })

  preview(drop(cardRef))

  return (
    <div
      ref={cardRef}
      className={`group flex items-center gap-4 rounded-xl border bg-white p-4 transition-all dark:bg-gray-900 ${
        isDragging
          ? "scale-[0.98] border-brand-400 opacity-50 shadow-lg"
          : isOver
            ? "border-brand-400 bg-brand-50/40 shadow-md dark:bg-brand-950/20"
            : "border-gray-200 shadow-sm hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
      }`}
    >
      <button
        type="button"
        ref={(node) => { drag(node) }}
        className="shrink-0 cursor-grab rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-800"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
        {index + 1}
      </div>

      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
        {member.imageUrl ? (
          <img src={member.imageUrl} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <Users className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900 dark:text-white">{member.name}</p>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">{member.title}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(member)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(member)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  )
}

export default function ContentManagement() {
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get("tab")
  const initialTab: ContentTab =
    tabFromUrl === "team" ? "team_members" : tabFromUrl === "hero" ? "hero_slides" : tabFromUrl === "social" ? "social_info" : "app_content"

  const [activeTab, setActiveTab] = useState<ContentTab>(initialTab)
  const [vision, setVision] = useState(DEFAULT_VISION)
  const [mission, setMission] = useState(DEFAULT_MISSION)
  const [thought, setThought] = useState(DEFAULT_THOUGHT)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingSocial, setSavingSocial] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [social, setSocial] = useState<SocialSettings>({
    facebookUrl: "",
    twitterUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    address: "",
    businessHours: "",
  })
  const [homeHeroSlides, setHomeHeroSlides] = useState<HomeHeroSlide[]>([])
  const [heroAlt, setHeroAlt] = useState("")
  const [uploadingHero, setUploadingHero] = useState(false)
  const [deletingHeroId, setDeletingHeroId] = useState<string | null>(null)
  const [orderChanged, setOrderChanged] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const originalOrderRef = useRef<string[]>([])

  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [formName, setFormName] = useState("")
  const [formTitle, setFormTitle] = useState("")
  const [formPhoto, setFormPhoto] = useState<File | null>(null)
  const [savingMember, setSavingMember] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null)
  const [deletingMember, setDeletingMember] = useState(false)
  const [deleteHeroTarget, setDeleteHeroTarget] = useState<HomeHeroSlide | null>(null)

  const showSuccess = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 3500)
  }

  const loadContent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [contentRes, teamRes, socialRes] = await Promise.all([
        fetchContent(),
        fetchTeam(),
        fetchSocial(),
      ])
      setVision(contentRes.vision || DEFAULT_VISION)
      setMission(contentRes.mission || DEFAULT_MISSION)
      setThought(typeof contentRes.thought === "string" ? contentRes.thought : DEFAULT_THOUGHT)
      setHomeHeroSlides(ensureArray<HomeHeroSlide>(contentRes.homeHeroSlides))
      const teamData = ensureArray<TeamMember>(teamRes.data)
      setTeam(teamData)
      originalOrderRef.current = teamData.map((m) => m._id)
      setOrderChanged(false)
      setSocial({
        facebookUrl: socialRes.data.facebookUrl || "",
        twitterUrl: socialRes.data.twitterUrl || "",
        instagramUrl: socialRes.data.instagramUrl || "",
        linkedinUrl: socialRes.data.linkedinUrl || "",
        address: socialRes.data.address || "",
        businessHours: socialRes.data.businessHours || "",
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContent()
  }, [loadContent])

  useEffect(() => {
    if (tabFromUrl === "team") setActiveTab("team_members")
    else if (tabFromUrl === "hero") setActiveTab("hero_slides")
    else if (tabFromUrl === "social") setActiveTab("social_info")
  }, [tabFromUrl])

  const openAddMember = () => {
    setEditingMember(null)
    setFormName("")
    setFormTitle("")
    setFormPhoto(null)
    setTeamDialogOpen(true)
  }

  const openEditMember = (member: TeamMember) => {
    setEditingMember(member)
    setFormName(member.name)
    setFormTitle(member.title)
    setFormPhoto(null)
    setTeamDialogOpen(true)
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formTitle.trim()) return

    setSavingMember(true)
    setError(null)
    try {
      if (editingMember) {
        let updated = editingMember
        const textChanged =
          formName.trim() !== editingMember.name || formTitle.trim() !== editingMember.title
        if (textChanged) {
          const res = await updateTeamMember(editingMember._id, {
            name: formName.trim(),
            title: formTitle.trim(),
          })
          updated = res.data
        }
        if (formPhoto) {
          const imgRes = await uploadTeamMemberImage(editingMember._id, formPhoto)
          updated = imgRes.data
        }
        setTeam((prev) => prev.map((m) => (m._id === editingMember._id ? updated : m)))
        showSuccess(`${updated.name} updated successfully`)
      } else {
        const res = await addTeamMember({ name: formName.trim(), title: formTitle.trim() })
        let created = res.data
        if (formPhoto) {
          const imgRes = await uploadTeamMemberImage(created._id, formPhoto)
          created = imgRes.data
        }
        setTeam((prev) => {
          const next = [...prev, created]
          originalOrderRef.current = next.map((m) => m._id)
          return next
        })
        showSuccess(`${created.name} added to the team`)
      }
      setTeamDialogOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save team member")
    } finally {
      setSavingMember(false)
    }
  }

  const handleConfirmDeleteMember = async () => {
    if (!deleteTarget) return
    setDeletingMember(true)
    setError(null)
    try {
      await deleteTeamMember(deleteTarget._id)
      setTeam((prev) => prev.filter((m) => m._id !== deleteTarget._id))
      showSuccess(`${deleteTarget.name} removed from team`)
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete member")
    } finally {
      setDeletingMember(false)
    }
  }

  const moveTeamMember = useCallback((dragIndex: number, hoverIndex: number) => {
    setTeam((prev) => {
      const next = [...prev]
      const [removed] = next.splice(dragIndex, 1)
      next.splice(hoverIndex, 0, removed)
      return next
    })
    setOrderChanged(true)
  }, [])

  const handleSaveOrder = async () => {
    setSavingOrder(true)
    setError(null)
    try {
      const orderedIds = team.map((m) => m._id)
      const res = await reorderTeam(orderedIds)
      setTeam(ensureArray<TeamMember>(res.data))
      originalOrderRef.current = ensureArray<TeamMember>(res.data).map((m) => m._id)
      setOrderChanged(false)
      showSuccess("Team order saved — live on website")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save order")
    } finally {
      setSavingOrder(false)
    }
  }

  const handleRevertOrder = () => {
    const originalIds = originalOrderRef.current
    setTeam((prev) => {
      const map = new Map(prev.map((m) => [m._id, m]))
      return originalIds.map((id) => map.get(id)).filter(Boolean) as TeamMember[]
    })
    setOrderChanged(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await updateContent({ vision, mission, thought })
      setHomeHeroSlides(ensureArray<HomeHeroSlide>(res.homeHeroSlides))
      showSuccess("Vision, mission & thought saved")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSocial = async () => {
    setSavingSocial(true)
    setError(null)
    try {
      await updateSocial(social)
      showSuccess("Social & office info saved")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save social settings")
    } finally {
      setSavingSocial(false)
    }
  }

  const handleUploadHeroSlide = async (file: File) => {
    if (uploadingHero) return
    setUploadingHero(true)
    setError(null)
    try {
      const res = await uploadHomeHeroSlide(file, heroAlt || undefined)
      if (Array.isArray(res.homeHeroSlides)) {
        setHomeHeroSlides(ensureArray<HomeHeroSlide>(res.homeHeroSlides))
      } else if (res.slide) {
        setHomeHeroSlides((prev) => {
          const exists = prev.some((s) => s._id === res.slide!._id || s.imageUrl === res.slide!.imageUrl)
          return exists ? prev : [...prev, res.slide!]
        })
      }
      setHeroAlt("")
      showSuccess("Banner slide uploaded")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload hero image")
    } finally {
      setUploadingHero(false)
    }
  }

  const handleDeleteHeroSlide = async () => {
    if (!deleteHeroTarget) return
    setDeletingHeroId(deleteHeroTarget._id)
    setError(null)
    try {
      const res = await deleteHomeHeroSlide(deleteHeroTarget._id)
      if (Array.isArray(res.homeHeroSlides)) {
        setHomeHeroSlides(ensureArray<HomeHeroSlide>(res.homeHeroSlides))
      } else {
        setHomeHeroSlides((prev) => prev.filter((s) => s._id !== deleteHeroTarget._id))
      }
      showSuccess("Banner slide removed")
      setDeleteHeroTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete slide")
    } finally {
      setDeletingHeroId(null)
    }
  }

  const shortcuts = [
    { to: "/store-management", icon: Store, label: "Store & Products", desc: "Categories, items & orders" },
    { to: "/push-notifications", icon: Bell, label: "Push Notifications", desc: "Broadcast announcements" },
    { to: "/faq", icon: HelpCircle, label: "FAQ Management", desc: "Help center Q&A" },
  ]

  return (
    <>
      <PageMeta title="Content Management | Admin" description="Manage app content, team, banners, and social info" />
      <PageBreadcrumb pageTitle="Content Management" />

      <div className="space-y-6">
        <AdminPageHeader
          title="Content Management"
          description="Update what users see on the website and mobile app — vision, banners, team profiles, and contact details."
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {shortcuts.map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-400 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-600"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`mb-[-1px] inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {error ? <AdminAlert variant="error" message={error} onDismiss={() => setError(null)} /> : null}
        {success ? <AdminAlert variant="success" message={success} onDismiss={() => setSuccess(null)} /> : null}

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === "app_content" && (
              <div className="space-y-4">
                {[
                  { id: "vision", label: "Our Vision", value: vision, set: setVision, rows: 5 },
                  { id: "mission", label: "Our Mission", value: mission, set: setMission, rows: 5 },
                  {
                    id: "thought",
                    label: "Thought of the Day",
                    value: thought,
                    set: setThought,
                    rows: 3,
                    hint: "Short line shown in the mobile app.",
                  },
                ].map((field) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <Label htmlFor={field.id} className="mb-2 block font-medium">
                      {field.label}
                    </Label>
                    {"hint" in field && field.hint ? (
                      <p className="mb-2 text-xs text-gray-500">{field.hint}</p>
                    ) : null}
                    <TextArea
                      value={field.value}
                      onChange={field.set}
                      rows={field.rows}
                      className="min-h-[100px]"
                    />
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="bg-brand-500 text-white hover:bg-brand-600"
                    startIcon={<Save className="h-4 w-4" />}
                  >
                    {saving ? "Saving…" : "Save content"}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "hero_slides" && (
              <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <AdminPageHeader
                  title="Home banner carousel"
                  description="Images shown on the app home screen. Upload high-quality landscape photos."
                />

                <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="min-w-[220px] flex-1">
                    <Label className="mb-1.5">Alt text (optional)</Label>
                    <Input value={heroAlt} onChange={(e) => setHeroAlt(e.target.value)} placeholder="Describe the slide" />
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                    <ImageIcon className="h-4 w-4" />
                    {uploadingHero ? "Uploading…" : "Upload slide"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingHero}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleUploadHeroSlide(f)
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>

                {homeHeroSlides.length === 0 ? (
                  <AdminEmptyState
                    title="No banner slides yet"
                    description="Upload your first image to show on the home screen."
                    icon={<ImageIcon className="h-6 w-6" />}
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {homeHeroSlides.map((slide) => (
                      <div
                        key={slide._id}
                        className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="aspect-[5/2] bg-gray-100 dark:bg-gray-800">
                          <img src={slide.imageUrl} alt={slide.alt || "Banner"} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
                          <span className="truncate text-xs text-gray-600 dark:text-gray-400">
                            {slide.alt || "Banner slide"}
                          </span>
                          <button
                            type="button"
                            disabled={deletingHeroId === slide._id}
                            onClick={() => setDeleteHeroTarget(slide)}
                            className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "team_members" && (
              <DndProvider backend={HTML5Backend}>
                <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <AdminPageHeader
                    title="Our Team"
                    description="Drag cards to change display order on the public website. Click Edit to update name, role, and photo together."
                    actions={
                      <div className="flex flex-wrap gap-2">
                        {orderChanged ? (
                          <>
                            <Button variant="outline" size="sm" onClick={handleRevertOrder}>
                              Revert order
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => void handleSaveOrder()}
                              disabled={savingOrder}
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              {savingOrder ? "Saving…" : "Save order"}
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          onClick={openAddMember}
                          className="bg-brand-500 text-white hover:bg-brand-600"
                          startIcon={<Plus className="h-4 w-4" />}
                        >
                          Add member
                        </Button>
                      </div>
                    }
                  />

                  {orderChanged ? (
                    <AdminAlert
                      variant="warning"
                      message='Order changed — click "Save order" to publish on the website.'
                    />
                  ) : null}

                  {team.length === 0 ? (
                    <AdminEmptyState
                      title="No team members yet"
                      description="Add your first team profile with name, role, and photo."
                      actionLabel="Add team member"
                      onAction={openAddMember}
                      icon={<Users className="h-6 w-6" />}
                    />
                  ) : (
                    <div className="space-y-2">
                      {team.map((member, index) => (
                        <DraggableTeamCard
                          key={member._id}
                          member={member}
                          index={index}
                          moveCard={moveTeamMember}
                          onEdit={openEditMember}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </DndProvider>
            )}

            {activeTab === "social_info" && (
              <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <AdminPageHeader
                  title="Social & office info"
                  description="Links and contact details shown in the app footer and contact sections."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "facebookUrl" as const, label: "Facebook URL", ph: "https://facebook.com/…" },
                    { key: "instagramUrl" as const, label: "Instagram URL", ph: "https://instagram.com/…" },
                    { key: "twitterUrl" as const, label: "Twitter / X URL", ph: "https://x.com/…" },
                    { key: "linkedinUrl" as const, label: "LinkedIn URL", ph: "https://linkedin.com/…" },
                  ].map((field) => (
                    <div key={field.key}>
                      <Label className="mb-1.5">{field.label}</Label>
                      <Input
                        value={social[field.key]}
                        onChange={(e) => setSocial({ ...social, [field.key]: e.target.value })}
                        placeholder={field.ph}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5">Office address</Label>
                    <Input
                      value={social.address}
                      onChange={(e) => setSocial({ ...social, address: e.target.value })}
                      placeholder="City, state, country"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5">Business hours</Label>
                    <Input
                      value={social.businessHours}
                      onChange={(e) => setSocial({ ...social, businessHours: e.target.value })}
                      placeholder="Mon – Fri, 9 AM – 6 PM IST"
                    />
                  </div>
                </div>
                <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
                  <Button
                    onClick={() => void handleSaveSocial()}
                    disabled={savingSocial}
                    className="bg-brand-500 text-white hover:bg-brand-600"
                  >
                    {savingSocial ? "Saving…" : "Save social info"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AdminDialog
        open={teamDialogOpen}
        onClose={() => !savingMember && setTeamDialogOpen(false)}
        title={editingMember ? "Edit team member" : "Add team member"}
        description="Name, role, and photo are saved together. Drag cards on the list to change order on the website."
        maxWidthClass="max-w-md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setTeamDialogOpen(false)} disabled={savingMember}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="team-member-form"
              size="sm"
              disabled={savingMember || !formName.trim() || !formTitle.trim()}
              className="bg-brand-500 text-white hover:bg-brand-600"
            >
              {savingMember ? "Saving…" : editingMember ? "Save changes" : "Add member"}
            </Button>
          </>
        }
      >
        <form id="team-member-form" onSubmit={handleSaveMember} className="space-y-5">
          <ImageUploadField
            currentUrl={editingMember?.imageUrl}
            onFileSelect={setFormPhoto}
            disabled={savingMember}
          />
          <div>
            <Label className="mb-1.5">Full name</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Sai Prasanth AB"
              disabled={savingMember}
            />
          </div>
          <div>
            <Label className="mb-1.5">Title / role</Label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Founder & CEO"
              disabled={savingMember}
            />
          </div>
        </form>
      </AdminDialog>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deletingMember && setDeleteTarget(null)}
        title="Remove team member?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed from the public team section. This cannot be undone.`
            : undefined
        }
        confirmLabel="Remove"
        loading={deletingMember}
        onConfirm={() => void handleConfirmDeleteMember()}
      />

      <AdminConfirmDialog
        open={Boolean(deleteHeroTarget)}
        onClose={() => !deletingHeroId && setDeleteHeroTarget(null)}
        title="Remove banner slide?"
        description="This slide will no longer appear in the home carousel."
        confirmLabel="Remove slide"
        loading={Boolean(deletingHeroId)}
        onConfirm={() => void handleDeleteHeroSlide()}
      />
    </>
  )
}
