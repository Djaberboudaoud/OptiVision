import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Lock, User, Glasses } from "lucide-react";

export default function AdminLogin() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;

        setLoading(true);
        try {
            await login(username, password);
            toast({
                title: "✅ مرحباً بك",
                description: "تم تسجيل الدخول بنجاح",
            });
            navigate("/DjAbEr/gerer_stock", { replace: true });
        } catch (err: any) {
            toast({
                title: "❌ خطأ في تسجيل الدخول",
                description: err.message || "اسم المستخدم أو كلمة المرور غير صحيحة",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <style>{`
        .admin-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 40%, #24243e 100%);
          position: relative;
          overflow: hidden;
        }
        .admin-login-page::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 70% 80%, rgba(168, 85, 247, 0.06) 0%, transparent 50%);
          animation: bgFloat 20s ease-in-out infinite;
        }
        @keyframes bgFloat {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(2%, -2%) rotate(1deg); }
          66% { transform: translate(-1%, 1%) rotate(-0.5deg); }
        }
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          margin: 1rem;
          padding: 2.5rem;
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4),
                      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        }
        .login-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .login-logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
        }
        .login-title {
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.25rem;
          letter-spacing: -0.02em;
        }
        .login-subtitle {
          text-align: center;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 2rem;
        }
        .login-field {
          margin-bottom: 1.25rem;
        }
        .login-field label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .login-input-wrap .input-icon {
          position: absolute;
          left: 14px;
          color: rgba(255, 255, 255, 0.3);
          pointer-events: none;
          z-index: 2;
        }
        .login-input-wrap input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #fff;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .login-input-wrap input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .login-input-wrap input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          padding: 4px;
          z-index: 2;
          transition: color 0.2s;
        }
        .password-toggle:hover {
          color: rgba(255, 255, 255, 0.6);
        }
        .login-btn {
          width: 100%;
          padding: 0.85rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 0.5rem;
          position: relative;
          overflow: hidden;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(99, 102, 241, 0.35);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.25);
        }
      `}</style>

            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">
                        <Glasses className="w-6 h-6 text-white" />
                    </div>
                </div>
                <h1 className="login-title">OptiVision Admin</h1>
                <p className="login-subtitle">لوحة تحكم إدارة المخزون</p>

                <form onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label>اسم المستخدم</label>
                        <div className="login-input-wrap">
                            <User className="input-icon w-4 h-4" />
                            <input
                                type="text"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="login-field">
                        <label>كلمة المرور</label>
                        <div className="login-input-wrap">
                            <Lock className="input-icon w-4 h-4" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading || !username.trim() || !password.trim()}
                    >
                        {loading ? "جاري الدخول..." : "تسجيل الدخول"}
                    </button>
                </form>

                <div className="login-footer">
                    Smart Frame Guide — Admin Panel
                </div>
            </div>
        </div>
    );
}
