import { getTripParticipantLabels } from "@/lib/tripParticipantLabels";

export type InstructionAudience = "staff" | "participants";

export const INSTRUCTION_AUDIENCE_LABELS: Record<InstructionAudience, string> = {
  staff: "צוות",
  participants: "חניכים",
};

export function getInstructionAudienceLabels(department?: string | null): Record<InstructionAudience, string> {
  const labels = getTripParticipantLabels(department);
  return {
    staff: "צוות",
    participants: labels.participants,
  };
}
