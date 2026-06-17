"use client"

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useUser } from "@/hooks/useUser";
import { hasDeptReviewCapability } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resolveDisplayName } from "@/lib/userDisplay";

export default function HqLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading } = useUser("/");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fullName = resolveDisplayName({
    meta: (user?.user_metadata || {}) as Record<string, unknown>,
    profile: (profile || null) as Record<string, unknown> | null,
    fallback: "",
  });
  const avatarUrl = (user?.user_metadata?.avatar_url as string | null) || null;
  const deptLabel = String(user?.user_metadata?.department || user?.user_metadata?.branch || "מטה");
  const canDeptReview = hasDeptReviewCapability(user);

  useEffect(() => {
    if (!loading && !canDeptReview) {
      router.replace("/dashboard");
    }
  }, [loading, canDeptReview, router]);

  if (!loading && !canDeptReview) return null;

  return (
    <div className="min-h-screen bg-surface-base dir-rtl text-right font-sans">
      <div className="md:hidden flex items-center justify-between p-3 bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 border border-gray-200"
          >
            <Menu size={20} />
          </button>
          <div className="w-8 h-8 relative">
            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
          </div>
        </div>

        <Link href="/dashboard/profile" className="flex items-center gap-2 bg-gray-50 p-1 pl-1 pr-3 rounded-full border border-gray-100 shadow-sm">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-800 leading-none truncate max-w-[100px]">
              {fullName.split(" ")[0] || "משתמש"}
            </span>
            <span className="text-[9px] text-gray-500 leading-none truncate max-w-[100px] mt-0.5">
              {deptLabel}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-cyan-100 border border-white overflow-hidden relative">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="User" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cyan-600 font-bold text-xs">
                {fullName?.[0] || "U"}
              </div>
            )}
          </div>
        </Link>
      </div>

      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} showDeptReview />

      <div className="transition-all duration-300 md:mr-56 mr-0 min-h-screen">
        {children}
      </div>
    </div>
  );
}
