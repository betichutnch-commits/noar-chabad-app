"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UnreadNotification = { id: string; title: string };

export const useUnreadNotifications = (userId?: string) => {
  const [unreadNotifications, setUnreadNotifications] = useState<UnreadNotification[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, is_read")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      setUnreadNotifications(data || []);
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

  return { unreadNotifications };
};
