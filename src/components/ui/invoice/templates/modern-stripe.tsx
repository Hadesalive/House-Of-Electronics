import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

export const modernStripeTemplate: InvoiceTemplate = {
  id: 'modern-stripe',
  name: 'Modern Stripe',
  description: 'Clean design with subtle accent stripe and refined typography',
  preview: 'modern-stripe-preview',
  colors: {
    primary: '#1a1a1a',
    secondary: '#6b7280',
    accent: '#3b82f6',
    background: '#ffffff',
    text: '#111827'
  },
  layout: {
    headerStyle: 'modern',
    showLogo: true,
    showBorder: false,
    itemTableStyle: 'modern',
    footerStyle: 'minimal'
  },
  fonts: {
    primary: 'Inter',
    secondary: 'Inter',
    size: 'medium'
  }
};

export const ModernStripePreview = () => (
  <div className="w-full h-32 bg-white rounded-lg relative overflow-hidden border border-gray-200">
    <div 
      className="absolute top-0 right-0 w-8 h-full"
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% 15%, 85% 25%, 100% 35%, 100% 50%, 85% 60%, 100% 70%, 100% 85%, 85% 95%, 100% 100%, 0 100%)',
        background: 'linear-gradient(180deg, #3b82f61a, #3b82f60a)',
        borderLeft: '1px solid #3b82f630'
      }}
    />
    <div className="absolute top-4 left-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-blue-50 shadow-sm flex items-center justify-center">
        <div className="w-4 h-4 rounded bg-blue-200" />
      </div>
      <div>
        <div className="text-lg font-light text-gray-900">MODERN INC</div>
        <div className="w-8 h-0.5 rounded-full bg-blue-500 mt-1" />
        <div className="text-[8px] text-gray-500 mt-1">123 Main St, City, ST 12345</div>
      </div>
    </div>
    <div className="absolute top-4 right-12 text-right">
      <div className="text-[9px] font-medium bg-blue-500 text-white px-2 py-1 rounded-full uppercase tracking-wider">INVOICE</div>
      <div className="text-[8px] text-gray-600 mt-1">#2024-001</div>
    </div>
    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[8px] text-gray-700">
      <div>
        <div className="uppercase text-[7px] text-gray-500 font-medium tracking-wider">Bill To</div>
        <div className="font-medium">Client Name</div>
      </div>
      <div className="text-right">
        <div className="text-[7px] text-gray-500 uppercase font-medium tracking-wider">Amount Due</div>
        <div className="text-xl font-light text-gray-900">$4,500.00</div>
      </div>
    </div>
  </div>
);


