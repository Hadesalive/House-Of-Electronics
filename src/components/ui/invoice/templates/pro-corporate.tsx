import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

export const proCorporateTemplate: InvoiceTemplate = {
  id: 'pro-corporate',
  name: 'Pro Corporate',
  description: 'Clean corporate with balanced header and easy-to-scan table',
  preview: 'pro-corporate-preview',
  colors: {
    primary: '#0f172a',
    secondary: '#475569',
    accent: '#0ea5e9',
    background: '#ffffff',
    text: '#0f172a'
  },
  layout: {
    headerStyle: 'classic',
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

export const ProCorporatePreview = () => (
  <div className="w-full h-32 bg-white rounded-lg relative overflow-hidden border border-gray-200">
    <div className="absolute top-0 left-0 right-0 h-10 bg-slate-900 text-white flex items-center justify-between px-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-white/10 rounded" />
        <div className="text-xs font-semibold tracking-wide">YOUR COMPANY</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-bold">INVOICE</div>
        <div className="text-[7px] opacity-80">INV-2024-001</div>
      </div>
    </div>
    <div className="absolute top-10 left-3 right-3 bottom-2">
      <div className="flex justify-between text-[7px] text-slate-600 mb-2">
        <div>
          <div className="uppercase font-semibold text-slate-900">Bill To</div>
          <div>Client Name Inc.</div>
        </div>
        <div className="text-right">
          <div>Date: Jan 15, 2024</div>
          <div>Due: Feb 15, 2024</div>
        </div>
      </div>
      <div className="border-t border-slate-200 pt-1">
        <div className="flex justify-between text-[6px] text-slate-500 uppercase">
          <span>Description</span>
          <span>Amount</span>
        </div>
        <div className="flex justify-between text-[7px]">
          <span className="text-slate-800">Professional Web Design</span>
          <span className="font-medium text-slate-900">$2,500.00</span>
        </div>
      </div>
    </div>
  </div>
);


