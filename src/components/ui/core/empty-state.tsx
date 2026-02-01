import React from "react";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { 
  DocumentTextIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: "default" | "search" | "error";
}

const defaultIcons = {
  default: DocumentTextIcon,
  search: MagnifyingGlassIcon,
  error: ExclamationTriangleIcon
};

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className = "",
  variant = "default"
}: EmptyStateProps) {
  const DefaultIcon = defaultIcons[variant];

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      <div 
        className="rounded-full p-4 mb-4"
        style={{
          backgroundColor: variant === "error" ? "rgba(239, 68, 68, 0.1)" : "var(--muted)"
        }}
      >
        {icon || (
          <DefaultIcon 
            className="h-8 w-8"
            style={{
              color: variant === "error" ? "#ef4444" : "var(--muted-foreground)"
            }}
          />
        )}
      </div>
      
      <h3 
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </h3>
      
      {description && (
        <p 
          className="text-sm mb-6 max-w-md"
          style={{ color: "var(--muted-foreground)" }}
        >
          {description}
        </p>
      )}
      
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}

// Predefined empty states for common scenarios
interface PredefinedEmptyStateProps {
  type: "customers" | "products" | "orders" | "sales" | "search" | "error";
  action?: ReactNode;
  className?: string;
}

const predefinedStates = {
  customers: {
    icon: UserGroupIcon,
    title: "No customers found",
    description: "Get started by adding your first customer to track their information and purchase history."
  },
  products: {
    icon: ShoppingCartIcon,
    title: "No products found",
    description: "Add products to your inventory to start tracking sales and managing your catalog."
  },
  orders: {
    icon: DocumentTextIcon,
    title: "No orders found",
    description: "When customers place orders, they'll appear here for easy tracking and management."
  },
  sales: {
    icon: ChartBarIcon,
    title: "No sales data",
    description: "Sales data will appear here once you start recording transactions and customer purchases."
  },
  search: {
    icon: MagnifyingGlassIcon,
    title: "No results found",
    description: "Try adjusting your search criteria or filters to find what you're looking for."
  },
  error: {
    icon: ExclamationTriangleIcon,
    title: "Something went wrong",
    description: "We encountered an error while loading this content. Please try again."
  }
};

export function PredefinedEmptyState({ 
  type, 
  action, 
  className = "" 
}: PredefinedEmptyStateProps) {
  const config = predefinedStates[type];
  const Icon = config.icon;

  return (
    <EmptyState
      icon={<Icon className="h-8 w-8" style={{ color: "var(--muted-foreground)" }} />}
      title={config.title}
      description={config.description}
      action={action}
      className={className}
      variant={type === "error" ? "error" : "default"}
    />
  );
}

// Card-based empty state
interface EmptyStateCardProps extends EmptyStateProps {
  header?: string;
}

export function EmptyStateCard({ 
  header,
  icon, 
  title, 
  description, 
  action, 
  className = "" 
}: EmptyStateCardProps) {
  return (
    <div 
      className={cn(
        "rounded-xl p-8",
        className
      )}
      style={{ 
        background: "var(--card)", 
        border: "1px solid var(--border)" 
      }}
    >
      {header && (
        <div 
          className="mb-6 pb-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {header}
          </h2>
        </div>
      )}
      
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={action}
      />
    </div>
  );
}
