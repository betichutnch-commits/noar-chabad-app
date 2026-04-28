"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isOpenMessageStatus, normalizeMessageStatus } from "@/lib/inbox";
import { getCoordinatorRoleTitle, getDeptTripsOfficerTitle } from "@/lib/auth";

type MetadataRecord = Record<string, string | undefined>;
type DisplayDetails = { fullName: string; mainRole: string; secondaryInfo: string };
type MessageRow = { id: string; user_id: string; subject?: string; category?: string; profiles?: Record<string, unknown> | null };
type PendingUser = { id: string; raw_user_meta_data?: MetadataRecord };

const findValue = (obj: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!obj) return null;
  for (const key of keys) {
    const found = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && obj[found]) return obj[found];
  }
  return null;
};

const resolveUserDetails = (meta: Record<string, unknown>): DisplayDetails => {
  const nickname = String(meta.nickname || meta.nick_name || '').trim();
  const fullName = String(meta.full_name || meta.name || meta.official_name || "משתמש");
  const displayName = nickname || fullName;
  const role = String(meta.role || "user").toLowerCase().trim();
  const department = String(findValue(meta, ["department", "dept", "mador", "unit", "agaf", "מחלקה", "מדור"]) || "");
  const branch = String(findValue(meta, ["branch_name", "branch", "snif", "location", "area", "city", "place", "סניף", "שם סניף"]) || "");

  if (role.includes("coordinator") || role === "רכז" || role.includes("rakaz") || branch) {
    const title = getCoordinatorRoleTitle(department);
    return { fullName: displayName, mainRole: branch ? `${title} ${branch}` : title, secondaryInfo: department };
  }
  if (role.includes("dept_trips_officer") || role === "officer") {
    return { fullName: displayName, mainRole: getDeptTripsOfficerTitle(department), secondaryInfo: department || "כללי" };
  }
  if (role.includes("staff") || role.includes("mate") || role.includes("hq") || role === "office" || role.includes("dept_staff")) {
    return { fullName: displayName, mainRole: "צוות מטה", secondaryInfo: department || "כללי" };
  }
  if (role.includes("manager") || role.includes("admin") || role.includes("head") || role === "safety_admin") {
    return { fullName: displayName, mainRole: "מנהל מערכת", secondaryInfo: "" };
  }
  return { fullName: displayName, mainRole: "משתמש", secondaryInfo: branch || department };
};

export const useManagerInboxSummary = () => {
  const [counts, setCounts] = useState({ newUsers: 0, newMessages: 0 });
  const [pendingUsersList, setPendingUsersList] = useState<PendingUser[]>([]);
  const [unreadMessagesList, setUnreadMessagesList] = useState<Array<{ id: string; category?: string; subject?: string; displayDetails: DisplayDetails }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: authRes } = await supabase.auth.getUser();
      const user = authRes.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_tech_admin")
        .eq("id", user.id)
        .single();

      const isTechAdmin = Boolean(profile?.is_tech_admin);

      const { data: usersView } = await supabase.from("users_management_view").select("*");
      const pendingUsers = (usersView || [])
        .filter((u: { raw_user_meta_data?: MetadataRecord }) => u.raw_user_meta_data?.status === "pending")
        .slice(0, 5);

      const { data: rawMessages } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      const filteredMessages = (rawMessages || [])
        .filter((msg: { status?: string; category?: string }) => isOpenMessageStatus(normalizeMessageStatus(msg.status || "new")))
        .filter((msg: { category?: string }) => (isTechAdmin ? true : (msg.category || "general").toLowerCase() !== "bug"))
        .slice(0, 5) as MessageRow[];

      if (filteredMessages.length === 0) {
        setPendingUsersList(pendingUsers);
        setUnreadMessagesList([]);
        setCounts({ newUsers: pendingUsers.length, newMessages: 0 });
        return;
      }

      const userIds = filteredMessages.map((m) => m.user_id);
      const { data: usersDetails } = await supabase
        .from("users_management_view")
        .select("id, raw_user_meta_data")
        .in("id", userIds);

      const enriched = filteredMessages.map((msg) => {
        const userDetail = usersDetails?.find((u: { id: string }) => u.id === msg.user_id);
        const meta = (userDetail?.raw_user_meta_data || {}) as Record<string, unknown>;
        return { id: msg.id, category: msg.category, subject: msg.subject, displayDetails: resolveUserDetails(meta) };
      });

      setPendingUsersList(pendingUsers);
      setUnreadMessagesList(enriched);
      setCounts({ newUsers: pendingUsers.length, newMessages: enriched.length });
    };

    fetchData();
    const channel = supabase
      .channel("manager_inbox_summary")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "users_management_view" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { counts, pendingUsersList, unreadMessagesList };
};
