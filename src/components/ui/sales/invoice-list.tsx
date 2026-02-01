import React from "react";
import { cn } from "@/lib/utils";
import { DocumentTextIcon, CalendarIcon, UserIcon } from "@heroicons/react/24/outline";
import { useSettings } from '@/contexts/SettingsContext';

interface Invoice {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: string;
  createdDate: string;
}

interface InvoiceListProps {
  invoices: Invoice[];
  onSelectInvoice?: (invoice: Invoice) => void;
  className?: string;
}

export function InvoiceList({ 
  invoices, 
  onSelectInvoice, 
  className = "" 
}: InvoiceListProps) {
  const { formatCurrency, formatDate } = useSettings();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'sent':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'overdue':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'draft':
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  };

  return (
    <div 
      className={cn("rounded-xl", className)}
      style={{ 
        background: 'var(--card)', 
        border: '1px solid var(--border)' 
      }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 
            className="text-lg font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Invoices
          </h3>
          <span 
            className="text-sm px-3 py-1 rounded-full"
            style={{ 
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)'
            }}
          >
            {invoices.length} total
          </span>
        </div>

        <div className="space-y-3">
          {invoices.map((invoice) => {
            const statusColors = getStatusColor(invoice.status);
            
            return (
              <div
                key={invoice.id}
                className="p-4 rounded-lg border cursor-pointer transition-all"
                style={{ 
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)'
                }}
                onClick={() => onSelectInvoice?.(invoice)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--muted)' }}
                    >
                      <DocumentTextIcon 
                        className="h-5 w-5"
                        style={{ color: 'var(--muted-foreground)' }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 
                          className="text-sm font-semibold"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {invoice.number}
                        </h4>
                        <span 
                          className={`text-xs px-2 py-1 rounded-full ${statusColors.bg} ${statusColors.text}`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs mb-2">
                        <div className="flex items-center gap-1">
                          <UserIcon 
                            className="h-3 w-3"
                            style={{ color: 'var(--muted-foreground)' }}
                          />
                          <span style={{ color: 'var(--muted-foreground)' }}>
                            {invoice.customer}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <CalendarIcon 
                            className="h-3 w-3"
                            style={{ color: 'var(--muted-foreground)' }}
                          />
                          <span style={{ color: 'var(--muted-foreground)' }}>
                            Due: {formatDate(invoice.dueDate)}
                          </span>
                        </div>
                      </div>
                      
                      <p 
                        className="text-xs"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        Created: {formatDate(invoice.createdDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p 
                      className="text-sm font-semibold"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {formatCurrency(invoice.amount)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
