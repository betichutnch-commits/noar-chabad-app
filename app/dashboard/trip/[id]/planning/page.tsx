"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** נתיב ישן — מפנה ללוח הבקרה עם כרטיס התכנון הצף */
export default function TripPlanningRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = String(params.id || "");

  useEffect(() => {
    if (tripId) router.replace(`/dashboard?planning=${tripId}`);
    else router.replace("/dashboard");
  }, [tripId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="animate-spin text-brand-cyan" size={32} />
    </div>
  );
}
