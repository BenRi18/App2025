// FrontEnd/hooks/useUnreadCount.js
// Returns the total unread message count across all matches, refreshed on an
// interval. Used to drive the badge on the Messages tab for both roles.
import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

const POLL_MS = 30000;

export function useUnreadCount() {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res  = await api.get("/matches");
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setUnread(data.reduce((sum, m) => sum + (m.unread_count ?? 0), 0));
    } catch {
      // network hiccup — keep the last known count
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return unread;
}