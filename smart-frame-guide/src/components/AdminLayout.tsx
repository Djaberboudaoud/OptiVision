import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { isAuthenticated, logout, fetchNotifications } from "@/lib/adminApi";
import {
    Package, ShoppingCart, Bell, LogOut, Glasses, Menu, X,
} from "lucide-react";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate("/DjAbEr/login", { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        fetchNotifications(true)
            .then((n) => setUnreadCount(n.length))
            .catch(() => { });
        const interval = setInterval(() => {
            fetchNotifications(true)
                .then((n) => setUnreadCount(n.length))
                .catch(() => { });
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const navItems = [
        { path: "/DjAbEr/gerer_stock", label: "المخزون", labelEn: "Stock", icon: Package },
        { path: "/DjAbEr/orders", label: "الطلبات", labelEn: "Orders", icon: ShoppingCart },
        { path: "/DjAbEr/notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell, badge: unreadCount },
    ];

    if (!isAuthenticated()) return null;

    return (
        <div className="admin-layout">
            <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #0a0a1a;
          color: #e2e8f0;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* ─── Sidebar ─── */
        .admin-sidebar {
          width: 260px;
          background: linear-gradient(180deg, #111128 0%, #0d0d20 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 50;
          transition: transform 0.3s ease;
        }
        .admin-sidebar-brand {
          padding: 1.5rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .admin-sidebar-brand-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .admin-sidebar-brand h2 {
          font-size: 1.1rem;
          font-weight: 700;
          background: linear-gradient(135deg, #c7d2fe, #e9d5ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }
        .admin-sidebar-brand span {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.35);
          display: block;
          margin-top: 2px;
        }
        .admin-sidebar nav {
          flex: 1;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: all 0.2s;
          position: relative;
        }
        .admin-nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.8);
        }
        .admin-nav-item.active {
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
        }
        .admin-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: #6366f1;
          border-radius: 0 4px 4px 0;
        }
        .nav-badge {
          margin-left: auto;
          background: #ef4444;
          color: #fff;
          font-size: 0.7rem;
          font-weight: 700;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
        }
        .admin-sidebar-footer {
          padding: 1rem 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .admin-logout-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(239,68,68,0.7);
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s;
        }
        .admin-logout-btn:hover {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
        }

        /* ─── Main ─── */
        .admin-main {
          flex: 1;
          margin-left: 260px;
          padding: 2rem;
          overflow-y: auto;
        }

        /* ─── Mobile toggle ─── */
        .admin-mobile-toggle {
          display: none;
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 60;
          width: 40px;
          height: 40px;
          background: rgba(99,102,241,0.9);
          border: none;
          border-radius: 10px;
          color: #fff;
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }
        .admin-overlay {
          display: none;
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            transform: translateX(-100%);
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
          .admin-main {
            margin-left: 0;
            padding: 1rem;
            padding-top: 4rem;
          }
          .admin-mobile-toggle {
            display: flex;
          }
          .admin-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 45;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
          }
          .admin-overlay.open {
            opacity: 1;
            pointer-events: all;
          }
        }
      `}</style>

            {/* Mobile Toggle */}
            <button
                className="admin-mobile-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div
                className={`admin-overlay ${sidebarOpen ? "open" : ""}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="admin-sidebar-brand">
                    <div className="admin-sidebar-brand-icon">
                        <Glasses className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2>OptiVision</h2>
                        <span>Admin Panel</span>
                    </div>
                </div>

                <nav>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`admin-nav-item ${location.pathname === item.path ? "active" : ""}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                            {item.badge && item.badge > 0 ? (
                                <span className="nav-badge">{item.badge}</span>
                            ) : null}
                        </Link>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <button className="admin-logout-btn" onClick={logout}>
                        <LogOut className="w-5 h-5" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">{children}</main>
        </div>
    );
}
