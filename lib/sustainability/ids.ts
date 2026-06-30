export const SUSTAINABILITY_REQUIREMENT_ID_PREFIX = "sustainability-";

export function isSustainabilityRequirementId(id: string): boolean {
  return id.startsWith(SUSTAINABILITY_REQUIREMENT_ID_PREFIX);
}
