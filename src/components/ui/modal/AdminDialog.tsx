import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type AdminDialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Sticky bottom actions (Cancel / Save). */
  footer?: ReactNode;
  /** Tailwind max-width class. Default: max-w-lg */
  maxWidthClass?: string;
};

/**
 * Polished admin dialog: margin from viewport edges, sticky header + close X,
 * scrollable body, optional sticky footer. Portaled above the navbar.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = "max-w-lg",
}: AdminDialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-5 sm:p-8 md:p-12">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-label="Close dialog backdrop"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex w-full ${maxWidthClass} max-h-[min(82vh,640px)] flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-gray-700 dark:bg-gray-900`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="min-w-0 pr-1">
            <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
              {title}
            </h3>
            {description ? (
              <div className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {description}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children ?? null}
        </div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/90 px-5 py-3 dark:border-gray-800 dark:bg-gray-950/50">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
