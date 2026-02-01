import React from "react";
import { cn } from "@/lib/utils";
import { UserIcon, PhoneIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { useSettings } from '@/contexts/SettingsContext';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  totalSpent: number;
  lastOrderDate: string;
  status: "active" | "inactive";
}

interface CustomerListProps {
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  className?: string;
}

export function CustomerList({ 
  customers, 
  onSelectCustomer, 
  className = "" 
}: CustomerListProps) {
  const { formatCurrency, formatDate } = useSettings();

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
            Customers
          </h3>
          <span 
            className="text-sm px-3 py-1 rounded-full"
            style={{ 
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)'
            }}
          >
            {customers.length} total
          </span>
        </div>

        <div className="space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="p-4 rounded-lg border cursor-pointer transition-all"
              style={{ 
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)'
              }}
              onClick={() => onSelectCustomer?.(customer)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--muted)' }}
                  >
                    <UserIcon 
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
                        {customer.name}
                      </h4>
                      <span 
                        className={`text-xs px-2 py-1 rounded-full ${
                          customer.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {customer.status}
                      </span>
                    </div>
                    
                    {customer.company && (
                      <p 
                        className="text-xs mb-1"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {customer.company}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <EnvelopeIcon 
                          className="h-3 w-3"
                          style={{ color: 'var(--muted-foreground)' }}
                        />
                        <span style={{ color: 'var(--muted-foreground)' }}>
                          {customer.email}
                        </span>
                      </div>
                      
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <PhoneIcon 
                            className="h-3 w-3"
                            style={{ color: 'var(--muted-foreground)' }}
                          />
                          <span style={{ color: 'var(--muted-foreground)' }}>
                            {customer.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p 
                    className="text-sm font-semibold"
                    style={{ color: 'var(--accent)' }}
                  >
                    {formatCurrency(customer.totalSpent)}
                  </p>
                  <p 
                    className="text-xs"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Last order: {formatDate(customer.lastOrderDate)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
