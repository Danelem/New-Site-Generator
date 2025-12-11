import type { TemplateId } from "@/lib/templates/registry";

export type FunnelConfig = {
  id: string; // e.g. uuid or timestamp-based
  name: string; // human label, e.g. "Creatine Bloating – Male 35+"
  templateId: TemplateId;
  productName: string;
  productUrl: string;
  websiteUrl?: string; // URL to extract template from
  mainKeyword: string;
  ageRange: string;
  gender: string;
  country?: string;
  region?: string; // Legacy: comma-separated states (kept for backward compatibility)
  targetStates?: string[]; // Array of US states for regional targeting
  tone: string;
  font?: string; // Selected font family
  coreNarrative?: string; // Step 3: Core Narrative (Source of Truth)
  pageHeadline?: string;
  introParagraph?: string;
  mainBenefits?: string; // raw textarea version
  effectivenessParagraphs?: string; // raw textarea version, one per line
  comparisonParagraphs?: string; // raw textarea version, one per line
  reviewParagraphs?: string; // raw textarea version, one per line
  bottomLineParagraph?: string;
  sidebarDiscoverItems?: string; // raw textarea version, one per line
  sidebarTopItems?: string; // raw textarea version, one per line
  ratings?: {
    customerService: string;
    valueRating: string;
    customerRating: string;
    overallRating: string;
  };
  newsletterTitle?: string;
  newsletterDesc?: string;
  slotData?: Record<string, string>; // Dynamic slot data for uploaded templates
  createdAt: string; // ISO date
};

