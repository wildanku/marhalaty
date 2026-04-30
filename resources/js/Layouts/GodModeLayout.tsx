import { Link, router } from "@inertiajs/react";
import { ReactNode } from "react";

interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface GodModeLayoutProps {
  admin: Admin;
  children: ReactNode;
  title?: string;
}

const navItems = [
  { href: "/god-mode", label: "Dashboard", icon: "dashboard" },
  { href: "/god-mode/users", label: "Users", icon: "group" },
  { href: "/god-mode/events", label: "Events", icon: "event" },
  { href: "/god-mode/consulates", label: "Consulates", icon: "location_city" },
];

export default function GodModeLayout({ admin, children, title }: GodModeLayoutProps) {
  const handleLogout = () => {
    router.post("/god-mode/logout");
  };

  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex font-body">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-[#161b22] border-r border-white/5 fixed left-0 top-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                bolt
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-white font-headline tracking-tight leading-none">God Mode</p>
              <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = currentPath === item.href || (item.href !== "/god-mode" && currentPath.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin Profile */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <span className="text-emerald-400 text-sm font-bold">
                {admin.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{admin.name}</p>
              <p className="text-xs text-white/40 uppercase tracking-wider">{admin.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-[#0f1117]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <h1 className="text-base font-semibold text-white font-headline">{title}</h1>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
            target="_blank"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            View Site
          </Link>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
