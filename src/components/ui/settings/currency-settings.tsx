import React, { useState, useEffect } from 'react';
import { Currency, DEFAULT_CURRENCIES, currencyConverter } from '../../../lib/utils/currency';
import { settingsService } from '../../../lib/services';
import { Button } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { PencilIcon, TrashIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CurrencySettingsProps {
  onSave?: (currencies: Currency[]) => void;
  className?: string;
}

export function CurrencySettings({ onSave, className = "" }: CurrencySettingsProps) {
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCurrency, setNewCurrency] = useState<Partial<Currency>>({
    code: '',
    name: '',
    symbol: '',
    exchangeRate: 0,
    isDefault: false
  });

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      // Try to load from preferences
      const response = await settingsService.getPreferences();
      if (response.success && response.data) {
        const prefs = response.data as any;
        if (prefs.currencyExchangeRates && Array.isArray(prefs.currencyExchangeRates)) {
          setCurrencies(prefs.currencyExchangeRates);
          // Set all currencies in the global currency converter
          currencyConverter.setCurrencies(prefs.currencyExchangeRates);
          return;
        }
      }
      // Fallback to defaults
      setCurrencies(DEFAULT_CURRENCIES);
    } catch (error) {
      console.error('Failed to load currencies:', error);
      setCurrencies(DEFAULT_CURRENCIES);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCurrency = (currency: Currency) => {
    setEditingCurrency({ ...currency });
  };

  const handleSaveEdit = () => {
    if (!editingCurrency) return;

    setCurrencies(prev => 
      prev.map(c => c.code === editingCurrency.code ? editingCurrency : c)
    );
    setEditingCurrency(null);
  };

  const handleCancelEdit = () => {
    setEditingCurrency(null);
  };

  const handleAddCurrency = () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol || !newCurrency.exchangeRate) {
      alert('Please fill in all fields');
      return;
    }

    if (currencies.find(c => c.code === newCurrency.code)) {
      alert('Currency code already exists');
      return;
    }

    const currency: Currency = {
      code: newCurrency.code!,
      name: newCurrency.name!,
      symbol: newCurrency.symbol!,
      exchangeRate: newCurrency.exchangeRate!,
      isDefault: false
    };

    setCurrencies(prev => [...prev, currency]);
    setNewCurrency({
      code: '',
      name: '',
      symbol: '',
      exchangeRate: 0,
      isDefault: false
    });
    setShowAddForm(false);
  };

  const handleRemoveCurrency = (currencyCode: string) => {
    if (currencyCode === 'NLe' || currencyCode === 'SLE') {
      alert('Cannot remove default currency (NLe)');
      return;
    }

    if (confirm('Are you sure you want to remove this currency?')) {
      setCurrencies(prev => prev.filter(c => c.code !== currencyCode));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      console.log('Saving currencies:', currencies);
      
      // Set all currencies in the global currency converter
      // This ensures new currencies are added and existing ones are updated
      currencyConverter.setCurrencies(currencies);
      
      // Save to database via preferences
      const response = await settingsService.updatePreferences({
        currencyExchangeRates: currencies
      });
      
      console.log('Save response:', response);
      
      if (response.success) {
        onSave?.(currencies);
        alert('Currency settings saved successfully!');
        // Reload currencies to ensure we have the latest from database
        await loadCurrencies();
      } else {
        console.error('Failed to save currencies:', response.error);
        alert('Failed to save currency settings: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save currencies:', error);
      alert('Failed to save currency settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--muted-foreground)' }}>Loading currencies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--foreground)' }}
        >
          Currency Exchange Rates
        </h3>
        <p 
          className="text-sm"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Manage exchange rates for different currencies. All amounts will be converted to New Leones (NLe) for storage and calculations.
        </p>
      </div>

      {/* Currency List */}
      <div 
        className="rounded-lg border"
        style={{ 
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}
      >
        <div 
          className="px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 
            className="text-base font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Exchange Rates
          </h3>
          <p 
            className="text-sm mt-1"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Set exchange rates relative to New Leones (NLe)
          </p>
        </div>
        
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {currencies.map((currency) => (
            <div 
              key={currency.code} 
              className="px-6 py-4 flex items-center justify-between hover:bg-opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--card)' }}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--accent)' }}
                  >
                    {currency.symbol}
                  </span>
                  <div>
                    <h4 
                      className="font-semibold"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {currency.name}
                    </h4>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {currency.code}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {editingCurrency?.code === currency.code ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      step="0.000001"
                      value={editingCurrency.exchangeRate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingCurrency({
                        ...editingCurrency,
                        exchangeRate: parseFloat(e.target.value) || 0
                      })}
                      className="w-32"
                      placeholder="Rate"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span 
                      className="text-sm"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      1 {currency.code} = {currency.exchangeRate} NLe
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCurrency(currency)}
                      className="flex items-center gap-1"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </Button>
                    {!currency.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveCurrency(currency.code)}
                        className="flex items-center gap-1"
                        style={{ 
                          color: 'var(--destructive)',
                          borderColor: 'var(--destructive)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--destructive)';
                          e.currentTarget.style.color = 'var(--destructive-foreground)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--destructive)';
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Currency */}
      {showAddForm ? (
        <div 
          className="rounded-lg border p-6"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <h3 
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--foreground)' }}
          >
            Add New Currency
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Currency Code"
              value={newCurrency.code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
              placeholder="e.g., USD, EUR, GBP"
            />
            
            <Input
              label="Currency Name"
              value={newCurrency.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCurrency({ ...newCurrency, name: e.target.value })}
              placeholder="e.g., US Dollar, Euro"
            />
            
            <Input
              label="Symbol"
              value={newCurrency.symbol}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
              placeholder="e.g., $, €, £"
            />
            
            <Input
              label="Exchange Rate (to NLe)"
              type="number"
              step="0.000001"
              value={newCurrency.exchangeRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCurrency({ ...newCurrency, exchangeRate: parseFloat(e.target.value) || 0 })}
              placeholder="e.g., 24 (1 USD = 24 NLe)"
            />
          </div>
          
          <div className="flex justify-end space-x-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleAddCurrency}
            >
              Add Currency
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add New Currency
          </Button>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button
          variant="default"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            'Save Currency Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
