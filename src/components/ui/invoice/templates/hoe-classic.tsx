import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

export const hoeClassicTemplate: InvoiceTemplate = {
    id: 'hoe-classic',
    name: 'HOE Classic',
    description: 'House Of Electronics classic invoice',
    preview: 'hoe-classic-preview',
    colors: {
        primary: '#2563eb',        // HOE blue
        secondary: '#0f172a',      // Slate 900 for text accents
        accent: '#14b8a6',         // Teal accent
        background: '#ffffff',
        text: '#0f172a',
    },
    layout: {
        headerStyle: 'classic',
        showLogo: true,
        showBorder: true,
        itemTableStyle: 'detailed',
        footerStyle: 'detailed',
    },
    fonts: {
        primary: 'Inter',
        secondary: 'Inter',
        size: 'medium',
    },
};

export const HoeClassicPreview = () => (
    <div className="w-full h-32 bg-white rounded-lg relative overflow-hidden border border-gray-200">
        <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #14b8a6 100%)' }} />
        <div className="absolute top-2 left-3 right-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg" style={{ background: '#2563eb' }} />
                <div className="text-xs font-semibold" style={{ color: '#0f172a' }}>HOE CLASSIC</div>
            </div>
            <div className="text-right text-[7px]" style={{ color: '#0f172a' }}>
                <div>INVOICE</div>
                <div>#INV-001</div>
            </div>
        </div>
        <div className="absolute bottom-2 left-3 right-3 grid grid-cols-3 gap-2">
            <div className="col-span-2 text-[7px]" style={{ color: '#0f172a' }}>
                <div className="uppercase text-[6px]" style={{ color: '#2563eb' }}>Bill To</div>
                <div>Client Name, Freetown</div>
                <div className="uppercase text-[6px] mt-1" style={{ color: '#2563eb' }}>From</div>
                <div>House Of Electronics</div>
            </div>
            <div className="text-right rounded p-1" style={{ background: '#2563eb0d', border: '1px solid #2563eb33' }}>
                <div className="text-[6px] uppercase" style={{ color: '#0f172a' }}>Total</div>
                <div className="text-base font-semibold" style={{ color: '#2563eb' }}>NLe 3,750.00</div>
            </div>
        </div>
    </div>
);


