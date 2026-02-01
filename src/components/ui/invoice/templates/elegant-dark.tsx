import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

export const elegantDarkTemplate: InvoiceTemplate = {
  id: 'elegant-dark',
  name: 'Elegant Dark',
  description: 'Premium dark header with gold accents and clear totals',
  preview: 'elegant-dark-preview',
  colors: {
    primary: '#111827',
    secondary: '#374151',
    accent: '#f59e0b',
    background: '#fafafa',
    text: '#111827'
  },
  layout: {
    headerStyle: 'premium',
    showLogo: true,
    showBorder: true,
    itemTableStyle: 'detailed',
    footerStyle: 'detailed'
  },
  fonts: {
    primary: 'Inter',
    secondary: 'Inter',
    size: 'medium'
  }
};

export const ElegantDarkPreview = () => (
  <div className="w-full h-32 bg-white rounded-lg relative overflow-hidden border border-gray-200">
    <div className="absolute top-0 left-0 right-0 h-10 bg-gray-900 text-white flex items-center justify-between px-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-white/10" />
        <div className="text-xs font-semibold tracking-wide">PREMIUM CO</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-bold text-amber-400">INVOICE</div>
        <div className="text-[7px] text-gray-300">#2024-001</div>
      </div>
    </div>
    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
      <div className="text-[7px] text-gray-700">
        <div className="uppercase text-[6px] text-amber-600">Bill To</div>
        <div>Client Name</div>
      </div>
      <div className="text-right">
        <div className="text-[6px] text-gray-500 uppercase">Total</div>
        <div className="text-base font-semibold text-amber-600">$7,250.00</div>
      </div>
    </div>
  </div>
);


