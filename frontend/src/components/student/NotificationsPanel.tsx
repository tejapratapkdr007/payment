import { useEffect, useState } from "react";
import { api, unwrap } from "../../lib/api";
import { NotificationItem, Paginated } from "../../types";
import { Card } from "../Card";
import { formatDistanceToNow } from "date-fns";

export function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await unwrap<Paginated<NotificationItem> & { unreadCount: number }>(
        api.get("/notifications", { params: { pageSize: 10 } })
      );
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await api.post(`/notifications/${id}/read`);
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <Card className="p-5">
      <p className="font-display font-bold text-sm text-ink dark:text-paper-50 mb-3">Notifications</p>
      <div className="space-y-3">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.isRead && markRead(n.id)}
            className="block w-full text-left ledger-rule pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-2">
              {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-marigold shrink-0" />}
              <div className={n.isRead ? "opacity-60" : ""}>
                <p className="text-sm font-medium text-ink dark:text-paper-50">{n.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-ink-400/70 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
