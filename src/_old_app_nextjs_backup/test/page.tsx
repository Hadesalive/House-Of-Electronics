"use client";

import { useState } from "react";
import { 
  DashboardLayout, 
  DashboardHeader, 
  DashboardSidebar, 
  MobileDrawer,
  KPICard,
  ChartCard,
  PaginatedTableCard
} from "@/components/ui/dashboard";
import { Button } from "@/components/ui/core";
import { Input } from "@/components/ui/forms/input";
import { Textarea } from "@/components/ui/forms/textarea";
import { Select } from "@/components/ui/forms/select";
import { Checkbox } from "@/components/ui/forms/checkbox";
import { Radio } from "@/components/ui/forms/radio";
import { Switch } from "@/components/ui/forms/switch";
import { DatePicker } from "@/components/ui/forms/date-picker";
import { FormCard } from "@/components/ui/forms/form-card";
import { FormSection } from "@/components/ui/forms/form-section";
import { FormActions } from "@/components/ui/forms/form-actions";
import { Alert, Toast, Badge, StatusBadge, Modal, ConfirmModal, Tabs, EmptyState } from "@/components/ui/core";
import { SalesPipeline, CustomerList, InvoiceList, ProductCatalog, SalesDashboard } from "@/components/ui/sales";
import { InvoiceBuilder, InvoicePreview, ReceiptPreview } from "@/components/ui/invoice";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { UserIcon } from "@heroicons/react/24/outline";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

export default function TestPage() {
  const [active, setActive] = useState("Test");
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{
    invoiceNumber: string;
    date: string;
    dueDate: string;
    company: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
      email: string;
    };
    customer: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
      email: string;
    };
    items: {
      id: string;
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }[];
    notes: string;
    terms: string;
    taxRate: number;
    discount: number;
  } | null>(null);


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    country: "",
    newsletter: false,
    gender: "",
    notifications: false,
    birthDate: ""
  });

  const handleSidebarSelect = (name: string) => {
    setActive(name);
  };

  const handleMenuClick = () => {
    const el = document.getElementById('dashboard-drawer') as HTMLDialogElement | null;
    if (el?.showModal) el.showModal();
  };

  const handleSidebarSelectMobile = (name: string) => {
    setActive(name);
    (document.getElementById('dashboard-drawer') as HTMLDialogElement)?.close();
  };

  const headerActions = (
    <>
      <Button variant="outline">Export</Button>
      <Button variant="default">New Item</Button>
    </>
  );


  const doughnutOptions: ChartOptions<'doughnut'> = { 
    plugins: { legend: { display: false } },
    maintainAspectRatio: false,
    responsive: true
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'var(--muted-foreground)' }
      },
      y: {
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--muted-foreground)' }
      }
    }
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'var(--muted-foreground)' }
      },
      y: {
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--muted-foreground)' }
      }
    }
  };

  const orderStatus = { completed: 52, pending: 35, cancelled: 13 };

  // Revenue trend data
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Revenue',
      data: [12000, 19000, 15000, 25000, 22000, 30000],
      borderColor: '#ff6b00',
      backgroundColor: 'rgba(255, 107, 0, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  // Sales pipeline data
  const pipelineData = {
    labels: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed'],
    datasets: [{
      label: 'Deals',
      data: [12, 8, 6, 4, 15],
      backgroundColor: [
        '#3b82f6',
        '#10b981', 
        '#f59e0b',
        '#ef4444',
        '#8b5cf6'
      ],
      borderWidth: 0
    }]
  };

  // Top customers data
  const customersData = {
    labels: ['Acme Corp', 'Tech Solutions', 'Global Industries', 'Startup Inc', 'Enterprise Ltd'],
    datasets: [{
      label: 'Revenue',
      data: [12500, 8750, 15600, 4200, 28900],
      backgroundColor: '#ff6b00',
      borderWidth: 0
    }]
  };


  const tableColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'date', label: 'Date', sortable: true }
  ];

  const tableData = [
    {
      id: '001',
      name: 'John Doe',
      status: 'Active',
      date: '2024-01-15'
    },
    {
      id: '002',
      name: 'Jane Smith',
      status: 'Pending',
      date: '2024-01-14'
    },
    {
      id: '003',
      name: 'Bob Johnson',
      status: 'Completed',
      date: '2024-01-13'
    },
    {
      id: '004',
      name: 'Alice Brown',
      status: 'Active',
      date: '2024-01-12'
    },
    {
      id: '005',
      name: 'Charlie Wilson',
      status: 'Cancelled',
      date: '2024-01-11'
    },
    {
      id: '006',
      name: 'Diana Lee',
      status: 'Pending',
      date: '2024-01-10'
    },
    {
      id: '007',
      name: 'Eva Garcia',
      status: 'Completed',
      date: '2024-01-09'
    }
  ];

  const countryOptions = [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'au', label: 'Australia' }
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  // Sales Pipeline Data
  const pipelineStages = [
    {
      id: "lead",
      name: "Lead",
      color: "#3b82f6",
      deals: [
        {
          id: "1",
          title: "Website Redesign",
          customer: "Acme Corp",
          value: 5000,
          stage: "lead",
          probability: 20,
          createdDate: "2024-01-15"
        },
        {
          id: "2",
          title: "Mobile App Development",
          customer: "Tech Solutions",
          value: 15000,
          stage: "lead",
          probability: 15,
          createdDate: "2024-01-14"
        }
      ]
    },
    {
      id: "qualified",
      name: "Qualified",
      color: "#10b981",
      deals: [
        {
          id: "3",
          title: "E-commerce Platform",
          customer: "Global Industries",
          value: 25000,
          stage: "qualified",
          probability: 40,
          createdDate: "2024-01-13"
        }
      ]
    },
    {
      id: "proposal",
      name: "Proposal",
      color: "#f59e0b",
      deals: [
        {
          id: "4",
          title: "CRM Integration",
          customer: "Startup Inc",
          value: 8000,
          stage: "proposal",
          probability: 60,
          createdDate: "2024-01-12"
        }
      ]
    },
    {
      id: "negotiation",
      name: "Negotiation",
      color: "#ef4444",
      deals: [
        {
          id: "5",
          title: "Cloud Migration",
          customer: "Enterprise Ltd",
          value: 35000,
          stage: "negotiation",
          probability: 80,
          createdDate: "2024-01-11"
        }
      ]
    },
    {
      id: "closed",
      name: "Closed Won",
      color: "#8b5cf6",
      deals: [
        {
          id: "6",
          title: "Data Analytics Dashboard",
          customer: "Finance Corp",
          value: 12000,
          stage: "closed",
          probability: 100,
          createdDate: "2024-01-10"
        }
      ]
    }
  ];

  // Customer Data
  const customers = [
    {
      id: "1",
      name: "John Smith",
      email: "john@acmecorp.com",
      phone: "+1 (555) 123-4567",
      company: "Acme Corp",
      totalSpent: 12500,
      lastOrderDate: "2024-01-15",
      status: "active" as const
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah@techsolutions.com",
      phone: "+1 (555) 234-5678",
      company: "Tech Solutions",
      totalSpent: 8750,
      lastOrderDate: "2024-01-14",
      status: "active" as const
    },
    {
      id: "3",
      name: "Mike Chen",
      email: "mike@globalindustries.com",
      company: "Global Industries",
      totalSpent: 15600,
      lastOrderDate: "2024-01-13",
      status: "active" as const
    },
    {
      id: "4",
      name: "Emily Davis",
      email: "emily@startupinc.com",
      phone: "+1 (555) 456-7890",
      company: "Startup Inc",
      totalSpent: 4200,
      lastOrderDate: "2024-01-12",
      status: "inactive" as const
    },
    {
      id: "5",
      name: "David Wilson",
      email: "david@enterpriseltd.com",
      company: "Enterprise Ltd",
      totalSpent: 28900,
      lastOrderDate: "2024-01-11",
      status: "active" as const
    }
  ];

  // Invoice Data
  const invoices = [
    {
      id: "1",
      number: "INV-001",
      customer: "Acme Corp",
      amount: 5000,
      status: "paid" as const,
      dueDate: "2024-01-20",
      createdDate: "2024-01-15"
    },
    {
      id: "2",
      number: "INV-002",
      customer: "Tech Solutions",
      amount: 8750,
      status: "sent" as const,
      dueDate: "2024-01-25",
      createdDate: "2024-01-14"
    },
    {
      id: "3",
      number: "INV-003",
      customer: "Global Industries",
      amount: 15600,
      status: "overdue" as const,
      dueDate: "2024-01-10",
      createdDate: "2024-01-13"
    },
    {
      id: "4",
      number: "INV-004",
      customer: "Startup Inc",
      amount: 4200,
      status: "draft" as const,
      dueDate: "2024-01-30",
      createdDate: "2024-01-12"
    },
    {
      id: "5",
      number: "INV-005",
      customer: "Enterprise Ltd",
      amount: 28900,
      status: "paid" as const,
      dueDate: "2024-01-15",
      createdDate: "2024-01-11"
    }
  ];

  // Product Data
  const products = [
    {
      id: "1",
      name: "Website Design Package",
      description: "Complete website design and development service",
      price: 2500,
      category: "Web Development",
      sku: "WEB-001",
      stock: 10,
      status: "active" as const
    },
    {
      id: "2",
      name: "Mobile App Development",
      description: "iOS and Android app development",
      price: 15000,
      category: "Mobile Development",
      sku: "MOB-001",
      stock: 5,
      status: "active" as const
    },
    {
      id: "3",
      name: "E-commerce Platform",
      description: "Full-featured online store solution",
      price: 8000,
      category: "E-commerce",
      sku: "ECO-001",
      stock: 3,
      status: "active" as const
    },
    {
      id: "4",
      name: "CRM Integration",
      description: "Customer relationship management system",
      price: 3500,
      category: "Business Software",
      sku: "CRM-001",
      stock: 0,
      status: "inactive" as const
    },
    {
      id: "5",
      name: "Cloud Migration Service",
      description: "Migrate your infrastructure to the cloud",
      price: 12000,
      category: "Cloud Services",
      sku: "CLD-001",
      stock: 8,
      status: "active" as const
    },
    {
      id: "6",
      name: "Data Analytics Dashboard",
      description: "Business intelligence and reporting tools",
      price: 6000,
      category: "Analytics",
      sku: "ANA-001",
      stock: 2,
      status: "active" as const
    }
  ];

  // Sample receipt data
  const receiptData = {
    receiptNumber: "RCP-001",
    date: "2024-01-15",
    time: "2:30 PM",
    company: {
      name: "TopNotch Electronics",
      address: "123 Business St",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
      phone: "+1 (555) 123-4567",
      email: "info@topnotch.com",
      logo: "/Assets/topnotch-logo-light.png"
    },
    customer: {
      name: "John Smith",
      email: "john@example.com",
      phone: "+1 (555) 987-6543"
    },
    items: [
      { id: "1", description: "Website Development", quantity: 1, rate: 5000, amount: 5000 }
    ],
    paymentMethod: "Credit Card",
    taxRate: 8.5,
    discount: 0
  };



  return (
    <DashboardLayout
      sidebar={<DashboardSidebar active={active} onSelect={handleSidebarSelect} />}
      header={
        <DashboardHeader
          title="UI Components Test"
          onMenuClick={handleMenuClick}
          actions={headerActions}
        />
      }
      mobileDrawer={
        <MobileDrawer id="dashboard-drawer" title="Navigation">
          <DashboardSidebar 
            active={active} 
            onSelect={handleSidebarSelectMobile} 
            drawer 
          />
        </MobileDrawer>
      }
    >
      <div className="space-y-12">
        {/* Core UI Components */}
        <div className="space-y-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            UI Components Test
          </h1>
          
          {/* Buttons Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Buttons
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="link">Link</Button>
              <Button variant="default" size="sm">Small</Button>
              <Button variant="default" size="lg">Large</Button>
              <Button variant="ghost" size="icon">
                <UserIcon className="h-4 w-4" />
              </Button>
            </div>
          </section>

          {/* KPI Cards Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              KPI Cards
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Revenue" 
                value="$45,231.89" 
                trend={{ value: 20.1, isPositive: true }}
              />
              <KPICard
                title="Active Users" 
                value="1,234" 
                trend={{ value: 12.5, isPositive: true }}
              />
              <KPICard
                title="Conversion Rate" 
                value="68%" 
                trend={{ value: 3.1, isPositive: false }}
              />
              <KPICard
                title="Avg Order Value" 
                value="$156" 
                trend={{ value: 8.2, isPositive: true }}
              />
            </div>
          </section>

          {/* Charts Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Charts
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Order Status">
                <div className="h-48">
                  <Doughnut
                    data={{
                      labels: ['Completed','Pending','Cancelled'],
                      datasets: [{
                        data: [orderStatus.completed, orderStatus.pending, orderStatus.cancelled],
                        backgroundColor: ['#ff6b00', 'rgba(127,127,127,0.35)', 'rgba(127,127,127,0.2)'],
                        borderWidth: 0,
                      }]
                    }}
                    options={{ ...doughnutOptions, cutout: '70%' }}
                  />
                </div>
              </ChartCard>
              <ChartCard title="Revenue Trend">
                <div className="h-48">
                  <Line data={revenueData} options={lineOptions} />
                </div>
              </ChartCard>
            </div>
          </section>

          {/* List and Table Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Lists & Tables
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PaginatedTableCard 
                title="Recent Items" 
                columns={tableColumns}
                data={tableData}
                itemsPerPage={5}
              />
              <ChartCard title="Top Customers">
                <div className="h-48">
                  <Bar data={customersData} options={barOptions} />
                </div>
              </ChartCard>
            </div>
          </section>

          {/* Alert Components Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Alerts & Notifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Alert variant="success" title="Success" dismissible>
                Your changes have been saved successfully.
              </Alert>
              <Alert variant="warning" title="Warning">
                Please review your information before proceeding.
              </Alert>
              <Alert variant="error" title="Error" dismissible>
                There was an error processing your request.
              </Alert>
              <Alert variant="info" title="Information">
                The system will be updated tonight at 2 AM.
              </Alert>
            </div>
          </section>

          {/* Badge Components Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Badges & Status
            </h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="active" />
                <StatusBadge status="pending" />
                <StatusBadge status="completed" />
                <StatusBadge status="cancelled" />
                <StatusBadge status="draft" />
              </div>
            </div>
          </section>

          {/* Modal Components Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Modals & Dialogs
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowModal(true)}>
                Open Modal
              </Button>
              <Button variant="outline" onClick={() => setShowConfirm(true)}>
                Confirm Action
              </Button>
              <Button variant="outline" onClick={() => setShowToast(true)}>
                Show Toast
              </Button>
            </div>
          </section>

          {/* Tabs Components Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Tabs
            </h2>
            <Tabs
              tabs={[
                {
                  id: "overview",
                  label: "Overview",
                  content: (
                    <div className="space-y-4">
                      <p style={{ color: 'var(--muted-foreground)' }}>
                        This is the overview tab content. You can display charts, KPIs, and summary information here.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <KPICard title="Total Revenue" value="$45,231.89" />
                        <KPICard title="Active Users" value="1,234" />
                        <KPICard title="Conversion Rate" value="68%" />
                      </div>
                      <div className="mt-6">
                        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                          Sales Pipeline Distribution
                        </h4>
                        <div className="h-48">
                          <Bar data={pipelineData} options={barOptions} />
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: "details",
                  label: "Details",
                  content: (
                    <div>
                      <p style={{ color: 'var(--muted-foreground)' }}>
                        Detailed information goes here. This could include tables, lists, or detailed analytics.
                      </p>
                    </div>
                  )
                },
                {
                  id: "settings",
                  label: "Settings",
                  content: (
                    <div>
                      <p style={{ color: 'var(--muted-foreground)' }}>
                        Configuration and settings options would be displayed in this tab.
                      </p>
                    </div>
                  )
                }
              ]}
              variant="default"
            />
          </section>

          {/* Empty State Components Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Empty States
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EmptyState 
                title="No data found"
                description="Get started by adding your first item"
                action={<Button variant="default">Add Item</Button>}
              />
              <EmptyState 
                title="No results found"
                description="Try adjusting your search criteria"
                variant="search"
                action={<Button variant="outline">Clear Filters</Button>}
              />
            </div>
          </section>
        </div>

        {/* Sales Management Components Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
            Sales Management Components
          </h2>
          
          {/* Sales Dashboard - Full Width */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
              Sales Dashboard
            </h3>
            <SalesDashboard />
          </div>

          {/* Sales Pipeline - Responsive Grid */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
              Sales Pipeline
            </h3>
            <SalesPipeline 
              stages={pipelineStages}
              onAddDeal={(stageId) => console.log('Add deal to stage:', stageId)}
              onMoveDeal={(dealId, fromStage, toStage) => console.log('Move deal:', dealId, fromStage, toStage)}
            />
          </div>

          {/* Customer and Invoice Lists - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                Customer List
              </h3>
              <CustomerList 
                customers={customers}
                onSelectCustomer={(customer) => console.log('Selected customer:', customer)}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                Invoice List
              </h3>
              <InvoiceList 
                invoices={invoices}
                onSelectInvoice={(invoice) => console.log('Selected invoice:', invoice)}
              />
            </div>
          </div>

          {/* Product Catalog - Full Width */}
          <div>
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
              Product Catalog
            </h3>
            <ProductCatalog 
              products={products}
              onSelectProduct={(product) => console.log('Selected product:', product)}
            />
          </div>
        </section>

        {/* Invoice & Receipt Components Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
            Invoice & Receipt Components
          </h2>
          
          {/* Invoice Builder */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
              Invoice Builder
            </h3>
            <InvoiceBuilder 
              onSave={(data) => {
                setInvoiceData(data);
              }}
              onPreview={(data) => {
                setInvoiceData(data);
              }}
            />
          </div>

          {/* Invoice Preview */}
          {invoiceData && (
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
                Invoice Preview
              </h3>
              <InvoicePreview 
                data={invoiceData}
                onEdit={() => setInvoiceData(null)}
                onPrint={() => console.log('Print invoice')}
                onDownload={() => console.log('Download invoice')}
                onShare={() => console.log('Share invoice')}
              />
            </div>
          )}

          {/* Receipt Preview */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--foreground)' }}>
              Receipt Preview
            </h3>
            <div className="flex justify-center">
              <ReceiptPreview 
                data={receiptData}
                onPrint={() => console.log('Print receipt')}
                onDownload={() => console.log('Download receipt')}
                onShare={() => console.log('Share receipt')}
              />
            </div>
          </div>
        </section>

        {/* Form Components Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Form Components
          </h2>
          <FormCard title="Form Test" description="Testing all form components">
            <FormSection title="Basic Information" columns={2}>
              <Input
                label="Full Name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <Select
                label="Country"
                options={countryOptions}
                placeholder="Select country"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
              />
              <DatePicker
                label="Birth Date"
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              />
            </FormSection>

            <FormSection title="Preferences" columns={1}>
              <Textarea
                label="Message"
                placeholder="Enter your message"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                rows={4}
              />
              <Radio
                label="Gender"
                name="gender"
                options={genderOptions}
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
              />
            </FormSection>

            <FormSection title="Settings" columns={1}>
              <Checkbox
                label="Subscribe to newsletter"
                checked={formData.newsletter}
                onChange={(e) => setFormData({...formData, newsletter: e.target.checked})}
              />
              <Switch
                label="Enable notifications"
                checked={formData.notifications}
                onChange={(e) => setFormData({...formData, notifications: e.target.checked})}
              />
            </FormSection>

            <FormActions>
              <Button variant="outline">Cancel</Button>
              <Button variant="default">Save Changes</Button>
            </FormActions>
          </FormCard>
        </section>
      </div>

      {/* Modal Components */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="Sample Modal"
        size="md"
      >
        <div className="space-y-4">
          <p style={{ color: 'var(--muted-foreground)' }}>
            This is a sample modal dialog. You can use it for forms, confirmations, or displaying detailed information.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={() => setShowModal(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => console.log('Confirmed!')}
        title="Confirm Action"
        message="Are you sure you want to perform this action? This cannot be undone."
        confirmText="Yes, Continue"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Apple Style Toast */}
      {showToast && (
        <Toast
          variant="success"
          title="Success"
          onClose={() => setShowToast(false)}
          dismissible
        >
          Your action was completed successfully!
        </Toast>
      )}




    </DashboardLayout>
  );
}
