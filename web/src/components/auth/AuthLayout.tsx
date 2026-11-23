import type { ReactNode } from "react";
import { BrandPanel } from "./BrandPanel";

interface AuthLayoutProps {
  children: ReactNode;
  leaving?: boolean;
}

export function AuthLayout({ children, leaving = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface flex">
      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <BrandMark />
            <span className="text-lg font-semibold text-ink">Wayrvy</span>
          </div>
          {children}
        </div>
      </div>
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%]">
        <BrandPanel leaving={leaving} />
      </div>
    </div>
  );
}

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-[10px] bg-brand grid place-items-center shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}