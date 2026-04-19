import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
    fetchNotifications,
    markNotificationRead,
    type Notification,
} from "@/lib/adminApi";
import { useToast } from "@/components/ui/use-toast";
import { Bell, BellOff, Check, Filter } from "lucide-react";

export default function AdminNotifications() {
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterUnread, setFilterUnread] = useState(false);

    const load = (unread = false) => {
        setLoading(true);
        fetchNotifications(unread)
            .then(setNotifications)
            .catch((err) =>
                toast({ title: "Error", description: err.message, variant: "destructive" })
            )
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load(filterUnread);
    }, [filterUnread]);

    const handleMarkRead = async (id: number) => {
        try {
            await markNotificationRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            toast({ title: "✅ تم التحديث" });
        } catch (err: any) {
            toast({ title: "❌ خطأ", description: err.message, variant: "destructive" });
        }
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <AdminLayout>
            <style>{`
        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .notif-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .notif-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }
        .notif-count {
          background: rgba(239,68,68,0.15);
          color: #f87171;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }
        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
        }
        .filter-btn.off {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.5);
        }
        .filter-btn.on {
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          border-color: rgba(99,102,241,0.3);
        }

        .notif-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .notif-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          transition: all 0.2s;
        }
        .notif-card:hover {
          border-color: rgba(255,255,255,0.1);
        }
        .notif-card.unread {
          border-left: 3px solid #6366f1;
          background: rgba(99,102,241,0.04);
        }
        .notif-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .notif-card.unread .notif-icon {
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
        }
        .notif-card:not(.unread) .notif-icon {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.3);
        }
        .notif-body {
          flex: 1;
          min-width: 0;
        }
        .notif-msg {
          font-size: 0.9rem;
          color: #e2e8f0;
          line-height: 1.5;
          word-break: break-word;
        }
        .notif-card:not(.unread) .notif-msg {
          color: rgba(255,255,255,0.45);
        }
        .notif-time {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.3);
          margin-top: 4px;
        }
        .notif-actions {
          flex-shrink: 0;
        }
        .mark-read-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: rgba(34,197,94,0.12);
          color: #4ade80;
          transition: all 0.15s;
        }
        .mark-read-btn:hover {
          background: rgba(34,197,94,0.25);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255,255,255,0.3);
        }
        .empty-state svg { margin-bottom: 1rem; opacity: 0.3; }
      `}</style>

            <div className="notif-header">
                <div className="notif-title">
                    <h1>الإشعارات</h1>
                    {unreadCount > 0 && <span className="notif-count">{unreadCount} غير مقروء</span>}
                </div>
                <button
                    className={`filter-btn ${filterUnread ? "on" : "off"}`}
                    onClick={() => setFilterUnread(!filterUnread)}
                >
                    <Filter className="w-4 h-4" />
                    {filterUnread ? "غير المقروءة فقط" : "الكل"}
                </button>
            </div>

            {loading ? (
                <div className="empty-state">جاري التحميل...</div>
            ) : notifications.length === 0 ? (
                <div className="empty-state">
                    <BellOff className="w-12 h-12" />
                    <p>لا توجد إشعارات</p>
                </div>
            ) : (
                <div className="notif-list">
                    {notifications.map((n) => (
                        <div className={`notif-card ${!n.is_read ? "unread" : ""}`} key={n.id}>
                            <div className="notif-icon">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div className="notif-body">
                                <div className="notif-msg">{n.message}</div>
                                <div className="notif-time">
                                    {new Date(n.created_at).toLocaleString("ar-DZ", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                            </div>
                            {!n.is_read && (
                                <div className="notif-actions">
                                    <button className="mark-read-btn" onClick={() => handleMarkRead(n.id)} title="تم القراءة">
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
