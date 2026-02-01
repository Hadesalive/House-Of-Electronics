import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/core';
import { salesService, customerService } from '@/lib/services';
import { useSettings } from '@/contexts/SettingsContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);
// Tabler Icons
import {
  IconShoppingCart,
  IconUsers,
  IconFileText,
  IconCube,
  IconTag,
  IconClipboardList,
  IconCurrencyDollar,
  IconRefresh,
  IconChartBar,
  IconSettings,
  IconPlus,
  IconArrowRight,
  IconTrendingUp,
  IconTrendingDown,
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconReceipt,
  IconCreditCard,
  IconPackage,
  IconBuildingStore,
  IconReport,
  IconDatabase,
  IconBell,
  IconSearch,
  IconFilter,
} from '@tabler/icons-react';

interface QuickActionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  badge?: string;
}

interface RecentActivity {
  id: string;
  type: 'sale' | 'invoice' | 'customer' | 'product';
  title: string;
  subtitle: string;
  time: string;
  icon: React.ReactNode;
  route: string;
}

export default function MainDashboardPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // Generate sample chart data for system metrics
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Sales Activity',
        data: [12, 19, 15, 25, 22, 18, 24],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: 'var(--card)',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${context.parsed.y} transactions`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(127, 127, 127, 0.1)',
        },
        ticks: {
          font: {
            size: 10,
          },
          stepSize: 5,
        },
        border: {
          display: false,
        },
      },
    },
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load only data needed for recent activities
      const [salesRes, customersRes] = await Promise.all([
        salesService.getAllSales(),
        customerService.getAllCustomers(),
      ]);

      // Build recent activities
      const activities: RecentActivity[] = [];
      
      // Add recent sales
      if (salesRes.success && salesRes.data) {
        const recentSales = salesRes.data
          .slice()
          .sort((a: { createdAt: string }, b: { createdAt: string }) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5)
          .map((sale: { id: string; customerName?: string; total: number; createdAt: string }) => ({
            id: sale.id,
            customerName: sale.customerName || 'Unknown Customer',
            total: sale.total,
            createdAt: sale.createdAt,
          }));

        recentSales.slice(0, 3).forEach((sale) => {
          activities.push({
            id: `sale-${sale.id}`,
            type: 'sale',
            title: `Sale to ${sale.customerName}`,
            subtitle: formatCurrency(sale.total),
            time: formatDate(new Date(sale.createdAt)),
            icon: <IconShoppingCart className="h-4 w-4" stroke={1.5} />,
            route: `/sales/${sale.id}`,
          });
        });
      }

      // Add recent customers
      if (customersRes.success && customersRes.data) {
        const recentCustomers = customersRes.data
          .slice()
          .sort((a: { createdAt: string }, b: { createdAt: string }) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 2);

        recentCustomers.forEach((customer: { id: string; name: string; createdAt: string }) => {
          activities.push({
            id: `customer-${customer.id}`,
            type: 'customer',
            title: `New customer: ${customer.name}`,
            subtitle: 'Customer added',
            time: formatDate(new Date(customer.createdAt)),
            icon: <IconUsers className="h-4 w-4" stroke={1.5} />,
            route: `/customers/${customer.id}`,
          });
        });
      }

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActionGroups = [
    {
      title: 'Create New',
      description: 'Start new transactions and records',
      actions: [
        {
          id: 'new-sale',
          title: 'New Sale',
          description: 'Create a new sale transaction',
          icon: <IconShoppingCart className="h-5 w-5" stroke={2} />,
          color: '#3b82f6',
          route: '/sales/new',
        },
        {
          id: 'new-invoice',
          title: 'Create Invoice',
          description: 'Generate a new invoice',
          icon: <IconFileText className="h-5 w-5" stroke={2} />,
          color: '#10b981',
          route: '/invoices/new',
        },
        {
          id: 'add-customer',
          title: 'Add Customer',
          description: 'Register a new customer',
          icon: <IconUsers className="h-5 w-5" stroke={2} />,
          color: '#f59e0b',
          route: '/customers/new',
        },
        {
          id: 'add-product',
          title: 'Add Product',
          description: 'Add a new product to inventory',
          icon: <IconCube className="h-5 w-5" stroke={2} />,
          color: '#8b5cf6',
          route: '/products/new',
        },
      ],
    },
    {
      title: 'View & Manage',
      description: 'Browse and manage existing records',
      actions: [
        {
          id: 'view-sales',
          title: 'Sales',
          description: 'Browse all sales records',
          icon: <IconClipboardList className="h-5 w-5" stroke={2} />,
          color: '#3b82f6',
          route: '/sales',
        },
        {
          id: 'view-invoices',
          title: 'Invoices',
          description: 'Manage all invoices',
          icon: <IconReceipt className="h-5 w-5" stroke={2} />,
          color: '#10b981',
          route: '/invoices',
        },
        {
          id: 'view-customers',
          title: 'Customers',
          description: 'Manage customer database',
          icon: <IconBuildingStore className="h-5 w-5" stroke={2} />,
          color: '#f59e0b',
          route: '/customers',
        },
        {
          id: 'view-products',
          title: 'Products',
          description: 'Manage product inventory',
          icon: <IconPackage className="h-5 w-5" stroke={2} />,
          color: '#8b5cf6',
          route: '/products',
        },
      ],
    },
    {
      title: 'System',
      description: 'Reports and configuration',
      actions: [
        {
          id: 'reports',
          title: 'Reports',
          description: 'View analytics and reports',
          icon: <IconReport className="h-5 w-5" stroke={2} />,
          color: '#6366f1',
          route: '/reports',
        },
        {
          id: 'settings',
          title: 'Settings',
          description: 'Configure system settings',
          icon: <IconSettings className="h-5 w-5" stroke={2} />,
          color: '#64748b',
          route: '/settings',
        },
      ],
    },
  ];

  const navigationSections = [
    {
      title: 'Sales & Finance',
      items: [
        { label: 'Sales', icon: <IconShoppingCart className="h-4 w-4" stroke={1.5} />, route: '/sales' },
        { label: 'Invoices', icon: <IconFileText className="h-4 w-4" stroke={1.5} />, route: '/invoices' },
        { label: 'Orders', icon: <IconClipboardList className="h-4 w-4" stroke={1.5} />, route: '/orders' },
        { label: 'Customer Debts', icon: <IconCreditCard className="h-4 w-4" stroke={1.5} />, route: '/credit' },
        { label: 'Returns', icon: <IconRefresh className="h-4 w-4" stroke={1.5} />, route: '/returns' },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Products', icon: <IconCube className="h-4 w-4" stroke={1.5} />, route: '/products' },
        { label: 'Inventory', icon: <IconTag className="h-4 w-4" stroke={1.5} />, route: '/inventory' },
      ],
    },
    {
      title: 'People',
      items: [
        { label: 'Customers', icon: <IconUsers className="h-4 w-4" stroke={1.5} />, route: '/customers' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Reports', icon: <IconChartBar className="h-4 w-4" stroke={1.5} />, route: '/reports' },
        { label: 'Settings', icon: <IconSettings className="h-4 w-4" stroke={1.5} />, route: '/settings' },
      ],
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--background)' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `
      }} />
      {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--accent)' }}
        />
        <div 
          className="absolute top-1/2 -left-40 w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--accent)' }}
        />
      </div>

      <div className="relative max-w-[1600px] mx-auto p-6 lg:p-10">
        {/* Header Section - Compact */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--foreground)' }}>
                Control Center
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Quick access to all system functions and operations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/overview')}
                className="flex items-center gap-2"
              >
                <IconSearch className="h-4 w-4" stroke={1.5} />
                Overview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2"
              >
                <IconSettings className="h-4 w-4" stroke={1.5} />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions - All groups in compact grid */}
        <div className="space-y-6 mb-6">
          {quickActionGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              <div className="mb-3">
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                  {group.title}
                </h2>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {group.description}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => navigate(action.route)}
                    className="group relative p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] overflow-hidden"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    {/* Gradient overlay on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${action.color}08 0%, transparent 50%)`,
                      }}
                    />
                    
                    <div className="relative z-10">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 transition-all duration-200 group-hover:scale-110"
                        style={{
                          background: `${action.color}15`,
                          color: action.color,
                        }}
                      >
                        {action.icon}
                      </div>
                      <h3 className="text-sm font-bold mb-1 text-left" style={{ color: 'var(--foreground)' }}>
                        {action.title}
                      </h3>
                      <p className="text-[10px] text-left leading-relaxed line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                        {action.description}
                      </p>
                    </div>
                  </button>
                ))}
                {/* Add mini chart for System section - spans 2 columns */}
                {groupIdx === quickActionGroups.length - 1 && (
                  <div
                    className="group relative p-4 rounded-xl border transition-all duration-200 hover:shadow-lg overflow-hidden col-span-2"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    {/* Decorative corner */}
                    <div
                      className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-5"
                      style={{ background: '#3b82f6' }}
                    />
                    
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <IconTrendingUp className="h-4 w-4" style={{ color: '#3b82f6' }} stroke={1.5} />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                          Weekly Activity
                        </h3>
                      </div>
                      <div className="flex-1 min-h-0">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        <span>Last 7 days</span>
                        <span className="font-semibold flex items-center gap-1" style={{ color: '#3b82f6' }}>
                          <IconTrendingUp className="h-3 w-3" stroke={1.5} />
                          +12%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content - Asymmetric Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          {/* Recent Activity - Takes more space */}
          <div className="lg:col-span-8">
            <div className="relative p-5 rounded-xl border overflow-hidden h-full" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {/* Decorative corner */}
              <div 
                className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-5"
                style={{ background: 'var(--accent)' }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-1 h-5 rounded-full" style={{ background: 'var(--accent)' }} />
                      <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                        Recent Activity
                      </h2>
                    </div>
                    <p className="text-xs ml-3" style={{ color: 'var(--muted-foreground)' }}>
                      Latest transactions and system updates
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/sales')}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    View All
                    <IconArrowRight className="h-3.5 w-3.5" stroke={1.5} />
                  </Button>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
                    ))}
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-2.5">
                    {recentActivities.map((activity, idx) => (
                      <button
                        key={activity.id}
                        onClick={() => navigate(activity.route)}
                        className="w-full p-3 rounded-lg border text-left relative overflow-hidden transition-all duration-300 hover:bg-[var(--muted)]"
                        style={{
                          background: 'var(--background)',
                          borderColor: 'var(--border)',
                          animation: `fadeInUp 0.4s ease-out ${idx * 0.1}s both`,
                        }}
                      >
                        <div className="flex items-center gap-3 pl-1.5">
                          <div
                            className="p-2.5 rounded-xl flex-shrink-0 transition-transform duration-300 hover:scale-110"
                            style={{
                              background: 'var(--accent)15',
                              color: 'var(--accent)',
                            }}
                          >
                            {activity.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold mb-0.5 transition-colors duration-300" style={{ color: 'var(--foreground)' }}>
                              {activity.title}
                            </div>
                            <div className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>
                              {activity.subtitle}
                            </div>
                            <div className="text-[10px] font-medium flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
                              <IconClock className="h-3 w-3" stroke={1.5} />
                              {activity.time}
                            </div>
                          </div>
                          <IconArrowRight
                            className="h-4 w-4 flex-shrink-0 transition-all duration-300 hover:translate-x-1"
                            style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
                            stroke={1.5}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
                      <IconClock className="h-7 w-7" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} stroke={1.5} />
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                      No recent activity
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      Your recent transactions will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Navigation - Compact sidebar */}
          <div className="lg:col-span-4">
            <div className="relative p-4 rounded-xl border sticky top-6 overflow-hidden h-full" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {/* Decorative element */}
              <div 
                className="absolute top-0 left-0 w-20 h-20 rounded-br-full opacity-5"
                style={{ background: 'var(--accent)' }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background: 'var(--accent)' }} />
                  <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                    Navigation
                  </h2>
                </div>
                <div className="space-y-4">
                  {navigationSections.map((section, idx) => (
                    <div key={idx}>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2.5 px-1" style={{ color: 'var(--muted-foreground)' }}>
                        {section.title}
                      </h3>
                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => navigate(item.route)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:bg-[var(--muted)] hover:scale-[1.01] text-left group relative overflow-hidden"
                            style={{ color: 'var(--foreground)' }}
                          >
                            {/* Hover accent */}
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: 'var(--accent)' }}
                            />
                            <span className="relative z-10 transition-transform group-hover:scale-110" style={{ color: 'var(--accent)' }}>
                              {item.icon}
                            </span>
                            <span className="flex-1 relative z-10">{item.label}</span>
                            <IconArrowRight
                              className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 relative z-10"
                              style={{ color: 'var(--accent)' }}
                              stroke={1.5}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
