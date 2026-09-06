import type { ReactNode } from "react"
import Button from "../ui/button/Button"

type AdminEmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export default function AdminEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900/40">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-5 bg-brand-500 text-white hover:bg-brand-600" size="sm">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
