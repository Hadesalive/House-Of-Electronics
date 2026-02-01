import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

export const classicColumnTemplate: InvoiceTemplate = {
  id: 'classic-column',
  name: 'Classic Column',
  description: 'Left column for company + client, right column totals',
  preview: 'classic-column-preview',
  colors: {
    primary: '#1f2937',
    secondary: '#6b7280',
    accent: '#ef4444',
    background: '#ffffff',
    text: '#111827'
  },
  layout: {
    headerStyle: 'classic',
    showLogo: true,
    showBorder: true,
    itemTableStyle: 'detailed',
    footerStyle: 'minimal'
  },
  fonts: {
    primary: 'Inter',
    secondary: 'Inter',
    size: 'medium'
  }
};

export const ClassicColumnPreview = () => (
  <div className="w-full h-32 bg-white rounded-lg relative overflow-hidden border border-gray-200">
    <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-900/10 rounded" />
        <div className="text-xs font-semibold text-gray-900">INVOICE</div>
      </div>
      <div className="text-right text-[7px] text-gray-600">
        <div>#2024-001</div>
        <div>Jan 15, 2024</div>
      </div>
    </div>
    <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-2">
      <div className="col-span-2 text-[7px] text-gray-700">
        <div className="uppercase text-[6px] text-gray-500">From</div>
        <div>Your Company, 123 Business St</div>
        <div className="uppercase text-[6px] text-gray-500 mt-1">To</div>
        <div>Client Name, 456 Client Ave</div>
      </div>
      <div className="text-right bg-gray-50 border border-gray-200 rounded p-1">
        <div className="text-[6px] text-gray-600 uppercase">Total</div>
        <div className="text-base font-semibold text-red-600">$3,750.00</div>
      </div>
    </div>
  </div>
);


