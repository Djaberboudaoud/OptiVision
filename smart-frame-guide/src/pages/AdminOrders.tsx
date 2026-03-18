import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { fetchOrders, type Order } from "@/lib/adminApi";
import { useToast } from "@/components/ui/use-toast";
import {
    ShoppingCart, ChevronDown, ChevronUp, Clock, Package,
} from "lucide-react";

export default function AdminOrders() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        fetchOrders()
            .then(setOrders)
            .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
            .finally(() => setLoading(false));
    }, []);

    const statusColors: Record<string, string> = {
        pending: "status-pending",
        confirmed: "status-confirmed",
        shipped: "status-shipped",
        delivered: "status-delivered",
        cancelled: "status-cancelled",
    };

    const statusLabels: Record<string, string> = {
        pending: "قيد الانتظار",
        confirmed: "مؤكد",
        shipped: "تم الشحن",
        delivered: "تم التسليم",
        cancelled: "ملغى",
    };

    return (
        <AdminLayout>
            <style>{`
        .orders-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .orders-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }
        .orders-header .count {
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .order-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
        }
        .order-card:hover {
          border-color: rgba(255,255,255,0.1);
        }
        .order-row {
          display: grid;
          grid-template-columns: 80px 1.5fr 1fr 1fr 1fr 40px;
          align-items: center;
          padding: 1rem 1.25rem;
          cursor: pointer;
          transition: background 0.15s;
          gap: 0.5rem;
        }
        .order-row:hover {
          background: rgba(255,255,255,0.02);
        }
        .order-id {
          font-weight: 700;
          color: #a5b4fc;
          font-size: 0.85rem;
        }
        .order-client {
          font-weight: 600;
          color: #fff;
          font-size: 0.9rem;
        }
        .order-price {
          font-weight: 700;
          color: #4ade80;
          font-size: 0.95rem;
        }
        .order-date {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-pending { background: rgba(234,179,8,0.12); color: #facc15; }
        .status-confirmed { background: rgba(34,197,94,0.12); color: #4ade80; }
        .status-shipped { background: rgba(59,130,246,0.12); color: #60a5fa; }
        .status-delivered { background: rgba(34,197,94,0.2); color: #22c55e; }
        .status-cancelled { background: rgba(239,68,68,0.12); color: #f87171; }
        .expand-icon {
          color: rgba(255,255,255,0.3);
          transition: transform 0.2s;
        }
        .order-details {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .order-details h3 {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 1rem 0 0.5rem;
        }
        .items-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .item-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          font-size: 0.85rem;
        }
        .item-row .item-id { color: #a5b4fc; font-weight: 600; }
        .item-row .item-qty { color: rgba(255,255,255,0.5); margin-left: auto; }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255,255,255,0.3);
        }
        .empty-state svg { margin-bottom: 1rem; opacity: 0.3; }

        @media (max-width: 768px) {
          .order-row {
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
          }
        }
      `}</style>

            <div className="orders-header">
                <h1>الطلبات</h1>
                <span className="count">{orders.length} طلب</span>
            </div>

            {loading ? (
                <div className="empty-state">جاري التحميل...</div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <ShoppingCart className="w-12 h-12" />
                    <p>لا توجد طلبات بعد</p>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map((order) => (
                        <div className="order-card" key={order.id}>
                            <div className="order-row" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                                <span className="order-id">#ORD-{order.id}</span>
                                <span className="order-client">{order.client_name || `Client #${order.client_id}`}</span>
                                <span className="order-price">{order.total_price.toLocaleString()} DA</span>
                                <span className={`status-badge ${statusColors[order.order_status] || ""}`}>
                                    {statusLabels[order.order_status] || order.order_status}
                                </span>
                                <span className="order-date">
                                    <Clock className="w-3 h-3" />
                                    {new Date(order.created_at).toLocaleDateString("ar-DZ")}
                                </span>
                                <span className="expand-icon">
                                    {expandedId === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </span>
                            </div>
                            {expandedId === order.id && (
                                <div className="order-details">
                                    <h3>
                                        <Package className="w-3.5 h-3.5" style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                                        المنتجات ({order.items.length})
                                    </h3>
                                    <div className="items-list">
                                        {order.items.map((item) => (
                                            <div className="item-row" key={item.id}>
                                                <span className="item-id">Glasses #{item.glasses_id}</span>
                                                <span className="item-qty">x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
