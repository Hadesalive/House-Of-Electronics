import React from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KPICard } from "../dashboard/kpi-card";
import { ChartCard } from "../dashboard/chart-card";
import { ListCard } from "../dashboard/list-card";

interface SalesDashboardProps {
  className?: string;
  children?: ReactNode;
}

export function SalesDashboard({ className = "", children }: SalesDashboardProps) {
  // Mock data - in real app, this would come from props or context
  const kpiData = [
    {
      title: "Total Revenue",
      value: "$45,230",
      trend: { value: 12.5, isPositive: true },
      icon: null
    },
    {
      title: "Active Deals",
      value: "23",
      trend: { value: 8.2, isPositive: true },
      icon: null
    },
    {
      title: "Conversion Rate",
      value: "68%",
      trend: { value: 3.1, isPositive: true },
      icon: null
    },
    {
      title: "Avg Deal Size",
      value: "$1,967",
      trend: { value: 5.4, isPositive: false },
      icon: null
    }
  ];

  const topCustomers = [
    { id: "1", label: "Acme Corp", value: "$12,450" },
    { id: "2", label: "Tech Solutions", value: "$8,920" },
    { id: "3", label: "Global Industries", value: "$6,780" },
    { id: "4", label: "Startup Inc", value: "$4,320" },
    { id: "5", label: "Enterprise Ltd", value: "$3,150" }
  ];

  const recentActivities = [
    { id: "1", label: "New deal: Website Redesign", value: "$5,000" },
    { id: "2", label: "Invoice #INV-001 paid", value: "$2,500" },
    { id: "3", label: "Follow-up: Acme Corp", value: "2 days ago" },
    { id: "4", label: "Proposal sent: Tech Solutions", value: "1 day ago" },
    { id: "5", label: "Meeting scheduled: Global Industries", value: "Tomorrow" }
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            trend={kpi.trend}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue Trend">
          <div 
            className="h-64 flex items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <p 
              className="text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Chart placeholder - Revenue trend over time
            </p>
          </div>
        </ChartCard>

        <ListCard 
          title="Top Customers" 
          items={topCustomers}
          itemsPerPage={0}
        />
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListCard 
          title="Recent Activities" 
          items={recentActivities}
          itemsPerPage={0}
        />

        <ChartCard title="Sales Pipeline">
          <div 
            className="h-64 flex items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <p 
              className="text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Chart placeholder - Sales pipeline distribution
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Custom Content */}
      {children && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}
