import { ReactNode } from "react";
import { Link } from "react-router-dom";

export type AppSection =
  | "dashboard"
  | "investors"
  | "reports"
  | "activity"
  | "audit"
  | "settings"
  | "help";

type AppShellProps = {
  active: AppSection;
  children: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  primaryActionHref?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
};

const navItems: { key: AppSection; label: string; icon: string; to: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", to: "/" },
  { key: "investors", label: "Investor Profiles", icon: "groups", to: "/investors" },
  { key: "activity", label: "Agent Activity", icon: "monitoring", to: "/activity" },
  { key: "reports", label: "Reports", icon: "assessment", to: "/reports" },
  { key: "audit", label: "Audit Logs", icon: "history", to: "/audit" },
  { key: "settings", label: "Settings", icon: "settings", to: "/settings" },
  { key: "help", label: "Help", icon: "help_outline", to: "/help" },
];

export default function AppShell({
  active,
  children,
  searchValue,
  onSearchChange,
  primaryActionHref = "/investors",
  headerLeft,
  headerRight,
}: AppShellProps) {
  const searchDisabled = !onSearchChange;

  return (
    <div className="flex h-screen w-full bg-background text-on-background font-body-md overflow-hidden">
      <aside className="h-screen w-64 flex-shrink-0 flex flex-col py-lg bg-surface border-r border-outline-variant">
        <div className="px-lg mb-xl">
          <div className="text-headline-md font-headline-md font-black tracking-tight text-on-surface">FINTRIX</div>
          <div className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-widest mt-xs">
            Enterprise Advisory
          </div>
        </div>
        <div className="px-md mb-lg">
          <Link
            className="w-full py-sm px-md bg-primary-container text-on-primary text-body-md font-bold rounded flex items-center justify-center gap-sm hover:opacity-90 transition-opacity"
            to={primaryActionHref}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Analysis
          </Link>
        </div>
        <nav className="flex-grow space-y-xs overflow-y-auto px-xs">
          {navItems.map((item) => (
            <Link
              key={item.key}
              className={`flex items-center gap-md px-md py-sm transition-colors duration-150 hover:bg-surface-container-high ${
                active === item.key
                  ? "text-primary font-bold border-r-2 border-primary bg-surface-container-low"
                  : "text-on-surface-variant"
              }`}
              to={item.to}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-label-caps font-label-caps">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-lg mt-auto flex items-center gap-sm">
          <div className="w-8 h-8 rounded-full border border-outline-variant shadow-sm bg-surface-container-high"></div>
          <div className="overflow-hidden">
            <div className="text-body-sm font-bold truncate">FINTRIX Advisory Team</div>
            <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Enterprise Access</div>
          </div>
        </div>
      </aside>

      <div className="flex-grow flex flex-col overflow-hidden">
        <header className="flex justify-between items-center h-16 px-lg w-full bg-surface border-b border-outline-variant">
          {headerLeft ? (
            headerLeft
          ) : (
            <div className="flex items-center gap-xl">
              <div className="relative w-96">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">
                  search
                </span>
                <input
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-xl pr-md py-xs text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all disabled:opacity-60"
                  placeholder="Search investor records..."
                  value={searchValue ?? ""}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  disabled={searchDisabled}
                  type="text"
                />
              </div>
              <nav className="hidden md:flex items-center gap-lg">
                <Link className="text-on-surface-variant hover:text-primary transition-all text-body-md font-medium" to="/investors">
                  Portfolio
                </Link>
                <Link className="text-on-surface-variant hover:text-primary transition-all text-body-md font-medium" to="/audit">
                  Compliance
                </Link>
                <Link className="text-on-surface-variant hover:text-primary transition-all text-body-md font-medium" to="/activity">
                  Risk Monitor
                </Link>
              </nav>
            </div>
          )}
          {headerRight ? (
            headerRight
          ) : (
            <div className="flex items-center gap-md">
              <Link
                className="px-md py-xs border border-outline-variant text-on-surface-variant text-body-md font-medium rounded hover:bg-surface-container-high transition-all"
                to="/reports"
              >
                Export PDF
              </Link>
              <Link className="px-md py-xs bg-primary text-on-primary text-body-md font-bold rounded hover:opacity-90 transition-all" to="/activity">
                Execute Trade
              </Link>
              <div className="h-6 w-px bg-outline-variant mx-xs"></div>
              <Link className="text-on-surface-variant hover:text-primary transition-all p-xs relative" to="/audit">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
              </Link>
              <Link className="text-on-surface-variant hover:text-primary transition-all p-xs" to="/settings">
                <span className="material-symbols-outlined">account_circle</span>
              </Link>
            </div>
          )}
        </header>

        <main className="flex-grow overflow-y-auto p-lg">{children}</main>
      </div>
    </div>
  );
}
