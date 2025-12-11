'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CreatineReportTemplate, { CreatineReportProps } from '@/components/templates/CreatineReportTemplate';
import { UploadedTemplateRenderer } from '@/components/templates/UploadedTemplateRenderer';
import { TEMPLATES, TemplateId } from '@/lib/templates/registry';
import { loadUploadedTemplates } from '@/lib/templates/uploadedStorage';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';
import { FunnelConfig } from '@/lib/funnels/types';
import { getFunnelById, upsertFunnel } from '@/lib/funnels/storage';
import { ExportFormat } from '@/lib/export/types';
import { buildCreatineReportHtml } from '@/lib/export/buildStaticHtml';
import { buildUploadedTemplateFiles } from '@/lib/export/buildUploadedTemplateFiles';

interface WizardData {
  // Step 1: Template & basics
  templateId: TemplateId;
  productName: string;
  productUrl: string;
  websiteUrl: string; // URL to extract template from
  mainKeyword: string;
  targetStates: string[]; // Array of US states for regional targeting (Step 1)
  
  // Step 2: Audience & tone
  ageRange: string;
  gender: string;
  country: string; // Always "United States"
  region: string; // Comma-separated list of states (legacy, kept for backward compatibility)
  tone: string;
  font: string; // Selected font family
  
  // Step 3: Core Narrative (Source of Truth)
  coreNarrative: string;
  
  // Step 4: Content placeholders (for CreatineReport template)
  pageHeadline: string;
  introParagraph: string;
  mainBenefits: string;
  effectivenessParagraphs: string; // one per line
  comparisonParagraphs: string; // one per line
  reviewParagraphs: string; // one per line
  bottomLineParagraph: string;
  sidebarDiscoverItems: string; // one per line
  sidebarTopItems: string; // one per line
  ratings: {
    customerService: string;
    valueRating: string;
    customerRating: string;
    overallRating: string;
  };
  newsletterTitle: string;
  newsletterDesc: string;
  
  // Dynamic slot data for uploaded templates (slotId -> content)
  slotData?: Record<string, string>;
}

// US States list for multi-select
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
];

// Comprehensive list of English fonts
const FONTS = [
  // Web-safe fonts
  'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
  'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New',
  'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Gill Sans', 'Gill Sans MT',
  'Helvetica', 'Helvetica Neue',
  'Impact', 'Lucida Console', 'Lucida Grande', 'Lucida Sans Unicode',
  'Microsoft Sans Serif', 'Monaco', 'MS Sans Serif', 'MS Serif',
  'Palatino', 'Palatino Linotype', 'Perpetua', 'Rockwell', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS',
  'Verdana',
  // Google Fonts - Serif
  'Lora', 'Merriweather', 'Playfair Display', 'PT Serif', 'Roboto Slab', 'Source Serif Pro',
  // Google Fonts - Sans Serif
  'Open Sans', 'Roboto', 'Lato', 'Montserrat', 'Raleway', 'Ubuntu', 'Poppins', 'Nunito', 'Source Sans Pro',
  'Oswald', 'Dosis', 'PT Sans', 'Work Sans', 'Fira Sans', 'Libre Franklin', 'Crimson Text',
  // Google Fonts - Display/Decorative
  'Bebas Neue', 'Bungee', 'Creepster', 'Fascinate', 'Faster One', 'Fredoka One', 'Lobster', 'Pacifico', 'Righteous',
  'Russo One', 'Satisfy', 'Shadows Into Light', 'Sigmar One', 'Titan One',
  // Google Fonts - Monospace
  'Courier Prime', 'Fira Code', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'Space Mono',
  // Additional popular fonts
  'Abel', 'Anton', 'Archivo', 'Arimo', 'Arvo', 'Bitter', 'Cabin', 'Cantarell', 'Cardo', 'Chivo',
  'Comfortaa', 'Cormorant', 'Crimson Pro', 'Dancing Script', 'DM Sans', 'DM Serif Display',
  'EB Garamond', 'Exo', 'Exo 2', 'Fjalla One', 'Hind', 'Inria Sans', 'Inter', 'Josefin Sans',
  'Josefin Slab', 'Karla', 'Kaushan Script', 'Libre Baskerville', 'Maven Pro', 'Merienda',
  'Merriweather Sans', 'Mulish', 'Nanum Gothic', 'Noto Sans', 'Noto Serif', 'Nunito Sans',
  'Old Standard TT', 'Oxygen', 'Playfair Display SC', 'Quicksand', 'Rajdhani', 'Red Hat Display',
  'Rubik', 'Saira', 'Sansita', 'Sora', 'Spectral', 'Titillium Web', 'Varela Round', 'Yanone Kaffeesatz',
  // System fonts
  'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji',
  // Additional professional fonts
  'Bodoni MT', 'Book Antiqua', 'Bookman Old Style', 'Century Schoolbook', 'Copperplate', 'Copperplate Gothic',
  'Didot', 'Futura', 'Geneva', 'Goudy Old Style', 'Hoefler Text', 'Lucida Bright', 'Minion Pro',
  'Optima', 'Papyrus', 'Snell Roundhand', 'Stencil', 'Times', 'Zapf Chancery', 'Zapfino'
].sort();

const initialData: WizardData = {
  templateId: 'creatine-report',
  productName: '',
  productUrl: '',
  websiteUrl: '',
  mainKeyword: '',
  targetStates: [], // Step 1: Target states for regional customization
  ageRange: '',
  gender: '',
  country: 'United States', // Default to United States
  region: '', // Comma-separated states (legacy, kept for backward compatibility)
  tone: '',
  font: 'Arial', // Default font
  coreNarrative: '', // Step 3: Core Narrative
  pageHeadline: '',
  introParagraph: '',
  mainBenefits: '',
  effectivenessParagraphs: '',
  comparisonParagraphs: '',
  reviewParagraphs: '',
  bottomLineParagraph: '',
  sidebarDiscoverItems: '',
  sidebarTopItems: '',
  ratings: {
    customerService: '5',
    valueRating: '5',
    customerRating: '5',
    overallRating: '5',
  },
  newsletterTitle: 'Stay Updated',
  newsletterDesc: 'Get the latest creatine research, product reviews, and fitness tips delivered to your inbox.',
};

export default function WizardPage() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [uploadedTemplates, setUploadedTemplates] = useState<UploadedTemplate[]>([]);
  const [fontSearch, setFontSearch] = useState('');
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  // Load uploaded templates
  useEffect(() => {
    setUploadedTemplates(loadUploadedTemplates());
    // Listen for new template uploads
    const handleTemplateUploaded = () => {
      setUploadedTemplates(loadUploadedTemplates());
    };
    window.addEventListener('template-uploaded', handleTemplateUploaded);
    return () => window.removeEventListener('template-uploaded', handleTemplateUploaded);
  }, []);

  // Scroll to top whenever step changes (instant for better UX)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

  // Close font dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fontDropdownRef.current &&
        !fontDropdownRef.current.contains(event.target as Node) &&
        fontInputRef.current &&
        !fontInputRef.current.contains(event.target as Node)
      ) {
        setShowFontDropdown(false);
        setFontSearch('');
      }
    };

    if (showFontDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFontDropdown]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCoreNarrative, setIsGeneratingCoreNarrative] = useState(false);
  const [isMappingToSlots, setIsMappingToSlots] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentFunnelId, setCurrentFunnelId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('static-html');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningFields, setWarningFields] = useState<string[]>([]);

  // Get the selected template (system or uploaded)
  const getSelectedTemplate = (): { type: 'system' | 'uploaded'; template?: UploadedTemplate } => {
    if (data.templateId === 'creatine-report') {
      return { type: 'system' };
    }
    const uploaded = uploadedTemplates.find(t => t.id === data.templateId);
    if (uploaded) {
      return { type: 'uploaded', template: uploaded };
    }
    return { type: 'system' };
  };

  // Initialize slotData when template changes
  useEffect(() => {
    const selected = getSelectedTemplate();
    if (selected.type === 'uploaded' && selected.template) {
      // Initialize slotData with empty strings for all slots
      const newSlotData: Record<string, string> = {};
      selected.template.slots.forEach(slot => {
        if (!data.slotData || !(slot.id in data.slotData)) {
          newSlotData[slot.id] = '';
        }
      });
      if (Object.keys(newSlotData).length > 0) {
        setData(prev => ({
          ...prev,
          slotData: { ...prev.slotData, ...newSlotData }
        }));
      }
    }
  }, [data.templateId, uploadedTemplates]);

  // Load funnel from URL param on mount
  useEffect(() => {
    const funnelId = searchParams.get('id');
    if (funnelId && currentFunnelId === null) {
      const savedFunnel = getFunnelById(funnelId);
      if (savedFunnel) {
        setData({
          templateId: savedFunnel.templateId,
          productName: savedFunnel.productName,
          productUrl: savedFunnel.productUrl,
          websiteUrl: savedFunnel.websiteUrl || '',
          mainKeyword: savedFunnel.mainKeyword,
          ageRange: savedFunnel.ageRange,
          gender: savedFunnel.gender,
          country: savedFunnel.country || 'United States',
          region: savedFunnel.region || '',
          targetStates: savedFunnel.region 
            ? savedFunnel.region.split(',').map(s => s.trim()).filter(s => s)
            : [],
          tone: savedFunnel.tone,
          font: savedFunnel.font || 'Arial',
          coreNarrative: savedFunnel.coreNarrative || '',
          pageHeadline: savedFunnel.pageHeadline || '',
          introParagraph: savedFunnel.introParagraph || '',
          mainBenefits: savedFunnel.mainBenefits || '',
          effectivenessParagraphs: savedFunnel.effectivenessParagraphs || '',
          comparisonParagraphs: savedFunnel.comparisonParagraphs || '',
          reviewParagraphs: savedFunnel.reviewParagraphs || '',
          bottomLineParagraph: savedFunnel.bottomLineParagraph || '',
          sidebarDiscoverItems: savedFunnel.sidebarDiscoverItems || '',
          sidebarTopItems: savedFunnel.sidebarTopItems || '',
          ratings: savedFunnel.ratings || {
            customerService: '5',
            valueRating: '5',
            customerRating: '5',
            overallRating: '5',
          },
          newsletterTitle: savedFunnel.newsletterTitle || 'Stay Updated',
          newsletterDesc: savedFunnel.newsletterDesc || 'Get the latest creatine research, product reviews, and fitness tips delivered to your inbox.',
          slotData: savedFunnel.slotData || undefined,
        });
        setCurrentFunnelId(savedFunnel.id);
      }
    }
  }, [searchParams, currentFunnelId]);

  const updateField = (field: keyof WizardData, value: string | { customerService: string; valueRating: string; customerRating: string; overallRating: string }) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Check for empty fields in current step (for warning only)
  const getEmptyFields = (): string[] => {
    const empty: string[] = [];
    
    if (currentStep === 1) {
      if (!data.productName.trim()) empty.push('Product Name');
      if (!data.mainKeyword.trim()) empty.push('Main Keyword');
      // Note: targetStates is optional, so no validation needed
    } else if (currentStep === 2) {
      if (!data.ageRange) empty.push('Age Range');
      if (!data.gender) empty.push('Gender');
      if (!data.tone) empty.push('Tone of Voice');
    } else if (currentStep === 3) {
      // Core Narrative step - no mandatory fields, but warn if empty
      if (!data.coreNarrative.trim()) empty.push('Core Narrative');
    }
    
    return empty;
  };

  const goNext = () => {
    if (currentStep < 4) {
      const emptyFields = getEmptyFields();
      
      // Show warning if there are empty fields, but still allow proceeding
      if (emptyFields.length > 0) {
        setWarningFields(emptyFields);
        setShowWarningModal(true);
      } else {
        // No empty fields, proceed directly
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleContinueAnyway = () => {
    setShowWarningModal(false);
    setWarningFields([]);
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handler for generating core narrative (Step 3)
  const handleGenerateCoreNarrative = async () => {
    if (!data.productName || !data.mainKeyword) {
      setErrorMessage('Product name and main keyword are required to generate core narrative.');
      return;
    }

    setIsGeneratingCoreNarrative(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/generate-core-narrative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: data.productName,
          mainKeyword: data.mainKeyword,
          ageRange: data.ageRange,
          gender: data.gender,
          country: data.country || undefined,
          state: data.targetStates && data.targetStates.length > 0 
            ? data.targetStates[0] 
            : (data.region ? data.region.split(',')[0].trim() : undefined),
          targetStates: data.targetStates && data.targetStates.length > 0 
            ? data.targetStates 
            : (data.region ? data.region.split(',').map(s => s.trim()).filter(s => s) : undefined),
          tone: data.tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setErrorMessage(
          errorData.error || errorData.details 
            ? `${errorData.error}${errorData.details ? `: ${errorData.details}` : ''}`
            : 'Core narrative generation failed. Please try again.'
        );
        return;
      }

      const result = await response.json();
      
      if (result.error) {
        setErrorMessage(`${result.error}${result.details ? `: ${result.details}` : ''}`);
        return;
      }
      
      updateField('coreNarrative', result.coreNarrative);
      setErrorMessage(null);
    } catch (error) {
      console.error('Core narrative generation error:', error);
      setErrorMessage('Core narrative generation failed. Please try again.');
    } finally {
      setIsGeneratingCoreNarrative(false);
    }
  };

  // Handler for mapping core narrative to slots (when moving from Step 3 to Step 4)
  const handleMapNarrativeToSlots = async () => {
    if (!data.coreNarrative.trim()) {
      setErrorMessage('Core narrative is required to map to slots.');
      return;
    }

    setIsMappingToSlots(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/map-narrative-to-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coreNarrative: data.coreNarrative,
          templateId: data.templateId,
          productName: data.productName,
          mainKeyword: data.mainKeyword,
          ageRange: data.ageRange,
          gender: data.gender,
          country: data.country || undefined,
          state: data.targetStates && data.targetStates.length > 0 
            ? data.targetStates[0] 
            : (data.region ? data.region.split(',')[0].trim() : undefined),
          targetStates: data.targetStates && data.targetStates.length > 0 
            ? data.targetStates 
            : (data.region ? data.region.split(',').map(s => s.trim()).filter(s => s) : undefined),
          tone: data.tone,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to map narrative to slots';
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || errorData.hint || '';
        } catch (jsonError) {
          // If JSON parsing fails, try to get the text response
          try {
            const errorText = await response.text();
            errorDetails = errorText || `HTTP ${response.status}: ${response.statusText}`;
          } catch (textError) {
            errorDetails = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        
        setErrorMessage(
          errorDetails 
            ? `${errorMessage}: ${errorDetails}`
            : errorMessage
        );
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError);
        setErrorMessage('Failed to parse server response. Please check the console for details.');
        return;
      }
      
      if (result.error) {
        const errorMsg = result.error;
        const errorDetails = result.details || result.hint || '';
        const slotErrors = result.slotErrors ? Object.keys(result.slotErrors).join(', ') : '';
        setErrorMessage(
          `${errorMsg}${errorDetails ? `: ${errorDetails}` : ''}${slotErrors ? ` (Slots with errors: ${slotErrors})` : ''}`
        );
        return;
      }
      
      // Update all slot fields with mapped content
      if (result.slots) {
        Object.keys(result.slots).forEach(slotId => {
          if (result.slots[slotId]) {
            let processedContent = result.slots[slotId];
            // Add bullet points for mainBenefits list
            if (slotId === 'mainBenefits') {
              const lines = processedContent.split('\n');
              processedContent = lines
                .map(line => {
                  const trimmed = line.trim();
                  if (trimmed === '') return '';
                  // If line doesn't already have a bullet point, add one
                  if (!trimmed.startsWith('• ') && !trimmed.startsWith('* ') && !trimmed.startsWith('- ')) {
                    return '• ' + trimmed;
                  }
                  return trimmed;
                })
                .filter(line => line !== '')
                .join('\n');
            }
            updateField(slotId as keyof WizardData, processedContent);
          }
        });
      }
      
      setErrorMessage(null);
      // Note: Step navigation is handled by the Next button click handler
    } catch (error) {
      console.error('Narrative mapping error:', error);
      setErrorMessage('Failed to map narrative to slots. Please try again.');
    } finally {
      setIsMappingToSlots(false);
    }
  };

  // Handler for regenerating a single slot (Step 4)
  const handleRegenerateSlot = async (slotId: string, slotType: string) => {
    if (!data.coreNarrative.trim()) {
      setErrorMessage('Core narrative is required to regenerate slots.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/regenerate-slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slotId,
          slotType,
          coreNarrative: data.coreNarrative,
          productName: data.productName,
          mainKeyword: data.mainKeyword,
          ageRange: data.ageRange,
          gender: data.gender,
          country: data.country || undefined,
          state: data.targetStates && data.targetStates.length > 0 
            ? data.targetStates[0] 
            : (data.region ? data.region.split(',')[0].trim() : undefined),
          targetStates: data.targetStates && data.targetStates.length > 0 
            ? data.targetStates 
            : (data.region ? data.region.split(',').map(s => s.trim()).filter(s => s) : undefined),
          tone: data.tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setErrorMessage(
          errorData.error || errorData.details 
            ? `${errorData.error}${errorData.details ? `: ${errorData.details}` : ''}`
            : 'Slot regeneration failed. Please try again.'
        );
        return;
      }

      const result = await response.json();
      
      if (result.error) {
        setErrorMessage(`${result.error}${result.details ? `: ${result.details}` : ''}`);
        return;
      }
      
      // Process content - add bullet points for list-type slots like mainBenefits
      let processedContent = result.content;
      if (slotId === 'mainBenefits' && slotType === 'list') {
        // Split by newlines and add bullet points to each line
        const lines = processedContent.split('\n');
        processedContent = lines
          .map(line => {
            const trimmed = line.trim();
            if (trimmed === '') return '';
            // If line doesn't already have a bullet point, add one
            if (!trimmed.startsWith('• ') && !trimmed.startsWith('* ') && !trimmed.startsWith('- ')) {
              return '• ' + trimmed;
            }
            return trimmed;
          })
          .filter(line => line !== '')
          .join('\n');
      }
      
      // Check if this is a CreatineReport field or uploaded template slot
      const selected = getSelectedTemplate();
      if (selected.type === 'uploaded' && selected.template) {
        // Update slotData for uploaded templates
        setData(prev => ({
          ...prev,
          slotData: { ...prev.slotData || {}, [slotId]: processedContent }
        }));
      } else {
        // Update regular field for CreatineReport template
        updateField(slotId as keyof WizardData, processedContent);
      }
      
      setErrorMessage(null);
    } catch (error) {
      console.error('Slot regeneration error:', error);
      setErrorMessage('Slot regeneration failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Legacy function removed - content generation now happens via:
  // 1. Step 3: Generate Core Narrative
  // 2. Step 3->4: Map narrative to slots
  // 3. Step 4: Regenerate individual slots

  const handleSave = () => {
    if (!data.productName || !data.mainKeyword) {
      setSaveMessage('Product name and main keyword are required to save.');
      return;
    }

    const suggestedName =
      data.pageHeadline ||
      `${data.productName || 'Supplement'} – ${data.mainKeyword || 'Keyword'}`;

    const now = new Date().toISOString();
    const id = currentFunnelId ?? `funnel-${Date.now()}`;

    // Load existing funnel to preserve createdAt if updating
    const existingFunnel = currentFunnelId ? getFunnelById(currentFunnelId) : null;

    const funnel: FunnelConfig = {
      id,
      name: suggestedName,
      templateId: data.templateId,
      productName: data.productName,
      productUrl: data.productUrl,
      websiteUrl: data.websiteUrl || undefined,
      mainKeyword: data.mainKeyword,
      ageRange: data.ageRange,
      gender: data.gender,
      country: data.country || undefined,
      region: data.region || undefined, // Legacy: keep for backward compatibility
      targetStates: data.targetStates && data.targetStates.length > 0 
        ? data.targetStates 
        : (data.region ? data.region.split(',').map(s => s.trim()).filter(s => s) : undefined),
      tone: data.tone,
      font: data.font || undefined,
      coreNarrative: data.coreNarrative || undefined,
      coreNarrative: data.coreNarrative || undefined,
      pageHeadline: data.pageHeadline || undefined,
      introParagraph: data.introParagraph || undefined,
      mainBenefits: data.mainBenefits || undefined,
      effectivenessParagraphs: data.effectivenessParagraphs || undefined,
      comparisonParagraphs: data.comparisonParagraphs || undefined,
      reviewParagraphs: data.reviewParagraphs || undefined,
      bottomLineParagraph: data.bottomLineParagraph || undefined,
      sidebarDiscoverItems: data.sidebarDiscoverItems || undefined,
      sidebarTopItems: data.sidebarTopItems || undefined,
      ratings: data.ratings,
      newsletterTitle: data.newsletterTitle || undefined,
      newsletterDesc: data.newsletterDesc || undefined,
      slotData: data.slotData || undefined,
      createdAt: existingFunnel?.createdAt || now,
    };

    upsertFunnel(funnel);
    setCurrentFunnelId(id);
    setSaveMessage('Funnel saved');

    // Clear message after 3 seconds
    setTimeout(() => {
      setSaveMessage(null);
    }, 3000);
  };

  const handleOpenPreviewInNewTab = () => {
    try {
      const selected = getSelectedTemplate();
      let htmlContent = '';

      if (selected.type === 'uploaded' && selected.template) {
        // Generate HTML for uploaded template
        const files = buildUploadedTemplateFiles(selected.template, data.slotData || {});
        const htmlFile = files.find(f => f.path === 'index.html');
        if (htmlFile) {
          htmlContent = htmlFile.contents;
        } else {
          alert('Failed to generate preview HTML. Please try again.');
          return;
        }
      } else {
        // Generate HTML for CreatineReport template
        const previewProps = buildPreviewProps(data);
        htmlContent = buildCreatineReportHtml(previewProps);
      }

      // Create Blob and open in new tab
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Open in new tab - use noopener and noreferrer for security
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        // If popup was blocked, try alternative approach
        alert('Popup blocked. Please allow popups for this site, or try clicking the button again.');
        URL.revokeObjectURL(url);
        return;
      }
      
      // Revoke URL after a longer delay to ensure the page loads
      // The browser will keep the blob URL valid until the page is closed
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors if URL was already revoked
        }
      }, 10000); // 10 seconds should be enough for the page to load
    } catch (error) {
      console.error('Preview generation error:', error);
      alert('Failed to generate preview. Please try again.');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const selected = getSelectedTemplate();
      const slug = data.mainKeyword
        ? data.mainKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : 'funnel';

      let requestBody: any;
      
      if (selected.type === 'uploaded' && selected.template) {
        // Export uploaded template
        requestBody = {
          slug,
          template: selected.template,
          slotData: data.slotData || {},
          exportFormat,
        };
      } else {
        // Export CreatineReport template
        const previewProps = buildPreviewProps(data);
        requestBody = {
          slug,
          props: previewProps,
          exportFormat,
        };
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        alert('Export failed. Please try again.');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const buildPreviewProps = (formState: WizardData): CreatineReportProps => {
    // Build breadcrumb
    const breadcrumb = `Creatine Product Buyer's Guide > ${formState.productName || 'Supplement Review'}`;

    // Build page title
    const pageTitle = formState.pageHeadline || formState.productName || 'Creatine Supplement Review';

    // Build main lead
    let mainLead = formState.introParagraph;
    if (!mainLead || mainLead.trim() === '') {
      const keywordText = formState.mainKeyword ? ` about ${formState.mainKeyword}` : '';
      mainLead = `${formState.productName || 'This creatine supplement'} is a high-quality product${keywordText}. This comprehensive review examines its effectiveness, ingredients, and value for money.`;
    }

    // Build main benefits
    let mainBenefits: string[] = [];
    if (formState.mainBenefits && formState.mainBenefits.trim() !== '') {
      mainBenefits = formState.mainBenefits
        .split('\n')
        .map(b => {
          // Strip bullet points (•, *, -) from the beginning of each line
          let trimmed = b.trim();
          if (trimmed.startsWith('• ')) {
            trimmed = trimmed.substring(2);
          } else if (trimmed.startsWith('* ')) {
            trimmed = trimmed.substring(2);
          } else if (trimmed.startsWith('- ')) {
            trimmed = trimmed.substring(2);
          }
          return trimmed;
        })
        .filter(b => b !== '');
    }
    if (mainBenefits.length === 0) {
      mainBenefits = [
        'Increases muscle strength and power output',
        'Enhances muscle recovery after workouts',
        'Supports muscle growth and size gains',
        'Improves exercise performance and endurance',
        'Helps maintain muscle mass during training'
      ];
    }

    // Build paragraph sections - use user-provided values or generate defaults
    const ageText = formState.ageRange ? ` for ${formState.ageRange}` : '';
    const genderText = formState.gender && formState.gender !== 'all' ? ` ${formState.gender}` : '';
    // Build location text - always includes country, optionally includes states
    let locationText = '';
    if (formState.country) {
      locationText = ` in ${formState.country}`;
      if (formState.region && formState.region.trim()) {
        const states = formState.region.split(',').map(s => s.trim()).filter(s => s);
        if (states.length > 0) {
          if (states.length === 1) {
            locationText = ` in ${states[0]}, ${formState.country}`;
          } else if (states.length <= 3) {
            locationText = ` in ${states.join(', ')}, ${formState.country}`;
          } else {
            locationText = ` in ${states.slice(0, 3).join(', ')}, and ${states.length - 3} more states, ${formState.country}`;
          }
        }
      }
    }
    const toneText = formState.tone ? ` with a ${formState.tone} tone` : '';
    const keywordText = formState.mainKeyword ? ` related to ${formState.mainKeyword}` : '';

    // Effectiveness paragraphs - use user input or generate defaults
    let effectivenessParagraphs: string[] = [];
    if (formState.effectivenessParagraphs && formState.effectivenessParagraphs.trim() !== '') {
      effectivenessParagraphs = formState.effectivenessParagraphs
        .split('\n')
        .map(p => p.trim())
        .filter(p => p !== '');
    }
    if (effectivenessParagraphs.length === 0) {
      effectivenessParagraphs = [
        `${formState.productName || 'This creatine supplement'} contains pure creatine monohydrate, which is the most researched and proven form of creatine available. Studies consistently show that creatine monohydrate supplementation can increase muscle creatine stores by up to 40%, leading to improved performance in high-intensity activities.`,
        `The product is designed${ageText}${genderText ? ` for ${genderText} users` : ''}${locationText}${toneText}. Each serving provides 5 grams of creatine monohydrate, which is the standard effective dose recommended by research.`,
        `Users typically report noticeable improvements in strength and muscle fullness within 2-4 weeks of consistent use, especially when combined with proper training and nutrition.`
      ];
    }

    // Comparison paragraphs - use user input or generate defaults
    let comparisonParagraphs: string[] = [];
    if (formState.comparisonParagraphs && formState.comparisonParagraphs.trim() !== '') {
      comparisonParagraphs = formState.comparisonParagraphs
        .split('\n')
        .map(p => p.trim())
        .filter(p => p !== '');
    }
    if (comparisonParagraphs.length === 0) {
      comparisonParagraphs = [
        `Compared to other creatine supplements on the market, ${formState.productName || 'this product'} offers excellent value. While some brands charge premium prices for "advanced" forms of creatine, research shows that creatine monohydrate is equally effective and often more cost-efficient.`,
        `The product stands out for its purity and lack of unnecessary additives. Unlike some competitors that include fillers or proprietary blends, this supplement provides exactly what you need: pure creatine monohydrate${keywordText}.`,
        `When compared to leading brands, ${formState.productName || 'this creatine supplement'} delivers similar results at a more affordable price point, making it an excellent choice for budget-conscious athletes and fitness enthusiasts.`
      ];
    }

    // Review paragraphs - use user input or generate defaults
    let reviewParagraphs: string[] = [];
    if (formState.reviewParagraphs && formState.reviewParagraphs.trim() !== '') {
      reviewParagraphs = formState.reviewParagraphs
        .split('\n')
        .map(p => p.trim())
        .filter(p => p !== '');
    }
    if (reviewParagraphs.length === 0) {
      reviewParagraphs = [
        `Customer reviews consistently praise ${formState.productName || 'this product'} for its effectiveness and value. Many users report significant strength gains and improved workout performance after just a few weeks of use.`,
        `The powder mixes easily in water or juice, with minimal clumping. Some users note a slight chalky taste, which is common with creatine supplements, but it's generally well-tolerated.`,
        `The packaging is functional and includes a scoop for easy measuring. The product arrives well-sealed and fresh, with a long shelf life when stored properly.`
      ];
    }

    // Bottom line - use user input or generate default
    let bottomLineParagraph = formState.bottomLineParagraph;
    if (!bottomLineParagraph || bottomLineParagraph.trim() === '') {
      bottomLineParagraph = `${formState.productName || 'This creatine supplement'} is a solid choice for anyone looking to supplement with creatine monohydrate${keywordText}. It offers proven effectiveness, good value for money, and reliable quality. While it may not have the flashy marketing of premium brands, it delivers the results you need at a reasonable price. Recommended for athletes, bodybuilders, and fitness enthusiasts looking to enhance their performance and muscle gains.`;
    }

    // Sidebar items - use user input or generate defaults
    let sidebarDiscoverItems: string[] = [];
    if (formState.sidebarDiscoverItems && formState.sidebarDiscoverItems.trim() !== '') {
      sidebarDiscoverItems = formState.sidebarDiscoverItems
        .split('\n')
        .map(item => item.trim())
        .filter(item => item !== '');
    }
    if (sidebarDiscoverItems.length === 0) {
      sidebarDiscoverItems = [
        'How creatine monohydrate works in your body',
        'The science behind muscle strength gains',
        'Optimal dosing strategies for best results',
        'Common myths about creatine debunked',
        'How to cycle creatine effectively'
      ];
    }

    let sidebarTopItems: string[] = [];
    if (formState.sidebarTopItems && formState.sidebarTopItems.trim() !== '') {
      sidebarTopItems = formState.sidebarTopItems
        .split('\n')
        .map(item => item.trim())
        .filter(item => item !== '');
    }
    if (sidebarTopItems.length === 0) {
      sidebarTopItems = [
        'Purity and quality of ingredients',
        'Dosage and serving size',
        'Price and value for money',
        'Mixability and taste',
        'Customer reviews and ratings',
        'Third-party testing and certifications'
      ];
    }

    // Ratings - parse user input or use defaults
    const ratings = {
      customerService: parseFloat(formState.ratings.customerService) || 5,
      valueRating: parseFloat(formState.ratings.valueRating) || 5,
      customerRating: parseFloat(formState.ratings.customerRating) || 5,
      overallRating: parseFloat(formState.ratings.overallRating) || 5,
    };

    return {
      breadcrumb,
      pageTitle,
      updatedTag: 'Updated November 2025',
      productName: formState.productName || 'Creatine Supplement',
      productImageAlt: `Product image for ${formState.productName || 'this creatine supplement'}`,
      mainLead,
      mainBenefits,
      effectivenessParagraphs,
      comparisonParagraphs,
      reviewParagraphs,
      bottomLineParagraph,
      ratings,
      productUrl: formState.productUrl || '#',
      sidebarDiscoverItems,
      sidebarTopItems,
      newsletterTitle: formState.newsletterTitle || 'Stay Updated',
      newsletterDesc: formState.newsletterDesc || 'Get the latest creatine research, product reviews, and fitness tips delivered to your inbox.'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to home
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              New Funnel Wizard
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            Step {currentStep} of 4
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side: Form */}
          <div className="flex-1">
            <style dangerouslySetInnerHTML={{
              __html: `
                .wizard-form-container textarea {
                  font-size: 22px !important;
                  line-height: 1.6 !important;
                }
                .wizard-form-container label {
                  font-size: 18px !important;
                  font-weight: 500 !important;
                }
                /* Live Summary section font sizes - make them larger */
                .wizard-summary-section h3 {
                  font-size: 24px !important;
                  font-weight: 600 !important;
                }
                .wizard-summary-section h4 {
                  font-size: 20px !important;
                  font-weight: 600 !important;
                }
                .wizard-summary-section .text-gray-600,
                .wizard-summary-section .text-gray-900,
                .wizard-summary-section span:not(.text-xs):not(.text-sm) {
                  font-size: 18px !important;
                }
                .wizard-summary-section .text-sm {
                  font-size: 16px !important;
                }
                .wizard-summary-section .text-xs {
                  font-size: 14px !important;
                }
                .wizard-summary-section em {
                  font-size: 18px !important;
                }
                /* Prevent template CSS from affecting wizard UI */
                .preview-container {
                  isolation: isolate !important;
                  contain: layout style paint !important;
                }
                .preview-container * {
                  box-sizing: border-box !important;
                }
              `
            }} />
            <div className="wizard-form-container bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Step 1: Template & basics */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Template & Basics
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Template <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.templateId}
                        onChange={(e) => {
                          const newTemplateId = e.target.value as TemplateId;
                          // Reset slotData when template changes
                          setData(prev => ({
                            ...prev,
                            templateId: newTemplateId,
                            slotData: undefined
                          }));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <optgroup label="System Templates">
                          {TEMPLATES.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </optgroup>
                        {uploadedTemplates.length > 0 && (
                          <optgroup label="Uploaded Templates">
                            {uploadedTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {uploadedTemplates.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Upload templates from the <Link href="/templates" className="text-blue-600 hover:underline">Templates page</Link>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Supplement / Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.productName}
                        onChange={(e) => updateField('productName', e.target.value)}
                        placeholder="e.g. CreaPure Creatine Monohydrate"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Website URL (for template extraction)
                      </label>
                      <input
                        type="url"
                        value={data.websiteUrl}
                        onChange={(e) => updateField('websiteUrl', e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Optional: Provide a website URL to extract its design as a template. The system will clean and process the HTML automatically.
                      </p>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Main Product URL
                      </label>
                      <input
                        type="text"
                        value={data.productUrl}
                        onChange={(e) => updateField('productUrl', e.target.value)}
                        placeholder="https://example.com/product"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Main Keyword / Topic <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.mainKeyword}
                        onChange={(e) => updateField('mainKeyword', e.target.value)}
                        placeholder="e.g. creatine bloating"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Audience & tone */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Audience & Tone
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Age Range <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.ageRange}
                        onChange={(e) => updateField('ageRange', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select age range</option>
                        <option value="18-24">18-24</option>
                        <option value="25-34">25-34</option>
                        <option value="35-44">35-44</option>
                        <option value="45-54">45-54</option>
                        <option value="55-64">55-64</option>
                        <option value="65+">65+</option>
                        <option value="all">All Ages</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.gender}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={data.country}
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">Country is set to United States by default</p>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Target State / Region <span className="text-gray-500">(Optional)</span>
                      </label>
                      <select
                        multiple
                        value={data.targetStates || []}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          updateField('targetStates', selected);
                          // Also sync to region for backward compatibility
                          updateField('region', selected.join(', '));
                        }}
                        size={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {US_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Hold Ctrl (Windows) or Cmd (Mac) to select multiple states. The AI will customize content based on regional culture, demographics, and lifestyle.
                      </p>
                      {data.targetStates && data.targetStates.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 font-medium mb-1">Selected states:</p>
                          <div className="flex flex-wrap gap-2">
                            {data.targetStates.map((state, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs"
                              >
                                {state}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = data.targetStates.filter(s => s !== state);
                                    updateField('targetStates', updated);
                                    // Also sync to region for backward compatibility
                                    updateField('region', updated.join(', '));
                                  }}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Tone of Voice <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.tone}
                        onChange={(e) => updateField('tone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select tone</option>
                        <option value="serious">Serious</option>
                        <option value="educational">Educational</option>
                        <option value="cheerful">Cheerful</option>
                        <option value="direct">Direct</option>
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Font Family <span className="text-gray-500">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          ref={fontInputRef}
                          type="text"
                          value={showFontDropdown ? fontSearch : (data.font || '')}
                          onChange={(e) => {
                            setFontSearch(e.target.value);
                            setShowFontDropdown(true);
                          }}
                          onFocus={() => {
                            setFontSearch(''); // Clear search to show all fonts
                            setShowFontDropdown(true);
                          }}
                          placeholder="Search or select a font..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          style={{ fontFamily: data.font || 'Arial' }}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {showFontDropdown && (
                        <div 
                          ref={fontDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto"
                          style={{ maxHeight: '320px' }}
                          onMouseDown={(e) => {
                            // Prevent input blur when clicking inside dropdown
                            e.preventDefault();
                          }}
                        >
                          <div className="sticky top-0 bg-white border-b border-gray-200 p-2 z-10">
                            <input
                              type="text"
                              value={fontSearch}
                              onChange={(e) => setFontSearch(e.target.value)}
                              placeholder="Type to search fonts..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              autoFocus
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                            <div className="mt-1 text-xs text-gray-500">
                              {FONTS.filter(font => 
                                font.toLowerCase().includes(fontSearch.toLowerCase())
                              ).length} fonts found
                            </div>
                          </div>
                          <div className="py-1">
                            {FONTS.filter(font => 
                              fontSearch === '' || font.toLowerCase().includes(fontSearch.toLowerCase())
                            ).map((font) => (
                              <div
                                key={font}
                                onClick={() => {
                                  updateField('font', font);
                                  setFontSearch('');
                                  setShowFontDropdown(false);
                                }}
                                className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                                  data.font === font ? 'bg-blue-100 font-semibold' : ''
                                }`}
                                style={{ fontFamily: font }}
                              >
                                {font}
                              </div>
                            ))}
                            {FONTS.filter(font => 
                              fontSearch === '' || font.toLowerCase().includes(fontSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="px-4 py-2 text-gray-500 text-sm">
                                No fonts found matching "{fontSearch}"
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Select a font family for your funnel site. Preview shown in the input field.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Core Narrative Generation */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Core Content Generation
                  </h2>
                  
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Generate a comprehensive master narrative that will serve as the "source of truth" for all page content. 
                      This narrative will be distributed across all content slots to ensure consistency.
                    </p>
                    
                    <button
                      onClick={handleGenerateCoreNarrative}
                      disabled={isGeneratingCoreNarrative || !data.productName || !data.mainKeyword}
                      className={`w-full px-6 py-3 rounded-md font-medium transition-colors ${
                        isGeneratingCoreNarrative || !data.productName || !data.mainKeyword
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isGeneratingCoreNarrative ? 'Generating Master Narrative...' : 'Generate Master Narrative'}
                    </button>
                    
                    {isGeneratingCoreNarrative && (
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        Generating comprehensive narrative... This may take a moment.
                      </p>
                    )}
                    
                    {errorMessage && (
                      <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Core Narrative (Master Marketing Document)
                      {data.coreNarrative && (
                        <span className="ml-2 text-green-600 text-sm">✓ Generated</span>
                      )}
                    </label>
                    <textarea
                      value={data.coreNarrative}
                      onChange={(e) => updateField('coreNarrative', e.target.value)}
                      placeholder="The master narrative will appear here after generation. You can edit it to adjust the overall angle before distributing to slots."
                      rows={20}
                      className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        data.coreNarrative ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                      style={{ fontSize: '16px', lineHeight: '1.6', fontFamily: 'monospace' }}
                    />
                    {data.coreNarrative && (
                      <p className="mt-2 text-xs text-gray-500">
                        💡 Tip: Review and edit this narrative to ensure it captures your desired angle. 
                        When you click "Next", this content will be automatically distributed to all page slots.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Content placeholders */}
              {currentStep === 4 && (() => {
                const selected = getSelectedTemplate();
                const isCreatineReport = selected.type === 'system';
                
                return (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Content Placeholders
                  </h2>
                  {!isCreatineReport && selected.template && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Template:</strong> {selected.template.name} ({selected.template.slots.length} editable sections)
                      </p>
                    </div>
                  )}

                  {!data.coreNarrative && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> No core narrative found. Go back to Step 3 to generate the master narrative first, 
                        or use the "Map from Core" button below to manually trigger mapping.
                      </p>
                      <button
                        onClick={handleMapNarrativeToSlots}
                        disabled={isMappingToSlots || !data.coreNarrative}
                        className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                      >
                        {isMappingToSlots ? 'Mapping...' : 'Map from Core Narrative'}
                      </button>
                    </div>
                  )}
                  
                  {data.coreNarrative && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>✓ Core Narrative Available</strong> - Content slots are pre-filled from your core narrative. 
                        Use "Regenerate" buttons to refine individual sections.
                      </p>
                    </div>
                  )}
                  
                  {errorMessage && (
                    <div className="mb-6">
                      <p className="text-sm text-red-600">{errorMessage}</p>
                    </div>
                  )}

                  {/* CreatineReport template fields */}
                  {isCreatineReport && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-base font-medium text-gray-700">
                          Page Headline
                          {data.pageHeadline && (
                            <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                          )}
                        </label>
                        {data.coreNarrative && (
                          <button
                            onClick={() => handleRegenerateSlot('pageHeadline', 'headline')}
                            disabled={isGenerating}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={data.pageHeadline}
                        onChange={(e) => updateField('pageHeadline', e.target.value)}
                        placeholder="e.g. Does Creatine Cause Bloating? Here's What Science Says"
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          data.pageHeadline ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-base font-medium text-gray-700">
                          Intro Paragraph
                          {data.introParagraph && (
                            <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                          )}
                        </label>
                        {data.coreNarrative && (
                          <button
                            onClick={() => handleRegenerateSlot('introParagraph', 'paragraph')}
                            disabled={isGenerating}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={data.introParagraph}
                        onChange={(e) => updateField('introParagraph', e.target.value)}
                        placeholder="Write a brief introduction..."
                        rows={4}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          data.introParagraph ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                        style={{ fontSize: '22px', lineHeight: '1.6', minHeight: '100px' }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-base font-medium text-gray-700">
                          Main Benefits <span className="text-gray-500">(one per line)</span>
                          {data.mainBenefits && (
                            <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                          )}
                        </label>
                        {data.coreNarrative && (
                          <button
                            onClick={() => handleRegenerateSlot('mainBenefits', 'list')}
                            disabled={isGenerating}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={data.mainBenefits}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Auto-add bullet points to each line if not present
                          const lines = value.split('\n');
                          const processedLines = lines.map((line, index) => {
                            const trimmed = line.trim();
                            // Skip empty lines
                            if (trimmed === '') return '';
                            // If line doesn't start with bullet point, add it
                            if (!trimmed.startsWith('• ') && !trimmed.startsWith('* ') && !trimmed.startsWith('- ')) {
                              return '• ' + trimmed;
                            }
                            return line;
                          });
                          // Join lines, preserving original line breaks for empty lines
                          const result = lines.map((line, index) => {
                            if (line.trim() === '') return line;
                            return processedLines[index] || line;
                          }).join('\n');
                          updateField('mainBenefits', result);
                        }}
                        onBlur={(e) => {
                          // Ensure all non-empty lines have bullet points on blur
                          let value = e.target.value;
                          const lines = value.split('\n');
                          const processedLines = lines.map((line) => {
                            const trimmed = line.trim();
                            if (trimmed === '') return '';
                            if (!trimmed.startsWith('• ') && !trimmed.startsWith('* ') && !trimmed.startsWith('- ')) {
                              return '• ' + trimmed;
                            }
                            return line;
                          });
                          const result = processedLines.join('\n');
                          if (result !== value) {
                            updateField('mainBenefits', result);
                          }
                        }}
                        placeholder="• Increases muscle strength&#10;• Improves workout performance&#10;• Enhances muscle recovery"
                        rows={6}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          data.mainBenefits ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                        style={{ fontSize: '22px', lineHeight: '1.6' }}
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Effectiveness Section</h3>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-base font-medium text-gray-700">
                          Effectiveness Paragraphs <span className="text-gray-500">(one per line)</span>
                          {data.effectivenessParagraphs && (
                            <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                          )}
                        </label>
                        {data.coreNarrative && (
                          <button
                            onClick={() => handleRegenerateSlot('effectivenessParagraphs', 'paragraph')}
                            disabled={isGenerating}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={data.effectivenessParagraphs}
                        onChange={(e) => updateField('effectivenessParagraphs', e.target.value)}
                        placeholder="First paragraph about effectiveness...&#10;Second paragraph...&#10;Third paragraph..."
                        rows={6}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          data.effectivenessParagraphs ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                        style={{ fontSize: '22px', lineHeight: '1.6' }}
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison Section</h3>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-base font-medium text-gray-700">
                          Comparison Paragraphs <span className="text-gray-500">(one per line)</span>
                          {data.comparisonParagraphs && (
                            <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                          )}
                        </label>
                        {data.coreNarrative && (
                          <button
                            onClick={() => handleRegenerateSlot('comparisonParagraphs', 'paragraph')}
                            disabled={isGenerating}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={data.comparisonParagraphs}
                        onChange={(e) => updateField('comparisonParagraphs', e.target.value)}
                        placeholder="First comparison paragraph...&#10;Second comparison paragraph...&#10;Third comparison paragraph..."
                        rows={6}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          data.comparisonParagraphs ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                        style={{ fontSize: '22px', lineHeight: '1.6' }}
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Reviews Section</h3>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-base font-medium text-gray-700">
                          Review Paragraphs <span className="text-gray-500">(one per line)</span>
                          {data.reviewParagraphs && (
                            <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                          )}
                        </label>
                        {data.coreNarrative && (
                          <button
                            onClick={() => handleRegenerateSlot('reviewParagraphs', 'paragraph')}
                            disabled={isGenerating}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={data.reviewParagraphs}
                        onChange={(e) => updateField('reviewParagraphs', e.target.value)}
                        placeholder="First review paragraph...&#10;Second review paragraph...&#10;Third review paragraph..."
                        rows={6}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          data.reviewParagraphs ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                        style={{ fontSize: '22px', lineHeight: '1.6' }}
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Bottom Line</h3>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-base font-medium text-gray-700">
                          Bottom Line Paragraph
                          {data.bottomLineParagraph && (
                            <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                          )}
                        </label>
                        {data.coreNarrative && (
                          <button
                            onClick={() => handleRegenerateSlot('bottomLineParagraph', 'paragraph')}
                            disabled={isGenerating}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={data.bottomLineParagraph}
                        onChange={(e) => updateField('bottomLineParagraph', e.target.value)}
                        placeholder="Write a concluding paragraph..."
                        rows={4}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          data.bottomLineParagraph ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                        style={{ fontSize: '22px', lineHeight: '1.6' }}
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sidebar Content</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-base font-medium text-gray-700">
                              What You'll Discover Items <span className="text-gray-500">(one per line)</span>
                              {data.sidebarDiscoverItems && (
                                <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                              )}
                            </label>
                            {data.coreNarrative && (
                              <button
                                onClick={() => handleRegenerateSlot('sidebarDiscoverItems', 'list')}
                                disabled={isGenerating}
                                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                              >
                                {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                              </button>
                            )}
                          </div>
                          <textarea
                            value={data.sidebarDiscoverItems}
                            onChange={(e) => updateField('sidebarDiscoverItems', e.target.value)}
                            placeholder="How creatine monohydrate works in your body&#10;The science behind muscle strength gains&#10;Optimal dosing strategies for best results"
                            rows={5}
                            className={`w-full px-4 py-2 text-base border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              data.sidebarDiscoverItems ? 'border-green-300 bg-green-50' : 'border-gray-300'
                            }`}
                            style={{ fontSize: '22px', lineHeight: '1.6' }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-base font-medium text-gray-700">
                              Top Items to Consider <span className="text-gray-500">(one per line)</span>
                              {data.sidebarTopItems && (
                                <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                              )}
                            </label>
                            {data.coreNarrative && (
                              <button
                                onClick={() => handleRegenerateSlot('sidebarTopItems', 'list')}
                                disabled={isGenerating}
                                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                              >
                                {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                              </button>
                            )}
                          </div>
                          <textarea
                            value={data.sidebarTopItems}
                            onChange={(e) => updateField('sidebarTopItems', e.target.value)}
                            placeholder="Purity and quality of ingredients&#10;Dosage and serving size&#10;Price and value for money"
                            rows={6}
                            className={`w-full px-4 py-2 text-base border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              data.sidebarTopItems ? 'border-green-300 bg-green-50' : 'border-gray-300'
                            }`}
                            style={{ fontSize: '22px', lineHeight: '1.6' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ratings</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-2">
                            Overall Rating (1-5)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={data.ratings.overallRating}
                            onChange={(e) => updateField('ratings', { ...data.ratings, overallRating: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-2">
                            Customer Service (1-5)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={data.ratings.customerService}
                            onChange={(e) => updateField('ratings', { ...data.ratings, customerService: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-2">
                            Value Rating (1-5)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={data.ratings.valueRating}
                            onChange={(e) => updateField('ratings', { ...data.ratings, valueRating: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-2">
                            Customer Rating (1-5)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={data.ratings.customerRating}
                            onChange={(e) => updateField('ratings', { ...data.ratings, customerRating: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Newsletter Section</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-base font-medium text-gray-700">
                              Newsletter Title
                              {data.newsletterTitle && (
                                <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                              )}
                            </label>
                            {data.coreNarrative && (
                              <button
                                onClick={() => handleRegenerateSlot('newsletterTitle', 'headline')}
                                disabled={isGenerating}
                                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                              >
                                {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={data.newsletterTitle}
                            onChange={(e) => updateField('newsletterTitle', e.target.value)}
                            placeholder="Stay Updated"
                            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              data.newsletterTitle ? 'border-green-300 bg-green-50' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-base font-medium text-gray-700">
                              Newsletter Description
                              {data.newsletterDesc && (
                                <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                              )}
                            </label>
                            {data.coreNarrative && (
                              <button
                                onClick={() => handleRegenerateSlot('newsletterDesc', 'paragraph')}
                                disabled={isGenerating}
                                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                              >
                                {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                              </button>
                            )}
                          </div>
                          <textarea
                            value={data.newsletterDesc}
                            onChange={(e) => updateField('newsletterDesc', e.target.value)}
                            placeholder="Get the latest creatine research, product reviews, and fitness tips delivered to your inbox."
                            rows={3}
                            className={`w-full px-4 py-2 text-base border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              data.newsletterDesc ? 'border-green-300 bg-green-50' : 'border-gray-300'
                            }`}
                            style={{ fontSize: '22px', lineHeight: '1.6' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Dynamic fields for uploaded templates */}
                  {!isCreatineReport && selected.template && (
                    <div className="space-y-6 mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Template Content Sections
                      </h3>
                      {selected.template.slots.map((slot) => {
                        const slotValue = data.slotData?.[slot.id] || '';
                        const isFilled = slotValue.trim().length > 0;
                        const slotTypeMap: Record<string, string> = {
                          text: 'paragraph',
                          list: 'list',
                          image: 'paragraph',
                          url: 'paragraph',
                        };
                        const mappedSlotType = slotTypeMap[slot.type] || 'paragraph';
                        
                        return (
                          <div key={slot.id}>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-base font-medium text-gray-700">
                                {slot.label} <span className="text-gray-500">({slot.type})</span>
                                {isFilled && (
                                  <span className="ml-2 text-green-600 text-sm">✓ Filled</span>
                                )}
                              </label>
                              {data.coreNarrative && (
                                <button
                                  onClick={() => handleRegenerateSlot(slot.id, mappedSlotType)}
                                  disabled={isGenerating}
                                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                  {isGenerating ? 'Regenerating...' : '🔄 Regenerate from Core'}
                                </button>
                              )}
                            </div>
                            {slot.type === 'list' ? (
                              <textarea
                                value={slotValue}
                                onChange={(e) => {
                                  setData(prev => ({
                                    ...prev,
                                    slotData: { ...prev.slotData || {}, [slot.id]: e.target.value }
                                  }));
                                }}
                                placeholder={`Enter ${slot.label.toLowerCase()} (one per line)`}
                                rows={slot.type === 'list' ? 6 : 4}
                                className={`w-full px-4 py-2 text-base border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                  isFilled ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                }`}
                                style={{ fontSize: '22px', lineHeight: '1.6' }}
                              />
                            ) : (
                              <textarea
                                value={slotValue}
                                onChange={(e) => {
                                  setData(prev => ({
                                    ...prev,
                                    slotData: { ...prev.slotData || {}, [slot.id]: e.target.value }
                                  }));
                                }}
                                placeholder={`Enter ${slot.label.toLowerCase()}`}
                                rows={4}
                                className={`w-full px-4 py-2 text-base border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                  isFilled ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                }`}
                                style={{ fontSize: '22px', lineHeight: '1.6' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleOpenPreviewInNewTab}
                      className="w-full px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Generate Preview
                    </button>
                  </div>
                </div>
                );
              })()}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={goBack}
                  disabled={currentStep === 1 || currentStep === 4}
                  className={`px-6 py-2 rounded-md font-medium ${
                    currentStep === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  Back
                </button>

                <button
                  onClick={async () => {
                    if (currentStep === 3 && data.coreNarrative.trim()) {
                      // Step 3: Map narrative to slots before proceeding
                      await handleMapNarrativeToSlots();
                      // Only proceed if mapping was successful (no error message)
                      if (!errorMessage) {
                        setCurrentStep(4);
                      }
                    } else {
                      goNext();
                    }
                  }}
                  disabled={currentStep === 4 || (currentStep === 3 && (isMappingToSlots || !data.coreNarrative.trim()))}
                  className={`px-6 py-2 rounded-md font-medium ${
                    currentStep === 4 || (currentStep === 3 && (isMappingToSlots || !data.coreNarrative.trim()))
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {currentStep === 3 && isMappingToSlots 
                    ? 'Mapping to Slots...' 
                    : currentStep === 3 
                    ? 'Next: Map to Slots' 
                    : 'Next'}
                </button>
              </div>
            </div>
          </div>

          {/* Right side: Summary */}
          <div className="lg:w-96">
            <div className="wizard-summary-section bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Live Summary
              </h3>

              {/* Template & basics */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-3">
                  Template & Basics
                </h4>
                <div className="space-y-2 text-base">
                  <div>
                    <span className="text-gray-600">Template:</span>{' '}
                    <span className="text-gray-900">
                      {TEMPLATES.find((t) => t.id === data.templateId)?.name || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Product:</span>{' '}
                    <span className="text-gray-900">
                      {data.productName || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">URL:</span>{' '}
                    <span className="text-gray-900 break-all">
                      {data.productUrl || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Keyword:</span>{' '}
                    <span className="text-gray-900">
                      {data.mainKeyword || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Target States:</span>{' '}
                    <span className="text-gray-900">
                      {data.targetStates && data.targetStates.length > 0 
                        ? data.targetStates.join(', ')
                        : <em className="text-gray-400">Not set (General US)</em>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audience & tone */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-700 mb-3">
                  Audience & Tone
                </h4>
                <div className="space-y-2 text-base">
                  <div>
                    <span className="text-gray-600">Age:</span>{' '}
                    <span className="text-gray-900">
                      {data.ageRange || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Gender:</span>{' '}
                    <span className="text-gray-900 capitalize">
                      {data.gender || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Country:</span>{' '}
                    <span className="text-gray-900">
                      {data.country || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">States (Legacy):</span>{' '}
                    <span className="text-gray-900">
                      {data.region ? (
                        data.region.split(',').map((s, idx) => (
                          <span key={idx}>
                            {s.trim()}
                            {idx < data.region.split(',').length - 1 && ', '}
                          </span>
                        ))
                      ) : (
                        <em className="text-gray-400">Not set yet</em>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tone:</span>{' '}
                    <span className="text-gray-900 capitalize">
                      {data.tone || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Font:</span>{' '}
                    <span className="text-gray-900" style={{ fontFamily: data.font || 'Arial' }}>
                      {data.font || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content draft */}
              <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-3">
                  Content Draft
                </h4>
                <div className="space-y-2 text-base">
                  {/* Helper function to check if content is filled */}
                  {(() => {
                    const isFilled = (content: string | undefined | null): boolean => {
                      return content ? content.trim().length > 0 : false;
                    };
                    
                    const sections = [
                      { label: 'Headline', filled: isFilled(data.pageHeadline) },
                      { label: 'Intro', filled: isFilled(data.introParagraph) },
                      { label: 'Benefits', filled: isFilled(data.mainBenefits) },
                      { label: 'Effectiveness Paragraphs', filled: isFilled(data.effectivenessParagraphs) },
                      { label: 'Comparison Paragraphs', filled: isFilled(data.comparisonParagraphs) },
                      { label: 'Review Paragraphs', filled: isFilled(data.reviewParagraphs) },
                      { label: 'Bottom Line Paragraph', filled: isFilled(data.bottomLineParagraph) },
                      { label: 'Sidebar Discover Items', filled: isFilled(data.sidebarDiscoverItems) },
                      { label: 'Sidebar Top Items', filled: isFilled(data.sidebarTopItems) },
                      { 
                        label: 'Ratings', 
                        filled: data.ratings.customerService?.trim() && 
                               data.ratings.valueRating?.trim() && 
                               data.ratings.customerRating?.trim() && 
                               data.ratings.overallRating?.trim() 
                      },
                      { label: 'Newsletter Title', filled: isFilled(data.newsletterTitle) },
                      { label: 'Newsletter Description', filled: isFilled(data.newsletterDesc) },
                    ];
                    
                    return sections.map((section, index) => (
                      <div key={index} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600 text-base">{section.label}:</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${
                          section.filled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {section.filled ? '✓ Filled' : '○ Empty'}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section - Outside the main content container to prevent layout breaks */}
      {/* Export and Save buttons - moved to Step 4 */}
      {currentStep === 4 && (
        <div className="w-full bg-white border-t-2 border-gray-300 py-8 mt-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Export & Save Options
              </h2>
            </div>
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleSave}
                disabled={!data.productName || !data.mainKeyword}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  !data.productName || !data.mainKeyword
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Save funnel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  isExporting
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isExporting ? 'Building export...' : 'Export for WebDev (ZIP)'}
              </button>
            </div>
            {/* Export Format Selector */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <label className="block text-base font-medium text-gray-700 mb-2">
                Export format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="static-html">Static HTML/CSS</option>
                <option value="react-json">React component + JSON</option>
              </select>
              <p className="mt-2 text-xs text-gray-600">
                {exportFormat === 'static-html' 
                  ? 'Includes: index.html + styles.css + main.js'
                  : (() => {
                      const computedSlug = data.mainKeyword
                        ? data.mainKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                        : 'funnel';
                      return `Includes: LandingPage.tsx + ${computedSlug}.config.json + styles.css`;
                    })()}
              </p>
            </div>
            {saveMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⚠️ Missing Information
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The following fields are not filled in the current step:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 mb-6 space-y-1">
              {warningFields.map((field, index) => (
                <li key={index}>{field}</li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mb-6">
              You can continue anyway, but these fields may be required for generating content or preview.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setWarningFields([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                Go Back
              </button>
              <button
                onClick={handleContinueAnyway}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

