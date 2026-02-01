import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

export const minimalOutlineTemplate: InvoiceTemplate = {
  id: 'minimal-outline',
  name: 'Minimal Outline',
  description: 'Sparse lines, airy spacing, and excellent readability',
  preview: 'minimal-outline-preview',
  colors: {
    primary: '#111827',
    secondary: '#6b7280',
    accent: '#14b8a6',
    background: '#ffffff',
    text: '#111827'
  },
  layout: {
    headerStyle: 'minimal',
    showLogo: true,
    showBorder: true,
    itemTableStyle: 'simple',
    footerStyle: 'minimal'
  },
  fonts: {
    primary: 'Inter',
    secondary: 'Inter',
    size: 'medium'
  }
};

export const MinimalOutlinePreview = () => (
  <div className="w-full h-32 bg-white rounded-lg relative overflow-hidden border border-gray-300">
    <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 border border-gray-400" />
        <div className="text-xs font-semibold text-slate-900">COMPANY</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-bold text-slate-900">INVOICE</div>
        <div className="text-[7px] text-slate-500">#2024-001</div>
      </div>
    </div>
    <div className="absolute bottom-2 left-2 right-2 grid grid-cols-2 gap-2">
      <div className="border border-gray-300 p-1">
        <div className="text-[6px] text-gray-500 uppercase">Bill To</div>
        <div className="text-[7px] text-gray-800">Client Name</div>
      </div>
      <div className="border border-gray-300 p-1 text-right">
        <div className="text-[6px] text-gray-500 uppercase">Total</div>
        <div className="text-sm font-semibold text-emerald-600">$1,200.00</div>
      </div>
    </div>
  </div>
);


