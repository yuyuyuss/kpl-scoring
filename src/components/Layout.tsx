import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Trophy, Home, BarChart3, User, LogIn } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import AuthModal from "@/components/AuthModal";

const navItems = [
  { to: "/", label: "赛程", icon: Home },
  { to: "/ranking", label: "排行榜", icon: BarChart3 },
  { to: "/profile", label: "我的", icon: User },
];

export default function Layout() {
  const { user, username } = useUserStore();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-kpl-bg/80 border-b border-kpl-border">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-kpl-red to-kpl-gold flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide">
              KPL<span className="text-kpl-red">评分</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-kpl-surface2 text-kpl-red"
                      : "text-kpl-muted hover:text-kpl-text hover:bg-kpl-surface2"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-kpl-red to-kpl-gold flex items-center justify-center text-xs font-bold text-white">
                  {(username || user.email?.[0] || "U").toUpperCase()}
                </div>
                <span className="hidden sm:inline text-kpl-text max-w-[80px] truncate">
                  {username || user.email?.split("@")[0]}
                </span>
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="btn-primary !py-1 !px-3 text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">登录</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        <Outlet />
      </main>

      <footer className="border-t border-kpl-border py-4 text-center text-xs text-kpl-muted">
        数据来源：KPL 官方接口 · 社区打分由用户生成 · 仅供娱乐
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
