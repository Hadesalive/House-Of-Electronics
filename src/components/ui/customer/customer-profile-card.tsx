"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  EllipsisVerticalIcon
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
// import Image from "next/image"; // Removed - using regular img tag instead

interface CustomerProfileCardProps {
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    location?: string;
    joinDate?: string;
    totalOrders?: number;
    totalSpent?: number;
    status?: 'active' | 'inactive' | 'vip';
    rating?: number;
    tags?: string[];
  };
  className?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onViewDetails?: () => void;
}

export function CustomerProfileCard({ 
  customer, 
  className = "", 
  showActions = true,
  onEdit,
  onViewDetails
}: CustomerProfileCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'vip': return '#ff6b00';
      case 'active': return '#10b981';
      case 'inactive': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'vip': return 'VIP';
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  return (
    <div 
      className={cn(
        "rounded-2xl p-6 transition-all duration-300 backdrop-blur-xl flex flex-col h-full",
        className
      )}
      style={{ 
        background: "rgba(255, 255, 255, 0.8)"
      }}
    >
      {/* Header with Avatar and Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            {customer.avatar ? (
              <img
                src={customer.avatar}
                alt={customer.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm"
                style={{ 
                  background: "rgba(255, 255, 255, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.3)"
                }}
              >
                <UserIcon className="h-8 w-8" style={{ color: "rgba(0, 0, 0, 0.6)" }} />
              </div>
            )}
            
            {/* Status Badge */}
            {customer.status && (
              <div 
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center backdrop-blur-sm"
                style={{ 
                  backgroundColor: getStatusColor(customer.status),
                  borderColor: "rgba(255, 255, 255, 0.8)"
                }}
              >
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: "rgba(0, 0, 0, 0.9)" }}>
              {customer.name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span 
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ 
                  backgroundColor: getStatusColor(customer.status) + '20',
                  color: getStatusColor(customer.status)
                }}
              >
                {getStatusLabel(customer.status)}
              </span>
              {customer.rating && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIconSolid
                      key={star}
                      className="h-3 w-3"
                      style={{ 
                        color: star <= customer.rating! ? "#fbbf24" : "var(--muted-foreground)" 
                      }}
                    />
                  ))}
                  <span className="text-xs" style={{ color: "rgba(0, 0, 0, 0.6)" }}>
                    {customer.rating}/5
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        {showActions && (
          <div className="relative">
            <button
              className="p-2 rounded-lg hover:bg-black/5 transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="space-y-3 mb-4 flex-grow">
        <div className="flex items-center gap-3">
          <EnvelopeIcon className="h-4 w-4" style={{ color: "rgba(0, 0, 0, 0.6)" }} />
          <span className="text-sm" style={{ color: "rgba(0, 0, 0, 0.8)" }}>
            {customer.email}
          </span>
        </div>
        
        {customer.phone && (
          <div className="flex items-center gap-3">
            <PhoneIcon className="h-4 w-4" style={{ color: "rgba(0, 0, 0, 0.6)" }} />
            <span className="text-sm" style={{ color: "rgba(0, 0, 0, 0.8)" }}>
              {customer.phone}
            </span>
          </div>
        )}
        
        {customer.location && (
          <div className="flex items-center gap-3">
            <MapPinIcon className="h-4 w-4" style={{ color: "rgba(0, 0, 0, 0.6)" }} />
            <span className="text-sm" style={{ color: "rgba(0, 0, 0, 0.8)" }}>
              {customer.location}
            </span>
          </div>
        )}
        
        {customer.joinDate && (
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4" style={{ color: "rgba(0, 0, 0, 0.6)" }} />
            <span className="text-sm" style={{ color: "rgba(0, 0, 0, 0.8)" }}>
              Member since {new Date(customer.joinDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {customer.totalOrders !== undefined && (
          <div className="text-center p-3 rounded-xl backdrop-blur-sm" style={{ background: "rgba(255, 255, 255, 0.6)" }}>
            <ShoppingBagIcon className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--accent)" }} />
            <div className="text-lg font-semibold" style={{ color: "rgba(0, 0, 0, 0.9)" }}>
              {customer.totalOrders}
            </div>
            <div className="text-xs" style={{ color: "rgba(0, 0, 0, 0.6)" }}>
              Orders
            </div>
          </div>
        )}
        
        {customer.totalSpent !== undefined && (
          <div className="text-center p-3 rounded-xl backdrop-blur-sm" style={{ background: "rgba(255, 255, 255, 0.6)" }}>
            <CurrencyDollarIcon className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--accent)" }} />
            <div className="text-lg font-semibold" style={{ color: "rgba(0, 0, 0, 0.9)" }}>
              ${customer.totalSpent.toLocaleString()}
            </div>
            <div className="text-xs" style={{ color: "rgba(0, 0, 0, 0.6)" }}>
              Total Spent
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      {customer.tags && customer.tags.length > 0 && (
        <div className="mb-4 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {customer.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 rounded-full backdrop-blur-sm"
                style={{ 
                  background: "rgba(255, 255, 255, 0.6)",
                  color: "rgba(0, 0, 0, 0.7)"
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-2 pt-4 mt-auto flex-shrink-0">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex-1 py-2.5 px-3 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm flex items-center justify-center"
              style={{
                backgroundColor: "var(--accent)",
                color: "white",
                boxShadow: "0 4px 12px rgba(255, 107, 0, 0.3)",
                minHeight: "40px"
              }}
            >
              View Details
            </button>
          )}
          
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 py-2.5 px-3 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm flex items-center justify-center"
              style={{
                background: "rgba(255, 255, 255, 0.6)",
                color: "rgba(0, 0, 0, 0.8)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                minHeight: "40px"
              }}
            >
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for lists
interface CustomerProfileCompactProps {
  customer: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: 'active' | 'inactive' | 'vip';
    totalOrders?: number;
    totalSpent?: number;
  };
  className?: string;
  onClick?: () => void;
}

export function CustomerProfileCompact({ 
  customer, 
  className = "",
  onClick 
}: CustomerProfileCompactProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'vip': return '#ff6b00';
      case 'active': return '#10b981';
      case 'inactive': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer backdrop-blur-sm",
        onClick && "hover:scale-105",
        className
      )}
      onClick={onClick}
      style={{ 
        background: "rgba(255, 255, 255, 0.6)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
      }}
    >
      {/* Avatar */}
      <div className="relative">
        {customer.avatar ? (
          <img
            src={customer.avatar}
            alt={customer.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ 
              background: "rgba(255, 255, 255, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}
          >
            <UserIcon className="h-5 w-5" style={{ color: "rgba(0, 0, 0, 0.6)" }} />
          </div>
        )}
        
        {customer.status && (
          <div 
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border"
            style={{ 
              backgroundColor: getStatusColor(customer.status),
              borderColor: "rgba(255, 255, 255, 0.6)"
            }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" style={{ color: "rgba(0, 0, 0, 0.9)" }}>
          {customer.name}
        </div>
        <div className="text-xs truncate" style={{ color: "rgba(0, 0, 0, 0.6)" }}>
          {customer.email}
        </div>
      </div>

      {/* Stats */}
      <div className="text-right">
        {customer.totalSpent !== undefined && (
          <div className="text-sm font-medium" style={{ color: "rgba(0, 0, 0, 0.9)" }}>
            ${customer.totalSpent.toLocaleString()}
          </div>
        )}
        {customer.totalOrders !== undefined && (
          <div className="text-xs" style={{ color: "rgba(0, 0, 0, 0.6)" }}>
            {customer.totalOrders} orders
          </div>
        )}
      </div>
    </div>
  );
}
