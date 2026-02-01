import React from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { 
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "@heroicons/react/24/outline";

interface QuickStat {
  id: string;
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "primary" | "secondary" | "accent" | "warning" | "success";
  loading?: boolean;
}

interface QuickStatsProps {
  stats: QuickStat[];
  className?: string;
  columns?: 2 | 3 | 4;
}

const statColors = {
  primary: {
    bg: "bg-primary/10",
    icon: "text-primary",
    border: "border-primary/20"
  },
  secondary: {
    bg: "bg-secondary/10", 
    icon: "text-secondary-foreground",
    border: "border-secondary/20"
  },
  accent: {
    bg: "bg-accent/10",
    icon: "text-accent", 
    border: "border-accent/20"
  },
  warning: {
    bg: "bg-yellow-500/10",
    icon: "text-yellow-600",
    border: "border-yellow-500/20"
  },
  success: {
    bg: "bg-green-500/10",
    icon: "text-green-600", 
    border: "border-green-500/20"
  }
};

export function QuickStats({ 
  stats, 
  className = "",
  columns = 4
}: QuickStatsProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3", 
    4: "grid-cols-2 md:grid-cols-4"
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {stats.map((stat) => {
        const colors = statColors[stat.color || "accent"];
        
        return (
          <div
            key={stat.id}
            className={cn(
              "p-4 rounded-xl border transition-all duration-200 hover:shadow-sm",
              colors.bg,
              colors.border
            )}
            style={{ 
              background: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={cn("p-2 rounded-lg", colors.bg)}>
                <div className={cn("h-5 w-5", colors.icon)}>
                  {stat.icon}
                </div>
              </div>
              {stat.trend && (
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  stat.trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {stat.trend.isPositive ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4" />
                  )}
                  <span>{Math.abs(stat.trend.value)}%</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>
                {stat.title}
              </div>
              <div className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {stat.loading ? (
                  <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  stat.value
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Predefined common quick stats
export const createQuickStats = (data: {
  todaySales?: number;
  pendingInvoices?: number;
  lowStockProducts?: number;
  recentCustomers?: number;
  loading?: boolean;
  formatCurrency?: (amount: number) => string;
}) => {
  const { 
    todaySales = 0, 
    pendingInvoices = 0, 
    lowStockProducts = 0, 
    recentCustomers = 0, 
    loading = false,
    formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
  } = data;

  return [
    {
      id: "today-sales",
      title: "Today's Sales",
      value: formatCurrency(todaySales),
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      color: "success" as const,
      loading
    },
    {
      id: "pending-invoices", 
      title: "Pending Invoices",
      value: pendingInvoices,
      icon: <DocumentTextIcon className="h-5 w-5" />,
      color: "warning" as const,
      loading
    },
    {
      id: "low-stock",
      title: "Low Stock Items",
      value: lowStockProducts,
      icon: <ExclamationTriangleIcon className="h-5 w-5" />,
      color: lowStockProducts > 0 ? "warning" as const : "success" as const,
      loading
    },
    {
      id: "recent-customers",
      title: "New Customers",
      value: recentCustomers,
      icon: <UserGroupIcon className="h-5 w-5" />,
      color: "primary" as const,
      loading
    }
  ];
};
