"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type UnreadNotification = {
  id: string;
  title: string;
  message?: string | null;
  link?: string | null;
  type?: string | null;
  created_at?: string | null;
};

export const useUnreadNotifications = (userId?: string) => {
  const [unreadNotifications, setUnreadNotifications] = useState<UnreadNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, link, type, created_at, is_read")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      setUnreadNotifications(data || []);
      setLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel(`unread_notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchNotifications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(
    async (id: string) => {
      setUnreadNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
        credentials: "include",
      }).catch(() => {});
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    setUnreadNotifications([]);
    await fetch("/api/notifications/mark-all-read", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, []);

  return { unreadNotifications, loading, markRead, markAllRead };
};
