'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../core/button';
import { Select } from '../forms/select';
import { Switch } from '../forms/switch';
import { 
  SwatchIcon, 
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
// import Image from 'next/image'; // Removed - using regular img tag instead

// Import preview components
import {
  HoeClassicPreview,
  HoeClassicTypeBPreview,
  HoeClassicTypeCPreview
} from './templates';

type BuilderNodeType = 'container' | 'text' | 'logo' | 'company' | 'customer' | 'items' | 'totals' | 'notes' | 'terms' | 'divider' | 'spacer' | 'brandLogos';

interface BuilderStyle {
  bgColor?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  padding?: number;
  border?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'semibold';
  gap?: number;
  columns?: number;
  direction?: 'row' | 'column';
  margin?: number;
}

interface BuilderNode {
  id: string;
  type: BuilderNodeType;
  children?: BuilderNode[];
  style?: BuilderStyle;
  props?: Record<string, unknown>;
}

interface TemplateSchema {
  nodes: BuilderNode[];
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  layout: {
    headerStyle: 'minimal' | 'classic' | 'modern' | 'premium';
    showLogo: boolean;
    showBorder: boolean;
    itemTableStyle: 'simple' | 'detailed' | 'modern';
    footerStyle: 'minimal' | 'detailed';
  };
  fonts: {
    primary: string;
    secondary: string;
    size: 'small' | 'medium' | 'large';
  };
  customSchema?: TemplateSchema;
}

// --- Types for mock data and canvas rendering --- //
interface CanvasInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface CanvasInvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  company: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    logo?: string;
  };
  customer: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  items: CanvasInvoiceItem[];
  notes: string;
  terms: string;
  taxRate: number;
  discount: number;
}


import { allTemplates, visibleTemplates } from './templates';

// Only show hoe-classic in UI (pro-corporate is hidden but still available in code)
const defaultTemplates: InvoiceTemplate[] = visibleTemplates;

// Use provided templates or fall back to defaults (filtered to only visible templates)
const getTemplates = (templates?: InvoiceTemplate[]): InvoiceTemplate[] => {
  const providedTemplates = templates && templates.length > 0 ? templates : defaultTemplates;
  // Filter to only show hoe-classic in UI (hide pro-corporate)
  return providedTemplates.filter(t => t.id === 'hoe-classic' || t.id === 'hoe-classic-type-b' || t.id === 'hoe-classic-type-c');
};

// Preview component mapping
const previewComponents = {
  'hoe-classic': HoeClassicPreview,
  'hoe-classic-type-b': HoeClassicTypeBPreview,
  'hoe-classic-type-c': HoeClassicTypeCPreview
};

const getPreviewComponent = (templateId: string) => {
  return previewComponents[templateId as keyof typeof previewComponents] || HoeClassicPreview;
};

interface InvoiceTemplatesProps {
  selectedTemplate?: string | undefined;
  templates?: InvoiceTemplate[];
  onTemplateSelect?: (templateId: string) => void;
  onCustomize?: (template: InvoiceTemplate) => void;
  onTemplateUpdate?: (template: InvoiceTemplate) => void;
  currentInvoiceData?: unknown;
  className?: string;
}

export function InvoiceTemplates({
  selectedTemplate,
  templates,
  onTemplateSelect,
  onCustomize,
  onTemplateUpdate,
  className = ""
}: InvoiceTemplatesProps) {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [customSchema, setCustomSchema] = useState<TemplateSchema>({ nodes: [] });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pageStyles, setPageStyles] = useState({ backgroundColor: '#ffffff', padding: 40 });
  const [customTemplate, setCustomTemplate] = useState<InvoiceTemplate>(getTemplates(templates)[0]);
  const [cardZoom, setCardZoom] = useState<number>(15); // Zoom level for template cards (15 = 0.15 scale)

  // Mock data for live preview
  const mockInvoiceData: CanvasInvoiceData = {
    invoiceNumber: 'INV-2024-001',
    date: '2024-01-15',
    dueDate: '2024-02-15',
    company: {
      name: 'Your Company',
      address: '123 Business St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      phone: '+1 (555) 123-4567',
      email: 'info@yourcompany.com',
      logo: 'https://via.placeholder.com/150'
    },
    customer: {
      name: 'Client Name Inc.',
      address: '456 Client Ave',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90210',
    },
    items: [],
    notes: 'Thank you for your business!',
    terms: 'Payment due within 30 days.',
    taxRate: 0,
    discount: 0
  };

  const handleTemplateSelect = (templateId: string) => {
    onTemplateSelect?.(templateId);
    const selectedTemplateData = getTemplates(templates).find(t => t.id === templateId) || getTemplates(templates)[0];
    setCustomTemplate(selectedTemplateData);
    // Trigger live preview update
    if (onTemplateUpdate) {
      onTemplateUpdate(selectedTemplateData);
    }
  };

  const handleCustomize = () => {
    setShowCustomizer(true);
  };

  const openBuilder = () => {
    const newTemplate: InvoiceTemplate = {
      id: `custom-${Date.now()}`,
      name: 'Untitled Custom Template',
      description: 'A new design created from scratch',
      preview: '',
      colors: { primary: '#0f172a', secondary: '#475569', accent: '#0ea5e9', background: '#ffffff', text: '#0f172a' },
      fonts: { primary: 'Inter', secondary: 'Inter', size: 'medium' },
      layout: { headerStyle: 'modern', showLogo: true, showBorder: false, itemTableStyle: 'modern', footerStyle: 'minimal' },
      customSchema: { nodes: [] }
    };
    setCustomTemplate(newTemplate);
    setCustomSchema({ nodes: [] });
    setIsBuilderOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && over.id === 'canvas') {
      const newNode: BuilderNode = {
        id: `${active.id}-${Date.now()}`,
        type: active.id as BuilderNodeType,
        children: [],
        style: {}
      };
      setCustomSchema(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    }
  };

  const selectedNode = customSchema.nodes.find(node => node.id === selectedNodeId) || null;

  const handleSaveCustomization = () => {
    onCustomize?.(customTemplate);
    if (onTemplateUpdate) {
      onTemplateUpdate(customTemplate);
    }
    setShowCustomizer(false);
  };

  const handleCancelCustomization = () => {
    setShowCustomizer(false);
  };

  const updateColors = (colorField: string, value: string) => {
    setCustomTemplate(prev => {
      const updated = {
        ...prev,
        colors: {
          ...prev.colors,
          [colorField]: value
        }
      };
      // Trigger live preview update
      if (onTemplateUpdate) {
        onTemplateUpdate(updated);
      }
      return updated;
    });
  };

  const updateLayout = (field: string, value: string | boolean) => {
    setCustomTemplate(prev => {
      const updated = {
        ...prev,
        layout: {
          ...prev.layout,
          [field]: value
        }
      };
      // Trigger live preview update
      if (onTemplateUpdate) {
        onTemplateUpdate(updated);
      }
      return updated;
    });
  };

  const updateFonts = (field: string, value: string) => {
    setCustomTemplate(prev => {
      const updated = {
        ...prev,
        fonts: {
          ...prev.fonts,
          [field]: value
        }
      };
      // Trigger live preview update
      if (onTemplateUpdate) {
        onTemplateUpdate(updated);
      }
      return updated;
    });
  };

  const handlePageStyleChange = (prop: keyof typeof pageStyles, value: string | number) => {
    setPageStyles(prev => ({ ...prev, [prop]: value }));
  };

  const updateNodeStyle = (nodeId: string, styleUpdate: Partial<BuilderStyle>) => {
    setCustomSchema(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, style: { ...n.style, ...styleUpdate } } : n)
    }));
  };

  const updateNodeProps = (nodeId: string, propsUpdate: Record<string, unknown>) => {
    setCustomSchema(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, props: { ...(n.props || {}), ...propsUpdate } } : n)
    }));
  };

  const deleteNode = (nodeId: string) => {
    setCustomSchema(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId)
    }));
    setSelectedNodeId(null);
  };

  const moveNodeUp = (nodeId: string) => {
    setCustomSchema(prev => {
      const index = prev.nodes.findIndex(n => n.id === nodeId);
      if (index > 0) {
        const newNodes = [...prev.nodes];
        [newNodes[index - 1], newNodes[index]] = [newNodes[index], newNodes[index - 1]];
        return { ...prev, nodes: newNodes };
      }
      return prev;
    });
  };

  const moveNodeDown = (nodeId: string) => {
    setCustomSchema(prev => {
      const index = prev.nodes.findIndex(n => n.id === nodeId);
      if (index < prev.nodes.length - 1) {
        const newNodes = [...prev.nodes];
        [newNodes[index], newNodes[index + 1]] = [newNodes[index + 1], newNodes[index]];
        return { ...prev, nodes: newNodes };
      }
      return prev;
    });
  };

  const saveCustomTemplate = () => {
    const savedTemplate = {
      ...customTemplate,
      customSchema,
      id: `custom-${Date.now()}`,
      name: customTemplate.name || 'Custom Template'
    };
    
    // Store in localStorage for now (in production, save to database)
    const existingTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
    localStorage.setItem('customTemplates', JSON.stringify([...existingTemplates, savedTemplate]));
    
    onCustomize?.(savedTemplate);
    setIsBuilderOpen(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-4">
        {getTemplates(templates).map((template) => (
          <div
            key={template.id}
            className={cn(
              "group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
              selectedTemplate === template.id
                ? "shadow-md"
                : "hover:shadow-sm"
            )}
            style={{
              backgroundColor: 'var(--card)',
              border: selectedTemplate === template.id 
                ? `2px solid var(--accent)` 
                : `1px solid var(--border)`
            }}
            onClick={() => handleTemplateSelect(template.id)}
          >
            {/* Preview Image - Clean with visible template */}
            <div 
              className="relative border-b overflow-hidden" 
              style={{ 
                height: '220px',
                borderColor: 'var(--border)',
                backgroundColor: 'var(--muted)'
              }}
            >
              {/* House Of Electronics Logo - Centered and Large */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <img 
                  src="/images/hoe logo.png" 
                  alt="House Of Electronics Logo" 
                  className="h-24 w-24 object-contain opacity-80"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = '1';
                      target.src = '/images/hoe%20logo.png';
                    } else if (!target.dataset.fallback2) {
                      target.dataset.fallback2 = '1';
                      target.src = '/images/hoe logo.png';
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                />
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center p-3">
                {(() => {
                  const PreviewComponent = getPreviewComponent(template.id);
                  const scale = cardZoom / 100;
                  return (
                    <div className="transform origin-top" style={{ transform: `scale(${scale})`, marginTop: '-10px' }}>
                      <div style={{ width: '210mm', height: '297mm' }}>
                        <PreviewComponent />
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              {/* Selection Indicator */}
              {selectedTemplate === template.id && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md z-20"
                     style={{ backgroundColor: 'var(--accent)' }}>
                  <CheckIcon className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Card Content - Enhanced */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    {template.name}
                  </h4>
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                    {template.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTemplateSelect(template.id);
                }}
                variant={selectedTemplate === template.id ? "default" : "outline"}
                size="sm"
                className="w-full mt-3"
              >
                {selectedTemplate === template.id ? (
                  <>
                    <CheckIcon className="h-4 w-4 mr-1.5" />
                    Selected
                  </>
                ) : (
                  'Select Template'
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Customize Actions */}
      {selectedTemplate && (
        <div className="flex flex-col gap-3 p-4 rounded-lg border"
             style={{ 
               backgroundColor: 'var(--muted)',
               borderColor: 'var(--border)'
             }}>
          <div className="flex items-center gap-2">
            <CheckIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              {getTemplates(templates).find(t => t.id === selectedTemplate)?.name} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCustomize}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 flex-1"
            >
              <SwatchIcon className="h-4 w-4" />
              <span>Customize</span>
            </Button>
            <Button
              onClick={() => {
                onCustomize?.(getTemplates(templates).find(t => t.id === selectedTemplate) || getTemplates(templates)[0]);
              }}
              variant="default"
              size="sm"
              className="flex-1"
            >
              Use Template
            </Button>
          </div>
        </div>
      )}

      {/* Template Customizer Modal */}
      {showCustomizer && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center p-4 z-50">
          <div 
            className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                Customize Template
              </h2>
              <Button
                variant="ghost"
                onClick={handleCancelCustomization}
                className="p-2"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-8">
              {/* Colors Section */}
              <div>
                <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                  Brand Colors
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Primary Color
                    </label>
                    <div className="space-y-2">
                      <input
                        type="color"
                        value={customTemplate.colors.primary}
                        onChange={(e) => updateColors('primary', e.target.value)}
                        className="w-full h-12 border rounded-lg cursor-pointer"
                      />
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        Headers, titles, main elements
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Secondary Color
                    </label>
                    <div className="space-y-2">
                      <input
                        type="color"
                        value={customTemplate.colors.secondary}
                        onChange={(e) => updateColors('secondary', e.target.value)}
                        className="w-full h-12 border rounded-lg cursor-pointer"
                      />
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        Subtitles, borders, supporting text
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Accent Color
                    </label>
                    <div className="space-y-2">
                      <input
                        type="color"
                        value={customTemplate.colors.accent}
                        onChange={(e) => updateColors('accent', e.target.value)}
                        className="w-full h-12 border rounded-lg cursor-pointer"
                      />
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        Totals, highlights, call-to-actions
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Background
                    </label>
                    <div className="space-y-2">
                      <input
                        type="color"
                        value={customTemplate.colors.background}
                        onChange={(e) => updateColors('background', e.target.value)}
                        className="w-full h-12 border rounded-lg cursor-pointer"
                      />
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        Document background color
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout Section */}
              <div>
                <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                  Layout & Structure
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Header Style
                    </label>
                    <Select
                      value={customTemplate.layout.headerStyle}
                      onChange={(e) => updateLayout('headerStyle', e.target.value)}
                      options={[
                        { value: 'minimal', label: 'Minimal - Clean and simple' },
                        { value: 'classic', label: 'Classic - Traditional business' },
                        { value: 'modern', label: 'Modern - Contemporary design' }
                      ]}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      Controls header layout and styling
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Item Table Style
                    </label>
                    <Select
                      value={customTemplate.layout.itemTableStyle}
                      onChange={(e) => updateLayout('itemTableStyle', e.target.value)}
                      options={[
                        { value: 'simple', label: 'Simple - Basic table' },
                        { value: 'detailed', label: 'Detailed - Full borders' },
                        { value: 'modern', label: 'Modern - Rounded corners' }
                      ]}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      Controls invoice items table design
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <h4 className="text-md font-medium" style={{ color: 'var(--foreground)' }}>
                    Display Options
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                      <Switch
                        checked={customTemplate.layout.showLogo}
                        onChange={(e) => updateLayout('showLogo', e.target.checked)}
                      />
                      <div>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          Show Company Logo
                        </span>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Display logo in header area
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                      <Switch
                        checked={customTemplate.layout.showBorder}
                        onChange={(e) => updateLayout('showBorder', e.target.checked)}
                      />
                      <div>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          Show Borders
                        </span>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Add decorative borders
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography Section */}
              <div>
                <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                  Typography
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Font Size
                    </label>
                    <Select
                      value={customTemplate.fonts.size}
                      onChange={(e) => updateFonts('size', e.target.value)}
                      options={[
                        { value: 'small', label: 'Small (12px) - Compact' },
                        { value: 'medium', label: 'Medium (14px) - Standard' },
                        { value: 'large', label: 'Large (16px) - Readable' }
                      ]}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      Overall document font size
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      Font Family
                    </label>
                    <Select
                      value={customTemplate.fonts.primary}
                      onChange={(e) => updateFonts('primary', e.target.value)}
                      options={[
                        { value: 'Inter', label: 'Inter - Modern & Clean' },
                        { value: 'Helvetica', label: 'Helvetica - Classic' },
                        { value: 'Georgia', label: 'Georgia - Serif' },
                        { value: 'Monaco', label: 'Monaco - Monospace' }
                      ]}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      Primary font family for text
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div>
                <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                  Preview
                </h3>
                <div 
                  className="p-6 border rounded-lg"
                  style={{ 
                    backgroundColor: customTemplate.colors.background,
                    borderColor: customTemplate.colors.primary 
                  }}
                >
                  <div className="space-y-4">
                    {/* Header Preview */}
                    <div className="text-center">
                      <h1 
                        className="text-2xl font-bold"
                        style={{ color: customTemplate.colors.primary }}
                      >
                        INVOICE
                      </h1>
                      <p 
                        className="text-sm"
                        style={{ color: customTemplate.colors.secondary }}
                      >
                        #INV-2024-001
                      </p>
                    </div>

                    {/* Sample Content */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p style={{ color: customTemplate.colors.text }}>
                          <strong>From:</strong> Your Company
                        </p>
                      </div>
                      <div>
                        <p style={{ color: customTemplate.colors.text }}>
                          <strong>To:</strong> Customer Name
                        </p>
                      </div>
                    </div>

                    {/* Table Preview */}
                    <div className="border rounded" style={{ borderColor: customTemplate.colors.primary }}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr 
                            className="text-left"
                            style={{ backgroundColor: customTemplate.colors.primary, color: 'white' }}
                          >
                            <th className="p-2">Item</th>
                            <th className="p-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2" style={{ color: customTemplate.colors.text }}>
                              Sample Item
                            </td>
                            <td className="p-2" style={{ color: customTemplate.colors.accent }}>
                              $100.00
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--border)' }}>
              <Button
                variant="outline"
                onClick={handleCancelCustomization}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCustomization}
                className="flex items-center gap-2"
              >
                <CheckIcon className="h-4 w-4" />
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div 
            className="rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col"
            style={{ backgroundColor: 'var(--card)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Template Builder</h2>
                <input
                  type="text"
                  value={customTemplate.name}
                  onChange={(e) => setCustomTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="px-2 py-1 text-sm border rounded"
                  style={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                  placeholder="Template name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>Cancel</Button>
                <Button variant="outline" onClick={() => exportCustomTemplate(customTemplate, customSchema)}>Export</Button>
                <label className="inline-flex items-center gap-2">
                  <input type="file" accept="application/json" className="hidden" onChange={(e) => importCustomTemplate(e, setCustomTemplate, setCustomSchema)} />
                  <span>
                    <Button variant="outline">Import</Button>
                  </span>
                </label>
                <Button onClick={saveCustomTemplate}>Save Template</Button>
              </div>
            </div>
            {/* Builder Body */}
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
              <DndContext onDragEnd={handleDragEnd}>
                {/* Left: Components Palette */}
                <div 
                  className="col-span-2 border-r p-3 overflow-y-auto"
                  style={{ 
                    backgroundColor: 'var(--muted)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <div className="font-medium text-sm mb-2" style={{ color: 'var(--foreground)' }}>Components</div>
                  <div className="space-y-2">
                    <Draggable id="container">Container</Draggable>
                    <Draggable id="text">Text</Draggable>
                    <Draggable id="logo">Logo</Draggable>
                    <Draggable id="company">Company Info</Draggable>
                    <Draggable id="customer">Customer Info</Draggable>
                    <Draggable id="items">Items Table</Draggable>
                    <Draggable id="totals">Totals</Draggable>
                    <Draggable id="divider">Divider</Draggable>
                    <Draggable id="spacer">Spacer</Draggable>
                  </div>
                </div>
                {/* Center: Canvas */}
                <div 
                  className="col-span-7 p-4 overflow-auto"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <Droppable id="canvas">
                    <div 
                      className="mx-auto bg-white shadow-lg" 
                      style={{ 
                        width: '210mm', 
                        minHeight: '297mm',
                        backgroundColor: pageStyles.backgroundColor,
                        padding: `${pageStyles.padding}px`
                      }}
                      onClick={() => setSelectedNodeId(null)}
                    >
                      <CanvasContent 
                        schema={customSchema} 
                        data={mockInvoiceData} 
                        template={customTemplate} 
                        brandLogos={[]}
                        selectedNodeId={selectedNodeId}
                        setSelectedNodeId={setSelectedNodeId}
                        onDelete={deleteNode}
                        onMoveUp={moveNodeUp}
                        onMoveDown={moveNodeDown}
                      />
                    </div>
                  </Droppable>
                </div>
                {/* Right: Properties Inspector */}
                <div 
                  className="col-span-3 border-l p-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="font-medium text-sm mb-2" style={{ color: 'var(--foreground)' }}>Properties</div>
                  <PropertiesInspector 
                    selectedNode={selectedNode}
                    onStyleChange={updateNodeStyle}
                    onPropsChange={updateNodeProps}
                    onPageStyleChange={handlePageStyleChange}
                    pageStyles={pageStyles}
                  />
                </div>
              </DndContext>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Draggable({ id, children }: { id: string, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        backgroundColor: 'var(--background)',
        borderColor: 'var(--border)',
        color: 'var(--foreground)'
      }} 
      {...listeners} 
      {...attributes} 
      className="p-2 border rounded text-xs cursor-grab"
    >
      {children}
    </div>
  );
}

function Droppable({ id, children }: { id: string, children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={isOver ? 'bg-blue-100/50' : ''}>
      {children}
    </div>
  );
}

function CanvasContent({ schema, data, template, selectedNodeId, setSelectedNodeId, onDelete, onMoveUp, onMoveDown }: { schema: TemplateSchema, data: CanvasInvoiceData, template: InvoiceTemplate, brandLogos?: string[], selectedNodeId: string | null, setSelectedNodeId: (id: string | null) => void, onDelete: (id: string) => void, onMoveUp: (id: string) => void, onMoveDown: (id: string) => void }) {
  const subtotal = data.items.reduce((sum: number, i: CanvasInvoiceItem) => sum + i.amount, 0);
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax - data.discount;

  const renderNode = (node: BuilderNode): React.ReactNode => {
    const style: React.CSSProperties = {
      backgroundColor: node.style?.bgColor,
      color: node.style?.textColor,
      textAlign: node.style?.align,
      padding: node.style?.padding,
      border: node.style?.border,
      fontSize: node.style?.fontSize,
      fontWeight: node.style?.fontWeight,
      display: node.type === 'container' ? 'flex' : undefined,
      flexDirection: node.style?.direction,
      gap: node.style?.gap,
    };

    const content = (() => {
      switch (node.type) {
        case 'container':
          return node.children?.map(child => renderNode(child));
        case 'text':
          return (node.props?.content as string) || 'Text Component';
        case 'logo':
          return template.layout.showLogo && data.company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.company.logo} alt="Logo" width={150} height={48} />
          ) : <div className="p-2 bg-gray-200 text-xs">Logo</div>;
        case 'company':
          return (
            <div>
              <div className="font-bold" style={{ color: template.colors.primary }}>{data.company.name}</div>
              <div>{data.company.address}</div>
              <div>{data.company.city}, {data.company.state} {data.company.zip}</div>
              <div>{data.company.phone} • {data.company.email}</div>
            </div>
          );
        case 'customer':
          return (
            <div>
              <div className="font-bold" style={{ color: template.colors.primary }}>Bill To</div>
              <div>{data.customer.name}</div>
              <div>{data.customer.address}</div>
              <div>{data.customer.city}, {data.customer.state} {data.customer.zip}</div>
            </div>
          );
        case 'items':
          return (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ backgroundColor: template.colors.primary, color: '#fff' }}>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Rate</th>
                  <th className="text-right p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: CanvasInvoiceItem, i: number) => (
                  <tr key={item.id} style={{ backgroundColor: i % 2 ? '#00000005' : 'transparent' }}>
                    <td className="p-2" style={{ borderBottom: `1px solid ${template.colors.secondary}30` }}>{item.description}</td>
                    <td className="p-2 text-right" style={{ borderBottom: `1px solid ${template.colors.secondary}30` }}>{item.quantity}</td>
                    <td className="p-2 text-right" style={{ borderBottom: `1px solid ${template.colors.secondary}30` }}>${item.rate.toFixed(2)}</td>
                    <td className="p-2 text-right" style={{ borderBottom: `1px solid ${template.colors.secondary}30` }}>${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        case 'totals':
          return (
            <div style={{ maxWidth: 360, marginLeft: 'auto' }}>
              <div className="flex justify-between py-1"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              {data.taxRate > 0 && <div className="flex justify-between py-1"><span>Tax ({data.taxRate}%)</span><span>${tax.toFixed(2)}</span></div>}
              {data.discount > 0 && <div className="flex justify-between py-1"><span>Discount</span><span>- ${data.discount.toFixed(2)}</span></div>}
              <div className="flex justify-between items-center mt-2 pt-2 border-t-2" style={{ borderColor: template.colors.primary }}>
                <div className="text-lg font-bold" style={{ color: template.colors.accent }}>Total</div>
                <div className="text-2xl font-extrabold">${total.toFixed(2)}</div>
              </div>
            </div>
          );
        case 'notes':
          return data.notes ? (
            <div>
              <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Notes</div>
              <div className="text-sm">{data.notes}</div>
            </div>
          ) : null;
        case 'terms':
          return data.terms ? (
            <div>
              <div className="font-semibold mb-1" style={{ color: template.colors.primary }}>Terms</div>
              <div className="text-sm">{data.terms}</div>
            </div>
          ) : null;
        case 'divider':
          return <hr style={{ borderColor: template.colors.secondary }} />;
        case 'spacer':
          return <div style={{ height: node.props?.height as number || 16 }} />;
        default:
          return <div className="p-2 bg-gray-100 text-xs">{node.type}</div>;
      }
    })();

    return (
      <div 
        key={node.id} 
        onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }} 
        className={`relative border-2 ${selectedNodeId === node.id ? 'border-blue-500' : 'border-transparent'} hover:border-blue-300 transition-colors`}
        style={style}
      >
        {content}
        {selectedNodeId === node.id && (
          <div className="absolute top-0 right-0 flex gap-1 p-1 bg-blue-500 rounded-bl">
            <button 
              onClick={(e) => { e.stopPropagation(); onMoveUp(node.id); }} 
              className="text-white hover:bg-blue-600 p-1 rounded"
              title="Move Up"
            >
              <ArrowUpIcon className="h-3 w-3" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMoveDown(node.id); }} 
              className="text-white hover:bg-blue-600 p-1 rounded"
              title="Move Down"
            >
              <ArrowDownIcon className="h-3 w-3" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} 
              className="text-white hover:bg-red-600 p-1 rounded"
              title="Delete"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };
  
  return <>{schema.nodes.map((node) => renderNode(node))}</>;
}

function exportCustomTemplate(template: InvoiceTemplate, schema: TemplateSchema) {
  const data = { ...template, customSchema: schema };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.name || 'custom-template'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importCustomTemplate(e: React.ChangeEvent<HTMLInputElement>, setTemplate?: (t: InvoiceTemplate) => void, setSchema?: (s: TemplateSchema) => void) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(String(ev.target?.result || '{}')) as InvoiceTemplate;
      if (parsed && typeof parsed === 'object' && parsed.customSchema && setTemplate && setSchema) {
        setTemplate(parsed);
        setSchema(parsed.customSchema as TemplateSchema);
      }
    } catch {}
  };
  reader.readAsText(file);
}

function PropertiesInspector({ selectedNode, onStyleChange, onPropsChange, onPageStyleChange, pageStyles }: { selectedNode: BuilderNode | null, onStyleChange: (id: string, style: Partial<BuilderStyle>) => void, onPropsChange: (id: string, props: Record<string, unknown>) => void, onPageStyleChange: (prop: keyof typeof pageStyles, value: string | number) => void, pageStyles: { backgroundColor: string, padding: number }}) {
  if (!selectedNode) {
    return (
      <div>
        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Page Styles</h4>
        <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Background Color</label>
        <input 
          type="color" 
          value={pageStyles.backgroundColor} 
          onChange={(e) => onPageStyleChange('backgroundColor', e.target.value)}
          className="w-full h-8 p-1 border rounded"
          style={{
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)'
          }}
        />
        <label className="block text-xs mb-1 mt-2" style={{ color: 'var(--foreground)' }}>Padding (px)</label>
        <input 
          type="number" 
          value={pageStyles.padding}
          onChange={(e) => onPageStyleChange('padding', parseInt(e.target.value))}
          className="w-full p-1 border rounded"
          style={{
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)'
          }}
        />
      </div>
    );
  }

  const handleStyleChange = (prop: keyof BuilderStyle, value: string | number) => {
    onStyleChange(selectedNode.id, { [prop]: value });
  };

  return (
    <div>
      <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Component: {selectedNode.type}</h4>
      {selectedNode.type === 'text' && (
        <div className="mb-3">
          <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Text Content</label>
          <textarea
            className="w-full p-2 border rounded text-xs"
            style={{
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
            rows={3}
            value={String((selectedNode.props?.content as string) || '')}
            onChange={(e) => onPropsChange(selectedNode.id, { content: e.target.value })}
          />
        </div>
      )}
      <div className="space-y-2">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Background Color</label>
          <input 
            type="color" 
            value={selectedNode.style?.bgColor || '#ffffff'} 
            onChange={e => handleStyleChange('bgColor', e.target.value)} 
            className="w-full h-8 p-1 border rounded"
            style={{
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)'
            }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Text Color</label>
          <input 
            type="color" 
            value={selectedNode.style?.textColor || '#000000'} 
            onChange={e => handleStyleChange('textColor', e.target.value)} 
            className="w-full h-8 p-1 border rounded"
            style={{
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)'
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Padding (px)</label>
            <input 
              type="number" 
              value={selectedNode.style?.padding || 0} 
              onChange={e => handleStyleChange('padding', parseInt(e.target.value))} 
              className="w-full p-1 border rounded"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Margin (px)</label>
            <input 
              type="number" 
              value={selectedNode.style?.margin || 0} 
              onChange={e => handleStyleChange('margin', parseInt(e.target.value))} 
              className="w-full p-1 border rounded"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Font Size (px)</label>
            <input 
              type="number" 
              value={selectedNode.style?.fontSize || 14} 
              onChange={e => handleStyleChange('fontSize', parseInt(e.target.value))} 
              className="w-full p-1 border rounded"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Font Weight</label>
            <select 
              value={selectedNode.style?.fontWeight || 'normal'} 
              onChange={e => handleStyleChange('fontWeight', e.target.value)} 
              className="w-full p-1 border rounded"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="normal">Normal</option>
              <option value="semibold">Semibold</option>
              <option value="bold">Bold</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Align</label>
            <select 
              value={selectedNode.style?.align || 'left'} 
              onChange={e => handleStyleChange('align', e.target.value)} 
              className="w-full p-1 border rounded"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Direction</label>
            <select 
              value={selectedNode.style?.direction || 'row'} 
              onChange={e => handleStyleChange('direction', e.target.value)} 
              className="w-full p-1 border rounded"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="row">Row</option>
              <option value="column">Column</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Gap (px)</label>
            <input 
              type="number" 
              value={selectedNode.style?.gap || 0} 
              onChange={e => handleStyleChange('gap', parseInt(e.target.value))} 
              className="w-full p-1 border rounded"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--foreground)' }}>Border (CSS)</label>
            <input 
              type="text" 
              value={selectedNode.style?.border || ''} 
              onChange={e => handleStyleChange('border', e.target.value)} 
              placeholder="e.g., 1px solid #e5e7eb" 
              className="w-full p-1 border rounded text-xs"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
