import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useUserStore } from "@/store/userStore";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
}

export default function AuthModal({
  open,
  onClose,
  defaultMode = "login",
}: Props) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useUserStore();

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        onClose();
      } else {
        if (!username.trim()) {
          setError("请输入昵称");
          setLoading(false);
          return;
        }
        await signUp(email, password, username.trim());
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-kpl-muted hover:text-kpl-text"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-display text-2xl font-bold mb-1">
          {mode === "login" ? "登录" : "注册"}
        </h2>
        <p className="text-sm text-kpl-muted mb-5">
          {mode === "login"
            ? "登录后参与预测与打分"
            : "注册后即可参与社区互动"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="block text-xs text-kpl-muted mb-1">昵称</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="给自己起个名"
                maxLength={20}
                className="w-full bg-kpl-surface2 border border-kpl-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-kpl-red"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-kpl-muted mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-kpl-surface2 border border-kpl-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-kpl-red"
            />
          </div>
          <div>
            <label className="block text-xs text-kpl-muted mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              minLength={6}
              className="w-full bg-kpl-surface2 border border-kpl-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-kpl-red"
            />
          </div>

          {error && (
            <p className="text-sm text-kpl-red bg-kpl-red/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <p className="text-center text-sm text-kpl-muted mt-4">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-kpl-red hover:underline ml-1"
          >
            {mode === "login" ? "注册" : "登录"}
          </button>
        </p>
      </div>
    </div>
  );
}
