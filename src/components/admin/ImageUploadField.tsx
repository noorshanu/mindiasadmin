import { useRef, useState } from "react"
import { User } from "lucide-react"
import Label from "../form/Label"

type ImageUploadFieldProps = {
  label?: string
  hint?: string
  currentUrl?: string
  previewUrl?: string | null
  onFileSelect: (file: File | null) => void
  disabled?: boolean
  aspect?: "square" | "wide"
}

export default function ImageUploadField({
  label = "Profile photo",
  hint = "JPG or PNG, recommended under 2MB",
  currentUrl,
  previewUrl,
  onFileSelect,
  disabled = false,
  aspect = "square",
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const displayUrl = previewUrl ?? localPreview ?? currentUrl

  const handleChange = (file: File | null) => {
    if (localPreview) URL.revokeObjectURL(localPreview)
    if (file) {
      setLocalPreview(URL.createObjectURL(file))
      onFileSelect(file)
      return
    }
    setLocalPreview(null)
    onFileSelect(null)
  }

  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div
          className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 ${
            aspect === "square" ? "h-28 w-28" : "h-24 w-full max-w-xs"
          }`}
        >
          {displayUrl ? (
            <img src={displayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <User className="h-10 w-10" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {displayUrl ? "Change photo" : "Upload photo"}
            </button>
            {displayUrl ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  handleChange(null)
                  if (inputRef.current) inputRef.current.value = ""
                }}
                className="inline-flex items-center rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              handleChange(file)
            }}
          />
        </div>
      </div>
    </div>
  )
}
