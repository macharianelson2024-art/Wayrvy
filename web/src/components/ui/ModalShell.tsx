import type { ReactNode } from "react";
import { useModalTransition } from "../../hooks/useModalTransition";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Disables click-outside-to-close (e.g. during polling) */
  closeOnBackdrop?: boolean;
}

export function ModalShell({ open, onClose, children, closeOnBackdrop = true }: Props) {
  const { mounted, state } = useModalTransition(open);

  if (!mounted) return null;

  return (
    <div
      className={[
        "fixed inset-0 z-50 grid place-items-center bg-black/40 px-4",
        "transition-opacity duration-200 ease-out",
        state === "open" ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={[
          "bg-white rounded-2xl w-full max-w-md p-6 shadow-xl",
          "transition-all duration-200 ease-out",
          state === "open"
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-3 scale-[0.98]",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}