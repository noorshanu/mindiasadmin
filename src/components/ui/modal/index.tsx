import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "flex h-full w-full flex-col"
    : "relative flex w-full max-h-[min(82vh,640px)] flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-gray-700 dark:bg-gray-900";

  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center overflow-y-auto p-5 sm:p-8 md:p-12">
      {!isFullscreen && (
        <button
          type="button"
          className="fixed inset-0 z-0 h-full w-full bg-slate-900/55 backdrop-blur-md"
          onClick={onClose}
          aria-label="Close dialog backdrop"
        />
      )}
      <div
        ref={modalRef}
        className={`${contentClasses} relative z-10 ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-white sm:right-4 sm:top-4"
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
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export { AdminDialog } from "./AdminDialog";
export type { AdminDialogProps } from "./AdminDialog";
