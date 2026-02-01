import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Toast } from '@/components/ui/core';
import { Input, Textarea } from '@/components/ui/forms';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';
import { getCurrency, convertFromLeones } from '@/lib/utils/currency';
import { 
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface BOQItem {
  id: string;
  description: string;
  units: string;
  quantity: number;
  unitPriceLE: number;
  amountLE: number;
  amountUSD: number;
}

interface BOQFormData {
  boqNumber: string;
  date: string;
  projectTitle: string;
  company: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  };
  client: {
    name: string;
    address: string;
  };
  items: BOQItem[];
  notes: string[];
  managerSignature: string;
}

export default function BOQNewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { companySettings } = useSettings();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!id;
  
  // Editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Get exchange rate for USD conversion (1 USD = X LE)
  // Use the currency converter to get the rate, with fallback to 24 if USD not found
  const usdCurrency = getCurrency('USD');
  const usdRate = usdCurrency?.exchangeRate || 24;
  
  // Helper function to convert LE to USD with full precision
  // Using useCallback to avoid dependency issues
  const convertLEToUSD = React.useCallback((amountLE: number): number => {
    if (!usdRate || usdRate === 0) return 0;
    // Keep full precision during calculation, only round for display
    return amountLE / usdRate;
  }, [usdRate]);

  const [formData, setFormData] = useState<BOQFormData>({
    boqNumber: `027`,
    date: new Date().toISOString().split('T')[0],
    projectTitle: '',
    company: {
      name: companySettings?.companyName || 'House Of Electronics S/L LTD',
      address: companySettings?.address || '44A Banga Farm Junction, Waterloo',
      phone: companySettings?.phone || '077 588 528 / 079 088 995',
      email: companySettings?.email || '',
    },
    client: {
      name: '',
      address: '',
    },
    items: [],
    notes: [],
    managerSignature: '',
  });

  // Load existing BOQ data when editing
  useEffect(() => {
    const loadBOQ = async () => {
      if (!id || !isEditing) return;
      
      try {
        setLoading(true);
        
        if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
          const result = await window.electron.ipcRenderer.invoke('get-boq-by-id', id) as { 
            success: boolean; 
            data?: BOQFormData & { id: string }; 
            error?: string 
          };
          
          if (result.success && result.data) {
            const boqData = result.data;
            setFormData({
              boqNumber: boqData.boqNumber || '027',
              date: boqData.date || new Date().toISOString().split('T')[0],
              projectTitle: boqData.projectTitle || '',
              company: {
                name: boqData.company?.name || companySettings?.companyName || 'House Of Electronics S/L LTD',
                address: boqData.company?.address || companySettings?.address || '44A Banga Farm Junction, Waterloo',
                phone: boqData.company?.phone || companySettings?.phone || '077 588 528 / 079 088 995',
                email: boqData.company?.email || companySettings?.email || '',
              },
              client: {
                name: boqData.client?.name || '',
                address: boqData.client?.address || '',
              },
              items: boqData.items?.map(item => ({
                ...item,
                amountUSD: item.amountUSD || convertLEToUSD(item.amountLE || 0)
              })) || [],
              notes: boqData.notes || [],
              managerSignature: boqData.managerSignature || '',
            });
          } else {
            setToast({ message: result.error || 'Failed to load BOQ', type: 'error' });
            setTimeout(() => navigate('/boq'), 2000);
          }
        }
      } catch (error) {
        console.error('Failed to load BOQ:', error);
        setToast({ message: 'Failed to load BOQ', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadBOQ();
  }, [id, isEditing, navigate, companySettings, convertLEToUSD]);

  // Update company info when settings change (only if not editing)
  useEffect(() => {
    if (companySettings && !isEditing) {
      setFormData(prev => ({
        ...prev,
        company: {
          name: companySettings.companyName || prev.company.name,
          address: companySettings.address || prev.company.address,
          phone: companySettings.phone || prev.company.phone,
          email: companySettings.email || prev.company.email || '',
        }
      }));
    }
  }, [companySettings, isEditing]);

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const saveField = (field: string, value: string) => {
    const fieldPath = field.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < fieldPath.length - 1; i++) {
        current = current[fieldPath[i]] = { ...current[fieldPath[i]] };
      }
      
      current[fieldPath[fieldPath.length - 1]] = value;
      return newData;
    });
    
    setEditingField(null);
    setTempValue('');
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveField(field, tempValue);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const addItem = () => {
    const newItem: BOQItem = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      description: '',
      units: 'pcs',
      quantity: 1,
      unitPriceLE: 0,
      amountLE: 0,
      amountUSD: 0,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const updateItem = (itemId: string, field: keyof BOQItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          
          // Recalculate amounts when quantity or unitPrice changes
          if (field === 'quantity' || field === 'unitPriceLE') {
            updated.amountLE = updated.quantity * updated.unitPriceLE;
            // Use full precision for calculation, rounding only happens during display
            updated.amountUSD = convertLEToUSD(updated.amountLE);
          }
          
          return updated;
        }
        return item;
      })
    }));
  };

  const addNote = () => {
    setFormData(prev => ({
      ...prev,
      notes: [...prev.notes, '']
    }));
  };

  const removeNote = (index: number) => {
    setFormData(prev => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index)
    }));
  };

  const updateNote = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      notes: prev.notes.map((note, i) => i === index ? value : note)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.boqNumber.trim()) {
      setToast({ message: 'BOQ Number is required', type: 'error' });
      return false;
    }
    if (!formData.projectTitle.trim()) {
      setToast({ message: 'Project Title is required', type: 'error' });
      return false;
    }
    if (!formData.client.name.trim()) {
      setToast({ message: 'Client Name is required', type: 'error' });
      return false;
    }
    if (formData.items.length === 0) {
      setToast({ message: 'At least one item is required', type: 'error' });
      return false;
    }
    for (const item of formData.items) {
      if (!item.description.trim()) {
        setToast({ message: 'All items must have a description', type: 'error' });
        return false;
      }
      if (item.quantity <= 0) {
        setToast({ message: 'All items must have a quantity greater than 0', type: 'error' });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
        if (isEditing && id) {
          // Update existing BOQ - pass id and updates as separate arguments
          const result = await (window.electron.ipcRenderer.invoke as any)('update-boq', id, formData) as {
            success: boolean;
            data?: { id: string };
            error?: string;
          };

          if (result.success) {
            setToast({ message: 'BOQ updated successfully', type: 'success' });
            setTimeout(() => {
              navigate(`/boq/${id}`);
            }, 1000);
          } else {
            setToast({ message: result.error || 'Failed to update BOQ', type: 'error' });
          }
        } else {
          // Create new BOQ
          const result = await window.electron.ipcRenderer.invoke('create-boq', formData) as {
            success: boolean;
            data?: { id: string };
            error?: string;
          };

          if (result.success && result.data) {
            setToast({ message: 'BOQ created successfully', type: 'success' });
            setTimeout(() => {
              navigate(`/boq/${result.data?.id}`);
            }, 1000);
          } else {
            setToast({ message: result.error || 'Failed to create BOQ', type: 'error' });
          }
        }
      } else {
        setToast({ message: 'Unable to connect to database', type: 'error' });
      }
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} BOQ:`, error);
      setToast({ message: `Failed to ${isEditing ? 'update' : 'create'} BOQ`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const totalLE = formData.items.reduce((sum, item) => sum + item.amountLE, 0);
  const totalUSD = formData.items.reduce((sum, item) => sum + item.amountUSD, 0);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatUSD = (amount: number) => {
    // Round to 2 decimal places only for display, preserving precision in calculations
    // Use the same rounding method as currency converter for consistency
    return Math.round(amount * 100) / 100;
  };

  // Ensure at least 5 rows are visible (filled + empty)
  const visibleRows = Math.max(5, formData.items.length);
  const emptyRows = Math.max(0, visibleRows - formData.items.length);

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--muted-foreground)' }}>Loading BOQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("min-h-screen p-6")}
      style={{ 
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)'
      }}
    >
      {/* Header with Back and Save */}
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => navigate('/boq')}
          variant="ghost"
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2"
        >
          <CheckIcon className="w-5 h-5" />
          {loading ? 'Loading...' : saving ? 'Saving...' : isEditing ? 'Update BOQ' : 'Save BOQ'}
        </Button>
      </div>

      {/* BOQ Document - Matching Image Layout */}
      <div
        className="print-boq flex flex-col mx-auto bg-white"
        style={{
          width: 'min(210mm, 100%)',
          maxWidth: '100%',
          fontFamily: 'Arial, sans-serif',
          border: '1px solid #4b5563',
          borderLeft: '3px solid #4b5563',
          borderRight: '3px solid #4b5563',
          borderBottom: '3px solid #4b5563',
          boxSizing: 'border-box',
          position: 'relative',
          padding: '15mm',
          paddingTop: '10mm',
          paddingBottom: '15mm',
          minHeight: '297mm',
        }}
      >
        {/* Header Section - Logo and Company Info */}
        <div style={{ marginBottom: '15px' }}>
          {/* Logo Section - Centered */}
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <div 
              className="cursor-pointer hover:bg-gray-100 p-2 rounded"
              onClick={() => startEditing('company.logo', '')}
            >
              <div style={{ 
                display: 'inline-block', 
                marginBottom: '5px',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1e40af'
              }}>
                🏠 HOUSE OF ELECTRONICS
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '-5px' }}>-ELECTRONICS-</div>
            </div>
          </div>
          
          {/* Company Name - Centered, Dark Blue, Bold */}
          <div 
            className="cursor-pointer hover:bg-gray-100 p-1 rounded text-center"
            onClick={() => startEditing('company.name', formData.company.name)}
            style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: '#1e40af',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}
          >
            {editingField === 'company.name' ? (
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => saveField('company.name', tempValue)}
                onKeyDown={(e) => handleFieldKeyDown(e, 'company.name')}
                autoFocus
                className="text-center text-sm font-bold uppercase"
                style={{ color: '#1e40af' }}
              />
            ) : (
              formData.company.name
            )}
          </div>
          
          {/* Contact Information - Centered, Dark Blue */}
          <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#1e40af', marginBottom: '15px' }}>
            <div 
              className="cursor-pointer hover:bg-gray-100 p-1 rounded inline-block"
              onClick={() => startEditing('company.address', formData.company.address)}
            >
              {editingField === 'company.address' ? (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveField('company.address', tempValue)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'company.address')}
                  autoFocus
                  className="text-center text-xs"
                />
              ) : (
                <>Address: {formData.company.address}</>
              )}
            </div>
            <div 
              className="cursor-pointer hover:bg-gray-100 p-1 rounded inline-block ml-4"
              onClick={() => startEditing('company.phone', formData.company.phone)}
            >
              {editingField === 'company.phone' ? (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveField('company.phone', tempValue)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'company.phone')}
                  autoFocus
                  className="text-center text-xs"
                />
              ) : (
                <>Mobile: {formData.company.phone}</>
              )}
            </div>
            <div 
              className="cursor-pointer hover:bg-gray-100 p-1 rounded inline-block ml-4"
              onClick={() => startEditing('company.email', formData.company.email || '')}
            >
              {editingField === 'company.email' ? (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveField('company.email', tempValue)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'company.email')}
                  autoFocus
                  className="text-center text-xs"
                  placeholder="Email"
                />
              ) : (
                <>Email: {formData.company.email || 'Click to add email'}</>
              )}
            </div>
          </div>
          
          {/* Blue Horizontal Band */}
          <div style={{ 
            height: '4px', 
            backgroundColor: '#1e40af', 
            marginBottom: '15px',
            borderRadius: '2px'
          }}></div>
        </div>

        {/* Document Title Section */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Green "Bill of Quantities" Banner */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                backgroundColor: '#22c55e', 
                color: '#fff', 
                padding: '8px 20px', 
                fontSize: '18px', 
                fontWeight: 'bold',
                display: 'inline-block',
                marginBottom: '5px'
              }}>
                Bill of Quantities
              </div>
              {/* Project Title Below Banner */}
              <div 
                className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                onClick={() => startEditing('projectTitle', formData.projectTitle)}
                style={{ fontSize: '12px', color: '#000', marginTop: '5px' }}
              >
                {editingField === 'projectTitle' ? (
                  <Input
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={() => saveField('projectTitle', tempValue)}
                    onKeyDown={(e) => handleFieldKeyDown(e, 'projectTitle')}
                    autoFocus
                    placeholder="Project Title"
                  />
                ) : (
                  formData.projectTitle || <span style={{ color: '#9ca3af' }}>Click to add project title</span>
                )}
              </div>
            </div>
            
            {/* BOQ Number and Date - Right Side */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '5px' }}>
                <span style={{ 
                  backgroundColor: '#e5e7eb', 
                  padding: '4px 8px', 
                  fontSize: '11px', 
                  marginRight: '5px',
                  border: '1px solid #3b82f6',
                  borderRadius: '2px'
                }}>NO.:</span>
                <span 
                  className="cursor-pointer hover:bg-gray-100 p-1 rounded font-bold"
                  onClick={() => startEditing('boqNumber', formData.boqNumber)}
                  style={{ fontSize: '11px', fontWeight: 'bold' }}
                >
                  {editingField === 'boqNumber' ? (
                    <Input
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={() => saveField('boqNumber', tempValue)}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'boqNumber')}
                      autoFocus
                      className="text-xs font-bold inline-block w-16"
                    />
                  ) : (
                    formData.boqNumber
                  )}
                </span>
              </div>
              <div>
                <span style={{ 
                  backgroundColor: '#e5e7eb', 
                  padding: '4px 8px', 
                  fontSize: '11px', 
                  marginRight: '5px',
                  border: '1px solid #3b82f6',
                  borderRadius: '2px'
                }}>DATE:</span>
                <span 
                  className="cursor-pointer hover:bg-gray-100 p-1 rounded font-bold"
                  onClick={() => startEditing('date', formData.date)}
                  style={{ fontSize: '11px', fontWeight: 'bold' }}
                >
                  {editingField === 'date' ? (
                    <Input
                      type="date"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={() => saveField('date', tempValue)}
                      onKeyDown={(e) => handleFieldKeyDown(e, 'date')}
                      autoFocus
                      className="text-xs font-bold inline-block w-32"
                    />
                  ) : (
                    new Date(formData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Client Information Section */}
        <div style={{ marginBottom: '20px', fontSize: '12px' }}>
          <div style={{ marginBottom: '5px' }}>
            <strong>Name:</strong>{' '}
            <span 
              className="cursor-pointer hover:bg-gray-100 p-1 rounded inline-block"
              onClick={() => startEditing('client.name', formData.client.name)}
              style={{ textDecoration: 'underline', minWidth: '200px' }}
            >
              {editingField === 'client.name' ? (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveField('client.name', tempValue)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'client.name')}
                  autoFocus
                  placeholder="Client Name"
                  className="border-0 border-b-2 border-gray-400 focus:border-blue-500"
                />
              ) : (
                formData.client.name || <span style={{ color: '#9ca3af' }}>Click to add</span>
              )}
            </span>
          </div>
          <div>
            <strong>Address:</strong>{' '}
            <span 
              className="cursor-pointer hover:bg-gray-100 p-1 rounded inline-block"
              onClick={() => startEditing('client.address', formData.client.address)}
              style={{ textDecoration: 'underline', minWidth: '200px' }}
            >
              {editingField === 'client.address' ? (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveField('client.address', tempValue)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'client.address')}
                  autoFocus
                  placeholder="Client Address"
                  className="border-0 border-b-2 border-gray-400 focus:border-blue-500"
                />
              ) : (
                formData.client.address || <span style={{ color: '#9ca3af' }}>Click to add</span>
              )}
            </span>
          </div>
        </div>

        {/* Items Table Section */}
        <div style={{ marginBottom: '20px' }}>
          <div className="flex justify-between items-center mb-2">
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Items</div>
            <Button
              onClick={addItem}
              size="sm"
              className="flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Add Item
            </Button>
          </div>
          
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '11px',
            marginBottom: '10px'
          }}>
            {/* Table Header - Dark Grey Background */}
            <thead>
              <tr style={{ backgroundColor: '#4b5563', color: '#fff' }}>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>Description</th>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>Units</th>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>QTY</th>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}>Unit Price (LE)</th>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}>Amount (LE)</th>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'right',
                  fontWeight: 'bold',
                  backgroundColor: '#86efac'
                }}>Amount (USD)</th>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'center',
                  fontWeight: 'bold',
                  width: '50px'
                }}></th>
              </tr>
            </thead>
            <tbody>
              {/* Filled Item Rows */}
              {formData.items.map((item, index) => (
                <tr key={item.id} style={{ backgroundColor: '#fff' }}>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                      className="border-0 p-1 w-full"
                      style={{ backgroundColor: 'transparent', fontSize: '11px' }}
                    />
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    <Input
                      value={item.units}
                      onChange={(e) => updateItem(item.id, 'units', e.target.value)}
                      placeholder="pcs"
                      className="border-0 p-1 text-center w-16"
                      style={{ backgroundColor: 'transparent', fontSize: '11px' }}
                    />
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="border-0 p-1 text-center w-20"
                      style={{ backgroundColor: 'transparent', fontSize: '11px' }}
                    />
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPriceLE}
                      onChange={(e) => updateItem(item.id, 'unitPriceLE', parseFloat(e.target.value) || 0)}
                      className="border-0 p-1 text-right w-32"
                      style={{ backgroundColor: 'transparent', fontSize: '11px' }}
                    />
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(item.amountLE)}
                  </td>
                  <td style={{ 
                    border: '1px solid #000', 
                    padding: '8px', 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    backgroundColor: '#86efac'
                  }}>
                    {formatCurrency(item.amountUSD)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    <Button
                      onClick={() => removeItem(item.id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              
              {/* Empty Rows with Dashed Lines */}
              {Array.from({ length: emptyRows }).map((_, index) => (
                <tr key={`empty-${index}`} style={{ backgroundColor: '#fff' }}>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>
                    <div style={{ borderBottom: '1px dashed #9ca3af', minHeight: '20px' }}></div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#9ca3af' }}>---</div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#9ca3af' }}>---</div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                    <div style={{ color: '#9ca3af' }}>---</div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                    <div style={{ color: '#9ca3af' }}>-</div>
                  </td>
                  <td style={{ 
                    border: '1px solid #000', 
                    padding: '8px', 
                    textAlign: 'right',
                    backgroundColor: '#86efac'
                  }}>
                    <div style={{ color: '#9ca3af' }}>-</div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                </tr>
              ))}
              
              {/* Total Row - Yellow Background */}
              <tr style={{ backgroundColor: '#fef3c7', fontWeight: 'bold' }}>
                <td 
                  colSpan={4} 
                  style={{ 
                    border: '1px solid #000', 
                    padding: '8px',
                    textAlign: 'right'
                  }}
                >
                  TOTAL LE
                </td>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'right'
                }}>
                  {formatCurrency(totalLE)}
                </td>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'right',
                  backgroundColor: '#86efac'
                }}>
                  {formatUSD(totalUSD)}
                </td>
                <td style={{ border: '1px solid #000', padding: '8px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes Section */}
        <div style={{ marginBottom: '20px', fontSize: '11px' }}>
          <div className="flex justify-between items-center mb-2">
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>PLEASE NOTE:</div>
            <Button onClick={addNote} size="sm" className="flex items-center gap-1">
              <PlusIcon className="w-4 h-4" />
              Add Note
            </Button>
          </div>
          <ol style={{ marginLeft: '20px', paddingLeft: '0' }}>
            {formData.notes.map((note, index) => (
              <li key={index} style={{ marginBottom: '5px' }} className="flex items-start gap-2">
                <span style={{ marginRight: '8px' }}>{index + 1}.</span>
                <Textarea
                  value={note}
                  onChange={(e) => updateNote(index, e.target.value)}
                  placeholder={`Note ${index + 1}`}
                  rows={1}
                  className="flex-1 border-0 border-b border-gray-300 focus:border-blue-500"
                  style={{ fontSize: '11px', padding: '2px 4px' }}
                />
                <Button
                  onClick={() => removeNote(index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </li>
            ))}
            {formData.notes.length === 0 && (
              <li style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                Click "Add Note" to add warranty or service information
              </li>
            )}
          </ol>
        </div>

        {/* Manager Signature Section */}
        <div style={{ marginBottom: '20px', fontSize: '11px' }}>
          <div>
            <strong>Manager&apos;s Signature:</strong>{' '}
            <span 
              className="cursor-pointer hover:bg-gray-100 p-1 rounded inline-block"
              onClick={() => startEditing('managerSignature', formData.managerSignature)}
              style={{ 
                borderBottom: '1px solid #000', 
                display: 'inline-block', 
                minWidth: '200px',
                marginLeft: '10px'
              }}
            >
              {editingField === 'managerSignature' ? (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveField('managerSignature', tempValue)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'managerSignature')}
                  autoFocus
                  placeholder="Manager Name"
                  className="border-0 border-b-2 border-gray-400 focus:border-blue-500"
                />
              ) : (
                formData.managerSignature || <span style={{ color: '#9ca3af' }}>Click to add</span>
              )}
            </span>
          </div>
        </div>

        {/* Bottom Blue Horizontal Band */}
        <div style={{ 
          height: '4px', 
          backgroundColor: '#1e40af', 
          marginTop: '20px',
          borderRadius: '2px'
        }}></div>
      </div>

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
