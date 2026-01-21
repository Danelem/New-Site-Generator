'use client';

import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { UploadedTemplateRenderer } from '@/components/templates/UploadedTemplateRenderer';
import { ImageSlotUpload } from '@/components/templates/ImageSlotUpload';
import { ValidationPanel } from '@/components/content/ValidationPanel';
import { TEMPLATES, TemplateId, getTemplateConfigById } from '@/lib/templates/registry';
import { loadUploadedTemplates } from '@/lib/templates/uploadedStorage';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';
import type { TemplateConfig } from '@/lib/templates/types';
import { extractImageMetadata } from '@/lib/templates/imageExtractor';
import { FunnelConfig } from '@/lib/funnels/types';
import { getFunnelById, upsertFunnel } from '@/lib/funnels/storage';
import { ExportFormat } from '@/lib/export/types';
import { buildUploadedTemplateFiles } from '@/lib/export/buildUploadedTemplateFiles';
import { getTemplateFields } from '@/lib/generator/templateFields';

interface WizardData {
  templateId: TemplateId;
  productName: string;
  productUrl: string;
  websiteUrl: string;
  mainKeyword: string;
  targetStates: string[];
  ageRange: string;
  gender: string;
  country: string;
  region: string;
  tone: string;
  font: string;
  coreNarrative: string;
  slotData?: Record<string, string>;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
];

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
  templateId: '',
  productName: '',
  productUrl: '',
  websiteUrl: '',
  mainKeyword: '',
  targetStates: [],
  ageRange: '',
  gender: '',
  country: 'United States',
  region: '',
  tone: '',
  font: 'Arial',
  coreNarrative: '',
};

function getSlotMaxLength(slotId: string, template: TemplateConfig | null): number | undefined {
  if (!template) return undefined;
  const fields = getTemplateFields(template);
  const field = fields.find(f => f.slotId === slotId);
  return field?.maxLength;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function CharacterCounter({ value, maxLength }: { value: string; maxLength?: number }) {
  const currentLength = value.length;
  if (!maxLength) {
    return (
      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        {currentLength} characters
      </div>
    );
  }
  const isNearLimit = currentLength > maxLength * 0.8;
  const isOverLimit = currentLength > maxLength;
  return (
    <div className={`absolute bottom-2 right-2 text-xs ${
      isOverLimit ? 'text-red-600 font-semibold' : 
      isNearLimit ? 'text-orange-600' : 
      'text-gray-500'
    }`}>
      {currentLength}/{maxLength}
    </div>
  );
}

// Formatting toolbar component for text areas
function FormattingToolbar({ 
  textareaId,
  value, 
  onChange 
}: { 
  textareaId: string;
  value: string;
  onChange: (newValue: string) => void;
}) {
  const applyFormatting = (tag: 'strong' | 'em') => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      // Wrap selected text with the tag
      const openTag = tag === 'strong' ? '<strong>' : '<em>';
      const closeTag = tag === 'strong' ? '</strong>' : '</em>';
      const newValue = 
        value.substring(0, start) + 
        openTag + selectedText + closeTag + 
        value.substring(end);
      
      onChange(newValue);
      
      // Restore cursor position after the inserted tag
      setTimeout(() => {
        const newPosition = start + openTag.length + selectedText.length + closeTag.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    } else {
      // No selection - insert tags at cursor position
      const openTag = tag === 'strong' ? '<strong></strong>' : '<em></em>';
      const newValue = 
        value.substring(0, start) + 
        openTag + 
        value.substring(end);
      
      onChange(newValue);
      
      // Position cursor between the tags
      setTimeout(() => {
        const newPosition = start + (tag === 'strong' ? 8 : 4); // <strong> = 8 chars, <em> = 4 chars
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
      <button
        type="button"
        onClick={() => applyFormatting('strong')}
        className="px-3 py-1 text-sm font-bold bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        title="Bold - Select text and click, or click to insert tags"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => applyFormatting('em')}
        className="px-3 py-1 text-sm italic bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        title="Italic - Select text and click, or click to insert tags"
      >
        <em>I</em>
      </button>
      <span className="text-xs text-gray-500 ml-2">
        Select text and click to format, or click to insert tags at cursor
      </span>
    </div>
  );
}

function WizardPageContent() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [uploadedTemplates, setUploadedTemplates] = useState<UploadedTemplate[]>([]);
  const [fontSearch, setFontSearch] = useState('');
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
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

  // Debounce slotData for preview to prevent lag
  const debouncedSlotData = useDebounce(data.slotData || {}, 300);

  useEffect(() => {
    setUploadedTemplates(loadUploadedTemplates());
    const handleTemplateUploaded = () => {
      setUploadedTemplates(loadUploadedTemplates());
    };
    window.addEventListener('template-uploaded', handleTemplateUploaded);
    return () => window.removeEventListener('template-uploaded', handleTemplateUploaded);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

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

  const getSelectedTemplate = (): TemplateConfig | null => {
    if (!data.templateId) return null;
    const systemTemplate = getTemplateConfigById(data.templateId);
    if (systemTemplate) return systemTemplate;
    const uploaded = uploadedTemplates.find(t => t.id === data.templateId);
    if (uploaded) return uploaded;
    return null;
  };

  useEffect(() => {
    const selected = getSelectedTemplate();
    if (selected) {
      const newSlotData: Record<string, string> = {};
      selected.slots.forEach(slot => {
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

  useEffect(() => {
    const funnelId = searchParams.get('id');
    if (funnelId && currentFunnelId === null) {
      const savedFunnel = getFunnelById(funnelId);
      if (savedFunnel) {
        let templateId = savedFunnel.templateId;
        const templateExists = getTemplateConfigById(templateId) || uploadedTemplates.some(t => t.id === templateId);
          if (!templateExists) {
          templateId = '';
            setErrorMessage(
            `⚠️ Template "${savedFunnel.templateId}" used in this saved funnel is no longer available. Please select a template in Step 1.`
          );
          setTimeout(() => setErrorMessage(null), 15000);
        }
        setData({
          templateId: templateId as TemplateId,
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
          slotData: templateId === savedFunnel.templateId ? savedFunnel.slotData : undefined,
        });
        setCurrentFunnelId(savedFunnel.id);
      }
    }
  }, [searchParams, currentFunnelId, uploadedTemplates]);

  const updateField = (field: keyof WizardData, value: string | string[]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const getEmptyFields = (): string[] => {
    const empty: string[] = [];
    if (currentStep === 1) {
      if (!data.templateId) empty.push('Template');
      if (!data.productName.trim()) empty.push('Product Name');
      if (!data.mainKeyword.trim()) empty.push('Main Keyword');
    } else if (currentStep === 2) {
      if (!data.ageRange) empty.push('Age Range');
      if (!data.gender) empty.push('Gender');
      if (!data.tone) empty.push('Tone of Voice');
    } else if (currentStep === 3) {
      if (!data.coreNarrative.trim()) empty.push('Core Narrative');
    }
    return empty;
  };

  const goNext = () => {
    if (currentStep < 4) {
      const emptyFields = getEmptyFields();
      if (emptyFields.length > 0) {
        setWarningFields(emptyFields);
        setShowWarningModal(true);
      } else {
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

  const handleGenerateCoreNarrative = async () => {
    if (!data.productName || !data.mainKeyword) {
      setErrorMessage('Product name and main keyword are required.');
      return;
    }
    setIsGeneratingCoreNarrative(true);
    setErrorMessage(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const response = await fetch('/api/generate-core-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setErrorMessage(errorData.error || 'Core narrative generation failed.');
        setIsGeneratingCoreNarrative(false);
        return;
      }
      const result = await response.json();
      if (result.error) {
        setErrorMessage(result.error);
        setIsGeneratingCoreNarrative(false);
        return;
      }
      updateField('coreNarrative', result.coreNarrative);
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Core narrative generation error:', error);
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        setErrorMessage('Request timed out. Please try again.');
      } else {
        setErrorMessage(`Core narrative generation failed: ${error.message || 'Unknown error'}.`);
      }
    } finally {
      setIsGeneratingCoreNarrative(false);
    }
  };

  const handleMapNarrativeToSlots = async (): Promise<boolean> => {
    if (!data.coreNarrative.trim()) {
      setErrorMessage('Core narrative is required.');
      return false;
    }
    const selected = getSelectedTemplate();
    if (!selected) {
      setErrorMessage('Template not available. Please select a template in Step 1.');
        return false;
      }
    
    // Validate that template has slots
    if (!selected.slots || selected.slots.length === 0) {
      setErrorMessage('Template has no content slots defined. Please check your template configuration.');
      return false;
    }
    
    // Filter out invalid slots and check if any remain
    const validSlots = selected.slots.filter(s => s && s.id && s.type);
    if (validSlots.length === 0) {
      setErrorMessage('Template has no valid content slots. Please ensure your template slots have valid id and type fields.');
      return false;
    }
    
    setIsMappingToSlots(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/map-narrative-to-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          templateSlots: selected.slots,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'Failed to map narrative to slots',
          details: `HTTP ${response.status}: ${response.statusText}`
        }));
        // Combine error message with details if available
        const errorMsg = errorData.error || 'Failed to map narrative to slots';
        const details = errorData.details || errorData.hint || '';
        setErrorMessage(details ? `${errorMsg}. ${details}` : errorMsg);
          return false;
        }
      const result = await response.json();
      
      // Check if we have any slots mapped (even if there are errors)
      const hasSlots = result.slots && Object.keys(result.slots).length > 0;
      const hasSlotErrors = result.slotErrors && Object.keys(result.slotErrors || {}).length > 0;
      
      // If we have slots, use them even if there are errors (partial success)
      if (hasSlots) {
          setData(prev => {
            const newSlotData = { ...prev.slotData || {} };
          Object.keys(result.slots).forEach(slotId => {
            if (result.slots[slotId]) {
              let processedContent = result.slots[slotId];
              const slot = selected.slots.find(s => s.id === slotId);
              if (slot && slot.type === 'list') {
                const lines = processedContent.split('\n');
                processedContent = lines
                  .map((line: string) => {
                    const trimmed = line.trim();
                    if (trimmed === '') return '';
                    if (!trimmed.startsWith('• ') && !trimmed.startsWith('* ') && !trimmed.startsWith('- ')) {
                      return '• ' + trimmed;
                    }
                    return trimmed;
                  })
                  .filter((line: string) => line !== '')
                  .join('\n');
              }
              newSlotData[slotId] = processedContent;
            }
          });
          return { ...prev, slotData: newSlotData };
          });
        
        // Show warnings for slot errors but don't block progression
        if (hasSlotErrors) {
          const errorCount = Object.keys(result.slotErrors).length;
          const successCount = Object.keys(result.slots).length;
          
          // Get template to find slot labels
          const selected = getSelectedTemplate();
          
          // Build detailed error message with slot names and reasons
          const failedSlots = Object.entries(result.slotErrors).map(([slotId, errorMsg]) => {
            const slot = selected?.slots.find(s => s.id === slotId);
            const slotLabel = slot?.label || slotId;
            return `• ${slotLabel}: ${errorMsg}`;
          }).join('\n');
          
          setErrorMessage(
            `⚠️ Mapped ${successCount} slot(s) successfully, but ${errorCount} slot(s) failed:\n\n${failedSlots}\n\n` +
            `You can proceed to Step 4 and fill the failed slots manually, or try regenerating them individually.`
          );
          
          // Also log to console for debugging
          console.warn('Failed slots details:', result.slotErrors);
        } else if (result.warning) {
          // Show warning from API but allow progression
          setErrorMessage(result.warning);
        } else {
          // Full success - clear any previous errors
          setErrorMessage(null);
        }
        
        // Always allow progression if we have at least some slots mapped
        return true;
      }
      
      // No slots at all - this is a real failure
      if (result.error) {
        const errorMsg = result.error;
        const details = result.details || result.hint || '';
        
        if (details && details !== 'Unknown error' && !details.includes('Unknown error occurred')) {
          setErrorMessage(`${errorMsg}. ${details}`);
        } else {
          setErrorMessage(errorMsg);
        }
        
        console.error('Map narrative to slots error:', {
          error: errorMsg,
          details,
          slotErrors: result.slotErrors,
          fullResult: result,
        });
      } else {
        setErrorMessage('No slots were mapped. Please check your template configuration and try again.');
      }
      
      return false;
    } catch (error) {
      console.error('Narrative mapping error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Failed to map narrative to slots: ${errorMsg}. Check the browser console and server logs for more details.`);
      return false;
    } finally {
      setIsMappingToSlots(false);
    }
  };

  const handleRegenerateSlot = async (slotId: string, slotType: string) => {
    if (!data.coreNarrative.trim()) {
      setErrorMessage('Core narrative is required.');
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    const selected = getSelectedTemplate();
    const maxLength = getSlotMaxLength(slotId, selected);
    try {
      const response = await fetch('/api/regenerate-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          maxLength,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setErrorMessage(errorData.error || 'Slot regeneration failed.');
        return;
      }
      const result = await response.json();
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      let processedContent = result.content;
      const slot = selected?.slots.find(s => s.id === slotId);
      if (slot && slot.type === 'list') {
        const lines = processedContent.split('\n');
        processedContent = lines
          .map((line: string) => {
            const trimmed = line.trim();
            if (trimmed === '') return '';
            if (!trimmed.startsWith('• ') && !trimmed.startsWith('* ') && !trimmed.startsWith('- ')) {
              return '• ' + trimmed;
            }
            return trimmed;
          })
          .filter((line: string) => line !== '')
          .join('\n');
      }
        setData(prev => ({
          ...prev,
          slotData: { ...prev.slotData || {}, [slotId]: processedContent }
        }));
      setErrorMessage(null);
    } catch (error) {
      console.error('Slot regeneration error:', error);
      setErrorMessage('Slot regeneration failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!data.productName || !data.mainKeyword) {
      setSaveMessage('Product name and main keyword are required.');
      return;
    }
    const suggestedName = `${data.productName || 'Supplement'} – ${data.mainKeyword || 'Keyword'}`;
    const now = new Date().toISOString();
    const id = currentFunnelId ?? `funnel-${Date.now()}`;
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
      region: data.region || undefined,
      targetStates: data.targetStates && data.targetStates.length > 0 
        ? data.targetStates 
        : (data.region ? data.region.split(',').map(s => s.trim()).filter(s => s) : undefined),
      tone: data.tone,
      font: data.font || undefined,
      coreNarrative: data.coreNarrative || undefined,
      slotData: data.slotData || undefined,
      createdAt: existingFunnel?.createdAt || now,
    };
    upsertFunnel(funnel);
    setCurrentFunnelId(id);
    setSaveMessage('Funnel saved');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleOpenPreviewInNewTab = () => {
    try {
      const selected = getSelectedTemplate();
      if (!selected) {
        alert('Template not found. Please select a template in Step 1.');
        return;
      }
      // Only uploaded templates can be previewed this way
      if (!selected.createdAt || !uploadedTemplates.find(t => t.id === selected.id)) {
        alert('Preview is only available for uploaded templates.');
        return;
      }
      const files = buildUploadedTemplateFiles(selected as UploadedTemplate, data.slotData || {});
        const htmlFile = files.find(f => f.path === 'index.html');
      if (!htmlFile) {
        alert('Failed to generate preview HTML.');
          return;
        }
      const blob = new Blob([htmlFile.contents], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        alert('Popup blocked. Please allow popups for this site.');
        URL.revokeObjectURL(url);
        return;
      }
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 10000);
    } catch (error) {
      console.error('Preview generation error:', error);
      alert('Failed to generate preview.');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const selected = getSelectedTemplate();
      const slug = data.mainKeyword
        ? data.mainKeyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : 'funnel';
      const requestBody = {
          slug,
        template: selected,
          slotData: data.slotData || {},
          exportFormat,
        };
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const selected = getSelectedTemplate();

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                      {TEMPLATES.length === 0 && uploadedTemplates.length === 0 ? (
                        <div className="border border-gray-300 rounded-md p-6 bg-gray-50">
                          <p className="text-sm text-gray-700 mb-3">
                            <strong>No templates available.</strong> Please upload a template to get started.
                          </p>
                          <Link 
                            href="/templates" 
                            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                          >
                            Go to Templates Page →
                          </Link>
                        </div>
                      ) : (
                      <select
                        value={data.templateId}
                        onChange={(e) => {
                          const newTemplateId = e.target.value as TemplateId;
                          setData(prev => ({
                            ...prev,
                            templateId: newTemplateId,
                            slotData: undefined
                          }));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                      >
                          <option value="">-- Select a template --</option>
                          {TEMPLATES.length > 0 && (
                        <optgroup label="System Templates">
                          {TEMPLATES.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </optgroup>
                          )}
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
                      )}
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Product Name <span className="text-red-500">*</span>
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
                        Main Keyword <span className="text-red-500">*</span>
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
                            setFontSearch('');
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
                                No fonts found matching &quot;{fontSearch}&quot;
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

              {currentStep === 3 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Core Content Generation
                  </h2>
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Generate a comprehensive master narrative that will serve as the source of truth for all page content.
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
                    {errorMessage && (
                      <div className="text-sm text-red-600 mt-2 whitespace-pre-line">{errorMessage}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Core Narrative
                    </label>
                      <textarea
                        value={data.coreNarrative}
                        onChange={(e) => updateField('coreNarrative', e.target.value)}
                      placeholder="The master narrative will appear here after generation."
                        rows={20}
                        maxLength={5000}
                      className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <CharacterCounter value={data.coreNarrative} maxLength={5000} />
                  </div>
                </div>
              )}

              {currentStep === 4 && (() => {
                if (!selected) {
                  return (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-6">
                        Content Placeholders
                      </h2>
                      <div className="border border-gray-300 rounded-md p-6 bg-gray-50">
                        <p className="text-sm text-gray-700 mb-3">
                          <strong>No template selected.</strong> Please go back to Step 1 and select a template.
                        </p>
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          Go to Step 1
                        </button>
                      </div>
                    </div>
                  );
                }
                
                return (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column: Input Form (1/3 on large screens, full width on small) */}
                  <div className="flex-1 lg:w-1/3">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Content Placeholders
                    </h2>
                    {selected && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                          <strong>Template:</strong> {selected.name} ({selected.slots.length} editable sections)
                      </p>
                    </div>
                  )}

                  {!data.coreNarrative && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> No core narrative found. Go back to Step 3 to generate the master narrative first.
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
                      </p>
                    </div>
                  )}
                  
                  {errorMessage && (
                    <div className="mb-6">
                      <div className="text-sm text-red-600 whitespace-pre-line">{errorMessage}</div>
                    </div>
                  )}

                    {selected && (
                  <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Template Content Sections
                      </h3>
                        {selected.slots.map((slot) => {
                        const slotValue = data.slotData?.[slot.id] || '';
                        const isFilled = slotValue.trim().length > 0;
                        const slotTypeMap: Record<string, string> = {
                          headline: 'headline',
                          subheadline: 'subheadline',
                          paragraph: 'paragraph',
                          list: 'list',
                          cta: 'cta',
                          image: 'paragraph',
                          // Legacy types for backward compatibility
                          text: 'paragraph',
                          'rich-text': 'paragraph',
                          url: 'cta',
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
                            {slot.type === 'image' ? (
                              <ImageSlotUpload
                                slotId={slot.id}
                                slotLabel={slot.label}
                                value={slotValue}
                                onChange={(newValue) => {
                                  setData(prev => ({
                                    ...prev,
                                    slotData: { ...prev.slotData || {}, [slot.id]: newValue }
                                  }));
                                }}
                                placeholderImage={
                                    selected
                                      ? extractImageMetadata(selected.htmlBody, slot.id)?.src
                                    : undefined
                                }
                                dimensions={
                                    selected
                                      ? extractImageMetadata(selected.htmlBody, slot.id) || undefined
                                    : undefined
                                }
                                productName={data.productName}
                                mainKeyword={data.mainKeyword}
                              />
                            ) : slot.type === 'list' ? (
                              <div className="relative">
                                <textarea
                                  value={slotValue}
                                  onChange={(e) => {
                                    setData(prev => ({
                                      ...prev,
                                      slotData: { ...prev.slotData || {}, [slot.id]: e.target.value }
                                    }));
                                  }}
                                  placeholder={`Enter ${slot.label.toLowerCase()} (one per line)`}
                                    rows={6}
                                    maxLength={getSlotMaxLength(slot.id, selected)}
                                  className={`w-full px-4 py-2 pb-8 text-base border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    isFilled ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                  }`}
                                  style={{ fontSize: '22px', lineHeight: '1.6' }}
                                />
                                <CharacterCounter 
                                  value={slotValue} 
                                    maxLength={getSlotMaxLength(slot.id, selected)} 
                                />
                              </div>
                            ) : (
                              <div className="relative">
                                <FormattingToolbar
                                  textareaId={`textarea-${slot.id}`}
                                  value={slotValue}
                                  onChange={(newValue) => {
                                    setData(prev => ({
                                      ...prev,
                                      slotData: { ...prev.slotData || {}, [slot.id]: newValue }
                                    }));
                                  }}
                                />
                                <textarea
                                  id={`textarea-${slot.id}`}
                                  value={slotValue}
                                  onChange={(e) => {
                                    setData(prev => ({
                                      ...prev,
                                      slotData: { ...prev.slotData || {}, [slot.id]: e.target.value }
                                    }));
                                  }}
                                  placeholder={`Enter ${slot.label.toLowerCase()}. Use <strong>text</strong> for bold and <em>text</em> for italic.`}
                                  rows={4}
                                    maxLength={getSlotMaxLength(slot.id, selected)}
                                  className={`w-full px-4 py-2 pb-8 text-base border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    isFilled ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                  }`}
                                  style={{ fontSize: '22px', lineHeight: '1.6' }}
                                />
                                <CharacterCounter 
                                  value={slotValue} 
                                    maxLength={getSlotMaxLength(slot.id, selected)} 
                                />
                              </div>
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

                  {/* Right Column: Live Preview (2/3 on large screens, full width on small) */}
                  {selected && (
                    <div className="flex-1 lg:w-2/3 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Live Preview
                        </h3>
                        <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
                          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
                            <UploadedTemplateRenderer
                              template={selected}
                              slotData={debouncedSlotData}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })()}

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
                      const success = await handleMapNarrativeToSlots();
                      if (success) {
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

          <div className="lg:w-96">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Live Summary
              </h3>
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-3">
                  Template & Basics
                </h4>
                <div className="space-y-2 text-base">
                  <div>
                    <span className="text-gray-600">Template:</span>{' '}
                    <span className="text-gray-900">
                      {(() => {
                        const template = getTemplateConfigById(data.templateId) || uploadedTemplates.find(t => t.id === data.templateId);
                        return template?.name || 'Not selected';
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Product:</span>{' '}
                    <span className="text-gray-900">
                      {data.productName || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Keyword:</span>{' '}
                    <span className="text-gray-900">
                      {data.mainKeyword || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  </div>
                </div>
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
              {data.coreNarrative && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-700 mb-3">
                    Core Narrative
                  </h4>
                  <p className="text-sm text-gray-600 line-clamp-4">
                    {data.coreNarrative}
                  </p>
                </div>
              )}
              {currentStep === 4 && selected && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-700 mb-3">
                    Content Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Filled Slots:</span>
                      <span className="text-gray-900 font-medium">
                        {Object.keys(data.slotData || {}).filter(key => data.slotData?.[key]?.trim()).length} / {selected.slots.length}
                    </span>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
            {currentStep === 4 && (
            <div className="mb-6">
              <ValidationPanel
                content={data}
                context={{
                  productName: data.productName,
                  mainKeyword: data.mainKeyword,
                  tone: data.tone,
                }}
                templateId={data.templateId}
              />
            </div>
            )}
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
                <option value="wordpress">WordPress Template</option>
              </select>
            </div>
            {saveMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      )}

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

export default function WizardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <WizardPageContent />
    </Suspense>
  );
}