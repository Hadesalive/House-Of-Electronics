'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { FormSection } from '@/components/ui/forms';
import { Button, Alert, Toast } from '@/components/ui/core';
import { Input, Textarea, Select, Switch } from '@/components/ui/forms';
import { CompanySettings } from '@/lib/types/core';
import { settingsService } from '@/lib/services';

// Define preferences type
interface Preferences {
  autoSaveDrafts: boolean;
  confirmBeforeDelete: boolean;
  showAnimations: boolean;
  lowStockAlerts: boolean;
  defaultPaymentMethod: string;
  invoiceNumberFormat: string;
  receiptFooter: string;
  autoBackup: boolean;
  backupFrequency: string;
  showProductImages: boolean;
  defaultInvoiceStatus: string;
  receiptPaperSize: string;
  showTaxBreakdown: boolean;
  requireCustomerInfo: boolean;
  autoCalculateTax: boolean;
  defaultDiscountPercent: number;
  showProfitMargin: boolean;
  inventoryTracking: boolean;
  barcodeScanning: boolean;
  darkMode: boolean;
  language: string;
  dateFormat: string;
  timeFormat: string;
  currencyPosition: string;
  decimalPlaces: number;
  autoLogout: boolean;
  sessionTimeout: number;
  printReceipts: boolean;
  soundEffects: boolean;
}
import { 
  DocumentTextIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  BanknotesIcon,
  Squares2X2Icon as InventoryIcon,
  CurrencyDollarIcon,
  ComputerDesktopIcon,
  CloudIcon,
  WrenchScrewdriverIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

// Common currencies for business
const CURRENCIES = [
  { value: 'NLE', label: 'NLE - New Leones', symbol: 'NLe' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'CAD', label: 'CAD - Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'AUD - Australian Dollar', symbol: 'A$' },
  { value: 'JPY', label: 'JPY - Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'CHF - Swiss Franc', symbol: 'CHF' },
  { value: 'CNY', label: 'CNY - Chinese Yuan', symbol: '¥' },
  { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
  { value: 'BRL', label: 'BRL - Brazilian Real', symbol: 'R$' },
];


function SettingsContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 0.15,
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  // Get active menu from URL parameters
  const activeTab = searchParams.get('tab') || 'company';
  
  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({
    autoSaveDrafts: true,
    confirmBeforeDelete: true,
    showAnimations: true,
    lowStockAlerts: true,
    defaultPaymentMethod: 'cash',
    invoiceNumberFormat: 'INV-{YYYY}-{MM}-{####}',
    receiptFooter: 'Thank you for your business!',
    // New offline features
    autoBackup: true,
    backupFrequency: 'daily', // daily, weekly, monthly
    showProductImages: true,
    defaultInvoiceStatus: 'completed',
    receiptPaperSize: 'A4', // A4, Letter, Thermal
    showTaxBreakdown: true,
    requireCustomerInfo: false,
    autoCalculateTax: true,
    defaultDiscountPercent: 0,
    showProfitMargin: false,
    inventoryTracking: true,
    barcodeScanning: false,
    darkMode: false,
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h', // 12h, 24h
    currencyPosition: 'before', // before, after
    decimalPlaces: 2,
    autoLogout: false,
    sessionTimeout: 30, // minutes
    printReceipts: true,
    soundEffects: true
  });
  
  // Settings tabs configuration
  const settingsTabs = [
    { id: 'company', name: 'Company', icon: BuildingOffice2Icon, description: 'Company information and contact details' },
    { id: 'tax', name: 'Tax & Currency', icon: CreditCardIcon, description: 'Tax rates and currency settings' },
    { id: 'business', name: 'Business', icon: BanknotesIcon, description: 'Invoice, receipt, and business preferences' },
    { id: 'inventory', name: 'Inventory', icon: InventoryIcon, description: 'Product and stock management settings' },
    { id: 'sales', name: 'Sales', icon: CurrencyDollarIcon, description: 'Sales process and workflow preferences' },
    { id: 'display', name: 'Display', icon: ComputerDesktopIcon, description: 'UI appearance and data formatting' },
    { id: 'backup', name: 'Backup', icon: CloudIcon, description: 'Export and backup your data' },
    { id: 'preferences', name: 'Preferences', icon: WrenchScrewdriverIcon, description: 'Application preferences and settings' }
  ];

  const currentTab = settingsTabs.find(tab => tab.id === activeTab) || settingsTabs[0];

  const loadSettings = useCallback(async () => {
    try {
      const response = await settingsService.getCompanySettings();
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToastNotification('Failed to load settings', 'error');
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await settingsService.getPreferences();
      if (response.success && response.data) {
        setPreferences(response.data as Preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      showToastNotification('Failed to load preferences', 'error');
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadPreferences();
  }, [loadSettings, loadPreferences]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!settings.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    // Email validation
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Tax rate validation
    if (settings.taxRate < 0 || settings.taxRate > 1) {
      newErrors.taxRate = 'Tax rate must be between 0% and 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showToastNotification = (message: string, variant: 'success' | 'error') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
          return;
        }

        setLoading(true);
        
        try {
          // Save company settings and preferences
          const [settingsResponse, preferencesResponse] = await Promise.all([
            settingsService.updateCompanySettings(settings),
            settingsService.updatePreferences(preferences)
          ]);
          
          if (settingsResponse.success && preferencesResponse.success) {
            showToastNotification('Settings saved successfully!', 'success');
            // Update local state with the returned data
            if (settingsResponse.data) {
              setSettings(settingsResponse.data);
            }
            if (preferencesResponse.data) {
              setPreferences(preferencesResponse.data as Preferences);
            }
          } else {
            const errorMessage = settingsResponse.error || preferencesResponse.error || 'Failed to update settings. Please try again.';
            showToastNotification(errorMessage, 'error');
          }
        } catch (error) {
          console.error('Failed to update settings:', error);
          showToastNotification('Failed to update settings. Please try again.', 'error');
        } finally {
          setLoading(false);
        }
      };

  const updateField = (field: keyof CompanySettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const response = await settingsService.exportData();
      if (response.success) {
        const message = response.data?.path 
          ? `Data exported successfully to: ${response.data.path}`
          : 'Data exported successfully!';
        showToastNotification(message, 'success');
      } else {
        showToastNotification(response.error || 'Failed to export data', 'error');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      showToastNotification('Failed to export data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    setLoading(true);
    try {
      const response = await settingsService.importData();
      if (response.success) {
        showToastNotification('Data imported successfully! Settings have been updated.', 'success');
        // Reload settings and preferences after import
        await Promise.all([loadSettings(), loadPreferences()]);
      } else {
        showToastNotification(response.error || 'Failed to import data', 'error');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      showToastNotification('Failed to import data. Please check the file format and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const renderSubMenuContent = () => {
    switch (activeTab) {
      case 'company':
        return (
          <FormSection title="Company Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Company Name"
                value={settings.companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('companyName', e.target.value)}
                error={errors.companyName}
                required
                placeholder="Enter your company name"
              />
              <Input
                label="Email"
                type="email"
                value={settings.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('email', e.target.value)}
                error={errors.email}
                placeholder="company@example.com"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Input
                label="Phone"
                value={settings.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
              <Input
                label="Website"
                placeholder="https://yourcompany.com"
              />
            </div>
            <div className="mt-6">
              <Textarea
                label="Address"
                value={settings.address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('address', e.target.value)}
                placeholder="Enter your business address"
                rows={4}
              />
            </div>
          </FormSection>
        );

      case 'tax':
        return (
          <FormSection title="Tax & Currency Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Tax Rate (%)"
                type="number"
                value={settings.taxRate * 100}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('taxRate', parseFloat(e.target.value) / 100)}
                min="0"
                max="100"
                step="0.1"
                error={errors.taxRate}
                placeholder="15.0"
              />
              <Select
                label="Default Currency"
                value={settings.currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('currency', e.target.value)}
                options={CURRENCIES.map(currency => ({
                  value: currency.value,
                  label: currency.label
                }))}
              />
            </div>
            <div className="mt-6">
              <Alert variant="info" title="Tax Information">
                Tax rate will be applied to all sales unless overridden for specific items.
              </Alert>
            </div>
          </FormSection>
        );

      case 'backup':
        return (
          <FormSection title="Data Backup & Export">
            <div className="space-y-6">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  style={{ 
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--card)'
                  }}
                >
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Auto Backup
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Automatically backup data to local storage
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.autoBackup}
                    onChange={(e) => setPreferences(prev => ({ ...prev, autoBackup: e.target.checked }))}
                  />
                </div>
                {preferences.autoBackup && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Backup Frequency"
                      value={preferences.backupFrequency}
                      onChange={(e) => setPreferences(prev => ({ ...prev, backupFrequency: e.target.value }))}
                      options={[
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' }
                      ]}
                    />
                    <div 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      style={{ 
                        borderColor: 'var(--border)',
                        backgroundColor: 'var(--card)'
                      }}
                    >
                      <div>
                        <h3 
                          className="font-medium"
                          style={{ color: 'var(--foreground)' }}
                        >
                          Auto Logout
                        </h3>
                        <p 
                          className="text-sm"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          Automatically logout after inactivity
                        </p>
                      </div>
                      <Switch 
                        checked={preferences.autoLogout}
                        onChange={(e) => setPreferences(prev => ({ ...prev, autoLogout: e.target.checked }))}
                      />
                    </div>
                  </div>
                )}
                {preferences.autoLogout && (
                  <Input
                    label="Session Timeout (minutes)"
                    type="number"
                    value={preferences.sessionTimeout}
                    onChange={(e) => setPreferences(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 30 }))}
                    min="5"
                    max="480"
                    placeholder="30"
                  />
                )}
              </div>
            <div className="space-y-4">
                <h3 
                  className="font-medium"
                  style={{ color: 'var(--foreground)' }}
                >
                  Manual Backup & Export
                </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline"
                  onClick={handleExportData}
                  disabled={loading}
                    className="flex items-center justify-center gap-2"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  {loading ? 'Exporting...' : 'Export All Data'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleImportData}
                  disabled={loading}
                    className="flex items-center justify-center gap-2"
                >
                    <ArrowUpTrayIcon className="h-4 w-4" />
                  {loading ? 'Importing...' : 'Import Data'}
                </Button>
                </div>
                <Alert variant="info" title="Backup & Migration">
                  <div className="space-y-2">
                    <p>Export your complete data as a JSON file for backup or migration purposes.</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Includes all settings, preferences, and data</li>
                      <li>• Safe to store on external drives or cloud storage</li>
                      <li>• Can be imported on other installations</li>
                      <li>• All data remains stored locally on your device</li>
                    </ul>
                  </div>
                </Alert>
              </div>
            </div>
          </FormSection>
        );

      case 'business':
        return (
          <FormSection title="Business Settings">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Default Payment Method"
                  value={preferences.defaultPaymentMethod}
                  onChange={(e) => setPreferences(prev => ({ ...prev, defaultPaymentMethod: e.target.value }))}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
                <Input
                  label="Invoice Number Format"
                  value={preferences.invoiceNumberFormat}
                  onChange={(e) => setPreferences(prev => ({ ...prev, invoiceNumberFormat: e.target.value }))}
                  placeholder="INV-{YYYY}-{MM}-{####}"
                  helperText="Use {YYYY} for year, {MM} for month, {####} for sequential number"
                />
              </div>
              <div>
                <Textarea
                  label="Receipt Footer Message"
                  value={preferences.receiptFooter}
                  onChange={(e) => setPreferences(prev => ({ ...prev, receiptFooter: e.target.value }))}
                  placeholder="Thank you for your business!"
                  rows={3}
                  helperText="This message will appear at the bottom of receipts and invoices"
                />
              </div>
            </div>
          </FormSection>
        );

      case 'inventory':
        return (
          <FormSection title="Inventory Management">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Inventory Tracking
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Automatically track stock levels and updates
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.inventoryTracking}
                    onChange={(e) => setPreferences(prev => ({ ...prev, inventoryTracking: e.target.checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Show Product Images
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Display product images in inventory lists
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.showProductImages}
                    onChange={(e) => setPreferences(prev => ({ ...prev, showProductImages: e.target.checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Low Stock Alerts
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Show alerts when products are running low
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.lowStockAlerts}
                    onChange={(e) => setPreferences(prev => ({ ...prev, lowStockAlerts: e.target.checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Barcode Scanning
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Enable barcode scanning for products (requires camera)
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.barcodeScanning}
                    onChange={(e) => setPreferences(prev => ({ ...prev, barcodeScanning: e.target.checked }))}
                  />
                </div>
              </div>
            </div>
          </FormSection>
        );

      case 'sales':
        return (
          <FormSection title="Sales Process Settings">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Default Invoice Status"
                  value={preferences.defaultInvoiceStatus}
                  onChange={(e) => setPreferences(prev => ({ ...prev, defaultInvoiceStatus: e.target.value }))}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'refunded', label: 'Refunded' }
                  ]}
                />
                <Input
                  label="Default Discount (%)"
                  type="number"
                  value={preferences.defaultDiscountPercent}
                  onChange={(e) => setPreferences(prev => ({ ...prev, defaultDiscountPercent: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Auto-calculate Tax
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Automatically calculate tax on sales
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.autoCalculateTax}
                    onChange={(e) => setPreferences(prev => ({ ...prev, autoCalculateTax: e.target.checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Show Tax Breakdown
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Display detailed tax information on receipts
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.showTaxBreakdown}
                    onChange={(e) => setPreferences(prev => ({ ...prev, showTaxBreakdown: e.target.checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Show Profit Margin
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Display profit margin information
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.showProfitMargin}
                    onChange={(e) => setPreferences(prev => ({ ...prev, showProfitMargin: e.target.checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Require Customer Info
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Make customer information mandatory for sales
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.requireCustomerInfo}
                    onChange={(e) => setPreferences(prev => ({ ...prev, requireCustomerInfo: e.target.checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Print Receipts
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Automatically print receipts after sales
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.printReceipts}
                    onChange={(e) => setPreferences(prev => ({ ...prev, printReceipts: e.target.checked }))}
                  />
                </div>
              </div>
            </div>
          </FormSection>
        );

      case 'display':
        return (
          <FormSection title="Display & Formatting">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Date Format"
                  value={preferences.dateFormat}
                  onChange={(e) => setPreferences(prev => ({ ...prev, dateFormat: e.target.value }))}
                  options={[
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
                    { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' }
                  ]}
                />
                <Select
                  label="Time Format"
                  value={preferences.timeFormat}
                  onChange={(e) => setPreferences(prev => ({ ...prev, timeFormat: e.target.value }))}
                  options={[
                    { value: '12h', label: '12-hour (AM/PM)' },
                    { value: '24h', label: '24-hour' }
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Currency Position"
                  value={preferences.currencyPosition}
                  onChange={(e) => setPreferences(prev => ({ ...prev, currencyPosition: e.target.value }))}
                  options={[
                    { value: 'before', label: 'Before ($100)' },
                    { value: 'after', label: 'After (100$)' }
                  ]}
                />
                <Input
                  label="Decimal Places"
                  type="number"
                  value={preferences.decimalPlaces}
                  onChange={(e) => setPreferences(prev => ({ ...prev, decimalPlaces: parseInt(e.target.value) || 2 }))}
                  min="0"
                  max="4"
                  placeholder="2"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Receipt Paper Size"
                  value={preferences.receiptPaperSize}
                  onChange={(e) => setPreferences(prev => ({ ...prev, receiptPaperSize: e.target.value }))}
                  options={[
                    { value: 'A4', label: 'A4' },
                    { value: 'Letter', label: 'Letter' },
                    { value: 'Thermal', label: 'Thermal (80mm)' }
                  ]}
                />
                <Select
                  label="Language"
                  value={preferences.language}
                  onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'fr', label: 'Français' },
                    { value: 'de', label: 'Deutsch' }
                  ]}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Dark Mode
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Use dark theme interface
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.darkMode}
                    onChange={(e) => setPreferences(prev => ({ ...prev, darkMode: e.target.checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 
                      className="font-medium"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Sound Effects
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Play sounds for actions and notifications
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.soundEffects}
                    onChange={(e) => setPreferences(prev => ({ ...prev, soundEffects: e.target.checked }))}
                  />
                </div>
              </div>
            </div>
          </FormSection>
        );

      case 'preferences':
        return (
          <FormSection title="Application Preferences">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 
                    className="font-medium"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Auto-save drafts
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Automatically save form drafts as you type
                  </p>
                </div>
                <Switch 
                  checked={preferences.autoSaveDrafts}
                  onChange={(e) => setPreferences(prev => ({ ...prev, autoSaveDrafts: e.target.checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 
                    className="font-medium"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Confirm before deleting
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Ask for confirmation before deleting items
                  </p>
                </div>
                <Switch 
                  checked={preferences.confirmBeforeDelete}
                  onChange={(e) => setPreferences(prev => ({ ...prev, confirmBeforeDelete: e.target.checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 
                    className="font-medium"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Show animations
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Enable smooth animations and transitions
                  </p>
                </div>
                <Switch 
                  checked={preferences.showAnimations}
                  onChange={(e) => setPreferences(prev => ({ ...prev, showAnimations: e.target.checked }))}
                />
              </div>
            </div>
          </FormSection>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <DocumentTextIcon 
                className="h-12 w-12 mx-auto mb-4"
                style={{ color: 'var(--muted-foreground)' }}
              />
              <h3 
                className="text-lg font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Settings Coming Soon
              </h3>
              <p 
                className="text-sm"
                style={{ color: 'var(--muted-foreground)' }}
              >
                This section is under development.
              </p>
            </div>
          </div>
        );
    }
  };


  return (
    <AppLayout>
      {/* Toast Notification */}
      {showToast && (
        <Toast variant={toastVariant} title={toastMessage} onClose={() => setShowToast(false)}>
          {toastMessage}
        </Toast>
      )}

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 
            className="text-3xl font-bold"
            style={{ color: 'var(--foreground)' }}
          >
            Configuration
          </h1>
          <p 
            className="text-sm mt-2"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Customize your sales management experience with these powerful settings
          </p>
        </div>

        {/* Tab Navigation */}
        <div 
          className="border-b mb-6"
          style={{ borderColor: 'var(--border)' }}
        >
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => window.history.pushState({}, '', `/settings?tab=${tab.id}`)}
                  className={`flex items-center space-x-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{
                    color: isActive ? undefined : 'var(--muted-foreground)'
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div 
          className="rounded-lg border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          {/* Tab Header */}
          <div 
            className="px-6 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="p-2 rounded-lg"
                style={{ 
                  backgroundColor: activeTab === currentTab.id ? '#fed7aa' : 'var(--muted)'
                }}
              >
                <currentTab.icon 
                  className="h-6 w-6"
                  style={{ 
                    color: activeTab === currentTab.id ? '#ea580c' : 'var(--muted-foreground)'
                  }}
                />
              </div>
              <div>
                <h2 
                  className="text-xl font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  {currentTab.name}
                </h2>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {currentTab.description}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div 
            className="p-6 pt-4"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
            {renderSubMenuContent()}
            
              <div 
                className="flex justify-end pt-6 border-t"
                style={{ borderColor: 'var(--border)' }}
              >
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : 'Save Changes'}
              </Button>
              </div>
          </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}