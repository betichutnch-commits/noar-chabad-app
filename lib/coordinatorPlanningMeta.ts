export type CoordinatorPlanningMeta = {
  approvalModalSeenAt?: string | null;
  hubAcknowledgedAt?: string | null;
};

export function readCoordinatorPlanningMeta(details: unknown): CoordinatorPlanningMeta {
  const record = (details && typeof details === "object" ? details : {}) as Record<string, unknown>;
  const raw = record.coordinatorPlanning;
  if (!raw || typeof raw !== "object") return {};
  const meta = raw as Record<string, unknown>;
  return {
    approvalModalSeenAt:
      typeof meta.approvalModalSeenAt === "string" ? meta.approvalModalSeenAt : null,
    hubAcknowledgedAt: typeof meta.hubAcknowledgedAt === "string" ? meta.hubAcknowledgedAt : null,
  };
}

export function mergeCoordinatorPlanningMeta(
  details: unknown,
  patch: Partial<CoordinatorPlanningMeta>,
): Record<string, unknown> {
  const record = (details && typeof details === "object" ? { ...(details as Record<string, unknown>) } : {}) as Record<
    string,
    unknown
  >;
  const current = readCoordinatorPlanningMeta(record);
  record.coordinatorPlanning = {
    ...current,
    ...patch,
  };
  return record;
}

export function isPlanningApprovedStatus(status: string | null | undefined) {
  return status === "approved" || status === "approved_for_execution";
}
