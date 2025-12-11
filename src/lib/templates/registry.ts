export type TemplateId = "creatine-report" | string; // Allow uploaded template IDs

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  description: string;
  supportsSidebar: boolean;
  createdBy: "system" | "uploaded";
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "creatine-report",
    name: "Creatine Report (default)",
    description: "Two-column review / buyer's guide layout with sidebar and ratings.",
    supportsSidebar: true,
    createdBy: "system",
  },
];

export function getTemplateById(id: TemplateId): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

