"use client";

import Image from "next/image";
import type React from "react";
import MasterFormTemplate from "@/components/MasterFormTemplate";
import { AssigneeResponsibilitiesBoard } from "@/components/plan/AssigneeResponsibilitiesBoard";
import type { AssigneeBoard } from "@/lib/planAssigneeResponsibilities";

export type RoleResponsibilitiesDocumentVariant = "trip-leader" | "staff";

export type RoleResponsibilitiesDocumentProps = {
  variant: RoleResponsibilitiesDocumentVariant;
  boards: AssigneeBoard[];
  coordinatorName?: string;
  isComplete?: boolean;
  onGoToSchedule?: () => void;
  actions?: React.ReactNode;
};

const copyByVariant: Record<
  RoleResponsibilitiesDocumentVariant,
  { title: React.ReactNode; description: string; emptyHint: string; banner: string; footer: string }
> = {
  "trip-leader": {
    title: (
      <>
        הגדרות תפקיד אחראי טיול <span className="text-xl font-normal text-text-muted">(לפי לו״ז הטיול)</span>
      </>
    ),
    description:
      "ריכוז האחריות שהוגדרו לאחראי הטיול במשימות הלו״ז, לפי שלבי ההיערכות, ביצוע וסיום — עם שיוך לשלב בטיול.",
    emptyHint: "הגדר משימות ואחראי בלו״ז עבור אחראי הטיול כדי להשלים את המסמך.",
    banner: "המילוי מתבצע בעמודת «באחריות» בלו״ז המפורט. ודא ששם האחראי במשימות תואם לשם אחראי הטיול בפרטי הטיול.",
    footer:
      "המסמך נוצר אוטומטית מתוך משימות הלו״ז. עדכון האחריות מתבצע בלו״ז בלבד, ולא מתוך המסמך.",
  },
  staff: {
    title: (
      <>
        הגדרות תפקיד צוות הטיול <span className="text-xl font-normal text-text-muted">(לפי לו״ז הטיול)</span>
      </>
    ),
    description:
      "ריכוז האחריות לכל אחראי שהוגדר במשימות הלו״ז, מחולק לפי בהיערכות, בשעת מעשה ואחר מעשה — עם שיוך לשלב בטיול.",
    emptyHint: "הגדר משימות ואחראים בעמודת «באחריות» בלו״ז המפורט כדי להשלים את המסמך.",
    banner: "המילוי מתבצע בעמודת «באחריות» בלו״ז המפורט או דרך תפריט פירוט ההתרחשות.",
    footer:
      "המסמך נוצר אוטומטית מתוך משימות הלו״ז. עדכון האחריות והאחראים מתבצע בלו״ז בלבד.",
  },
};

function OrganizationLogo() {
  return (
    <div className="relative h-16 w-44 print:h-14 print:w-40">
      <Image src="/logo.png" alt="ארגון נוער חב״ד" fill className="object-contain" priority unoptimized />
    </div>
  );
}

export function RoleResponsibilitiesDocument({
  variant,
  boards,
  coordinatorName,
  isComplete = false,
  onGoToSchedule,
  actions,
}: RoleResponsibilitiesDocumentProps) {
  const copy = copyByVariant[variant];

  return (
    <MasterFormTemplate
      title={copy.title}
      description={copy.description}
      departmentName=""
      blessingPosition="right"
      blessingClassName="text-xs font-normal"
      headerLogo={<OrganizationLogo />}
      organizationName=""
      submissionInstructions=""
      signatureFields={[]}
      hideHeaderRule
      hideFooterRule
      showTable={false}
      actions={actions}
      beforeTable={
        <>
          {!isComplete ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900 print:hidden md:flex-row md:items-center md:justify-between">
              <span>
                {copy.banner}
                {variant === "trip-leader" && coordinatorName ? (
                  <span className="mt-1 block text-xs font-black text-amber-800">אחראי הטיול במערכת: {coordinatorName}</span>
                ) : null}
              </span>
              {onGoToSchedule ? (
                <button
                  type="button"
                  onClick={onGoToSchedule}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 text-xs font-black text-amber-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100"
                >
                  לעמודת באחריות בלו״ז
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      }
      afterTable={
        <div className="rounded-2xl border border-brand-dark/20 bg-white p-4 text-sm font-bold leading-7 text-brand-dark">
          {copy.footer}
        </div>
      }
      className="font-sans [&_.master-form-page]:p-[10mm]"
    >
      {!boards.length ? (
        <p className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-6 text-center text-sm font-bold text-violet-800">
          {copy.emptyHint}
        </p>
      ) : (
        <AssigneeResponsibilitiesBoard boards={boards} />
      )}
    </MasterFormTemplate>
  );
}

export default RoleResponsibilitiesDocument;
