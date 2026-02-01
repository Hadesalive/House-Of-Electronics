'use client';

import React from 'react';
import { Button } from '@/components/ui/core';
import { Badge } from '@/components/ui/core';
import { Customer } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function CustomerCard({ 
  customer, 
  onEdit, 
  onDelete, 
  onViewDetails,
  className = "" 
}: CustomerCardProps) {
  const { formatDate } = useSettings();

  return (
    <div 
      className={`p-6 rounded-lg border ${className}`}
      style={{ 
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-full"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <UserIcon className="h-6 w-6" style={{ color: 'var(--muted-foreground)' }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {customer.name}
            </h3>
            {customer.company && (
              <p className="text-sm flex items-center" style={{ color: 'var(--muted-foreground)' }}>
                <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                {customer.company}
              </p>
            )}
          </div>
        </div>
        <Badge variant="secondary">
          Active
        </Badge>
      </div>

      <div className="space-y-2 mb-4">
        {customer.email && (
          <div className="flex items-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <EnvelopeIcon className="h-4 w-4 mr-2" />
            {customer.email}
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <PhoneIcon className="h-4 w-4 mr-2" />
            {customer.phone}
          </div>
        )}
      </div>

      {customer.address && (
        <div className="mb-4">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {customer.address}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
        <span>Created {formatDate(customer.createdAt)}</span>
        {customer.updatedAt !== customer.createdAt && (
          <span>Updated {formatDate(customer.updatedAt)}</span>
        )}
      </div>

      <div className="flex items-center justify-end space-x-2 mt-4 pt-4" style={{ borderTopColor: 'var(--border)' }}>
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="flex items-center gap-1"
          >
            <EyeIcon className="h-4 w-4" />
            View
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="flex items-center gap-1"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
