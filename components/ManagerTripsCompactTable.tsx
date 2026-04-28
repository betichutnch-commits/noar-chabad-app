"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { getTripStatusConfig } from "@/lib/tripStatus";
import type { TripCardAlert, TripCardTripModel } from "@/components/TripCard";
import { getTripTypeRibbonClass } from "@/components/TripCard";

const alertCellClass = (tone: TripCardAlert["tone"]) =>
  tone === "red" ? "text-red-700 font-bold" : "text-amber-800 font-bold";

type Props = {
  trips: TripCardTripModel[];
  detailHref: (tripId: string) => string;
  getAlert?: (trip: TripCardTripModel) => TripCardAlert | undefined;
};

export function ManagerTripsCompactTable({ trips, detailHref, getAlert }: Props) {
  const router = useRouter();

  return (
    <div className="bg-surface-card rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase">
            <tr>
              <th className="p-4">שם הטיול</th>
              <th className="p-4">רכז / סניף</th>
              <th className="p-4">מחלקה</th>
              <th className="p-4">תאריכים</th>
              <th className="p-4">משתתפים</th>
              <th className="p-4">סטטוס</th>
              <th className="p-4">התראות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trips.map((trip) => {
              const d = (trip.details || {}) as Record<string, unknown>;
              const tripType = typeof d.tripType === "string" ? d.tripType : "";
              const travelers =
                typeof d.totalTravelers === "string" || typeof d.totalTravelers === "number"
                  ? String(d.totalTravelers)
                  : "—";
              const status = getTripStatusConfig(trip.status);
              const StatusIcon = status.icon;
              const alert = getAlert?.(trip);
              const href = detailHref(trip.id);
              const firstLoc =
                (d.timeline as Array<{ finalLocation?: string }> | undefined)?.[0]?.finalLocation;

              return (
                <tr
                  key={trip.id}
                  onClick={() => router.push(href)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="p-4 align-top">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${getTripTypeRibbonClass(tripType)}`}
                        title={tripType || "סוג"}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-800">{trip.name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin size={12} /> {firstLoc || "לא צוין מיקום"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs shrink-0">
                        {trip.coordinator_name?.[0] || "—"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-700">{trip.coordinator_name || "—"}</div>
                        <div className="text-xs text-gray-400 truncate">{trip.branch || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top text-gray-600 max-w-[10rem] truncate" title={trip.department || ""}>
                    {trip.department || "—"}
                  </td>
                  <td className="p-4 align-top whitespace-nowrap text-gray-600">
                    {new Date(trip.start_date).toLocaleDateString("he-IL")}
                  </td>
                  <td className="p-4 align-top text-gray-600 whitespace-nowrap">{travelers}</td>
                  <td className="p-4 align-top">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${status.bg} ${status.textCol}`}
                    >
                      <StatusIcon size={12} />
                      {status.text}
                    </span>
                  </td>
                  <td className="p-4 align-top text-xs">
                    {alert ? <span className={alertCellClass(alert.tone)}>{alert.label}</span> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
