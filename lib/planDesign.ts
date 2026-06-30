export const DESIGN_STATUS_OPTIONS = [
  { value: "לביצוע", label: "לביצוע" },
  { value: "בטיפול", label: "בטיפול" },
  { value: "טיוטה מוכנה", label: "טיוטה מוכנה" },
  { value: "מוכן להדפסה", label: "מוכן להדפסה" },
  { value: "בוטל", label: "בוטל" },
] as const;

export type DesignContentMode = "text" | "file";

export type PlanDesignDraft = {
  document_name: string;
  designer_name: string;
  size_settings: string;
  notes: string;
  content_mode: DesignContentMode;
  document_text: string;
  designer_instructions: string;
  brief_file: File | null;
  output_file: File | null;
  status: string;
};

export const emptyPlanDesignDraft = (): PlanDesignDraft => ({
  document_name: "",
  designer_name: "",
  size_settings: "",
  notes: "",
  content_mode: "text",
  document_text: "",
  designer_instructions: "",
  brief_file: null,
  output_file: null,
  status: "לביצוע",
});
