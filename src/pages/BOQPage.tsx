import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginatedTableCard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select } from '@/components/ui/forms';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface BOQ {
  id: string;
  boqNumber: string;
  date: string;
  projectTitle: string;
  clientName: string;
  clientAddress: string;
  totalLE: number;
  totalUSD: number;
  createdAt: string;
  updatedAt: string;
}

export default function BOQPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  
  const [boqs, setBoqs] = useState<BOQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'boqNumber' | 'totalLE' | 'clientName'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load BOQs using Electron IPC
  useEffect(() => {
    const loadBOQs = async () => {
      try {
        setLoading(true);
        
        if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
          const result = await window.electron.ipcRenderer.invoke('get-boqs') as { 
            success: boolean; 
            data?: BOQ[]; 
            error?: string 
          };
          
          if (result.success) {
            setBoqs(result.data || []);
          } else {
            setToast({ message: result.error || 'Failed to load BOQs', type: 'error' });
          }
        } else {
          setToast({ message: 'Unable to connect to database', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to load BOQs:', error);
        setToast({ message: 'Failed to load BOQs', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadBOQs();
  }, []);

  // Filter and sort BOQs
  const filteredAndSortedBOQs = React.useMemo(() => {
    const filtered = boqs.filter(boq => {
      const matchesSearch = !searchTerm || 
        boq.boqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        boq.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        boq.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
    
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'boqNumber':
          aValue = a.boqNumber;
          bValue = b.boqNumber;
          break;
        case 'totalLE':
          aValue = a.totalLE;
          bValue = b.totalLE;
          break;
        case 'clientName':
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [boqs, searchTerm, sortBy, sortOrder]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this BOQ?')) return;
    
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('delete-boq', id) as { 
          success: boolean; 
          error?: string 
        };
        
        if (result.success) {
          setBoqs(boqs.filter(boq => boq.id !== id));
          setToast({ message: 'BOQ deleted successfully', type: 'success' });
        } else {
          setToast({ message: result.error || 'Failed to delete BOQ', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Failed to delete BOQ:', error);
      setToast({ message: 'Failed to delete BOQ', type: 'error' });
    }
  };

  // Table configuration
  const tableColumns = [
    { key: 'boqNumber', label: 'BOQ Number', sortable: true, width: 'auto' },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'projectTitle', label: 'Project Title', sortable: true, width: 'auto' },
    { key: 'client', label: 'Client', sortable: true, width: '200px' },
    { key: 'totalLE', label: 'Total (LE)', sortable: true, width: '120px' },
    { key: 'totalUSD', label: 'Total (USD)', sortable: true, width: '120px' },
    { key: 'actions', label: 'Actions', sortable: false, width: '100px' }
  ];

  const tableData = filteredAndSortedBOQs.map(boq => ({
    boqNumber: (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span 
            className="font-mono text-sm font-medium cursor-pointer hover:underline transition-colors" 
            onClick={() => navigate(`/boq/${boq.id}`)}
            style={{ color: 'var(--accent)' }}
          >
            #{boq.boqNumber}
          </span>
        </div>
      </div>
    ),
    date: (
      <div className="space-y-1">
        <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {formatDate(boq.date)}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {new Date(boq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    ),
    projectTitle: (
      <div className="space-y-1">
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {boq.projectTitle || '—'}
        </div>
      </div>
    ),
    client: (
      <div className="space-y-1">
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {boq.clientName || '—'}
        </div>
        {boq.clientAddress && (
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {boq.clientAddress}
          </div>
        )}
      </div>
    ),
    totalLE: (
      <div className="text-right space-y-1">
        <div className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
          {formatCurrency(boq.totalLE)}
        </div>
      </div>
    ),
    totalUSD: (
      <div className="text-right space-y-1">
        <div className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
          ${boq.totalUSD.toFixed(2)}
        </div>
      </div>
    ),
    actions: (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/boq/${boq.id}`)}
          className="p-1 h-8 w-8 hover:bg-blue-50"
          title="View Details"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/boq/${boq.id}/edit`)}
          className="p-1 h-8 w-8 hover:bg-orange-50"
          title="Edit BOQ"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(boq.id)}
          className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Delete BOQ"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            BOQ
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Manage Bills of Quantities
          </p>
        </div>
        <Button
          onClick={() => navigate('/boq/new')}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          New BOQ
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" 
              style={{ color: 'var(--muted-foreground)' }}
            />
            <Input
              type="text"
              placeholder="Search by BOQ number, project title, or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              setSortBy(newSortBy as typeof sortBy);
              setSortOrder(newSortOrder as typeof sortOrder);
            }}
            options={[
              { value: 'date-desc', label: 'Date (Newest)' },
              { value: 'date-asc', label: 'Date (Oldest)' },
              { value: 'boqNumber-asc', label: 'BOQ Number (A-Z)' },
              { value: 'boqNumber-desc', label: 'BOQ Number (Z-A)' },
              { value: 'totalLE-desc', label: 'Total (High to Low)' },
              { value: 'totalLE-asc', label: 'Total (Low to High)' },
              { value: 'clientName-asc', label: 'Client (A-Z)' },
              { value: 'clientName-desc', label: 'Client (Z-A)' },
            ]}
            className="w-48"
          />
        </div>
      </div>

      {/* BOQs Table */}
      <PaginatedTableCard
        title="Bills of Quantities"
        columns={tableColumns}
        data={tableData}
        loading={loading}
        empty={tableData.length === 0}
        emptyTitle="No BOQs found"
        emptyDescription="Create your first BOQ to get started."
        itemsPerPage={10}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          title={toast.message}
          variant={toast.type}
          onClose={() => setToast(null)}
        >
          {toast.message}
        </Toast>
      )}
    </div>
  );
}
