import { NavLink, Link } from "react-router-dom";
import { BrandMark } from "../auth/AuthLayout";
import { useAuth } from "../../store/auth";

const links = [
  { to: "/", label: "Home" },
  { to: "/goals", label: "Goals" },
  { to: "/activity", label: "Activity" },
  { to: "/settings", label: "Settings" },
];

export function TopNav() {
  const user = useAuth((s) => s.user);
  const initials = ((user?.first_name?.[0] ?? "") + (user?.second_name?.[0] ?? "")).toUpperCase() || "JK";

  return (
    <header className="hidden lg:flex items-center justify-between bg-surface px-8 pt-6">
      <Link to="/" className="flex items-center gap-2.5">
        <BrandMark />
        <span className="text-lg font-semibold text-ink">Wayrvy</span>
      </Link>

      <nav className="flex items-center gap-1 bg-white rounded-full p-1 border border-[#E5E9EF]">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              [
                "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                isActive
                  ? "bg-brand-tint text-brand"
                  : "text-muted hover:text-ink",
              ].join(" ")
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="h-9 w-9 rounded-full bg-brand-tint text-brand grid place-items-center text-xs font-bold">
        {initials}
      </div>
    </header>
  );
}