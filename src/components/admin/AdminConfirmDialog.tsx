import Button from "../ui/button/Button"
import { AdminDialog } from "../ui/modal/AdminDialog"

type AdminConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "primary"
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onClose,
}: AdminConfirmDialogProps) {
  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            disabled={loading}
            onClick={onConfirm}
            className={
              variant === "danger"
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-brand-500 text-white hover:bg-brand-600"
            }
          >
            {loading ? "Please wait…" : confirmLabel}
          </Button>
        </>
      }
    />
  )
}
