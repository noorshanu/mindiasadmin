type AdminAlertProps = {
  variant: "error" | "success" | "warning" | "info"
  message: string
  onDismiss?: () => void
}

const styles = {
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
  info: "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-300",
}

export default function AdminAlert({ variant, message, onDismiss }: AdminAlertProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${styles[variant]}`}
      role="alert"
    >
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium opacity-70 transition hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      ) : null}
    </div>
  )
}
