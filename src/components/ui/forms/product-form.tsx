'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/core';
import { Input, Textarea, Switch } from '@/components/ui/forms';
import { FormSection } from '@/components/ui/forms';
import { Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { productService } from '@/lib/services';
import { XMarkIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ProductFormProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  title?: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  cost?: number; // Optional cost
  brand: string;
  category: string;
  stock: number;
  minStock: number;
  isActive: boolean;
}

export function ProductForm({ 
  product, 
  isOpen, 
  onClose, 
  onSave, 
  title = "Add Product" 
}: ProductFormProps) {
  const { formatCurrency } = useSettings();
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    cost: undefined as any, // Allow undefined for optional cost
    brand: '',
    category: '',
    stock: 0,
    minStock: 0,
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Brand management
  const [brands, setBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  // Category management
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Load existing brands and categories from products
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await productService.getAllProducts();
        if (response.success && response.data) {
          const uniqueBrands = Array.from(
            new Set(
              response.data
                .map(p => p.brand)
                .filter((b): b is string => Boolean(b?.trim()))
            )
          ).sort();
          setBrands(uniqueBrands);

          const uniqueCategories = Array.from(
            new Set(
              response.data
                .map(p => p.category)
                .filter((cat): cat is string => Boolean(cat?.trim()))
            )
          ).sort();
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  // Update brand/category inputs when formData changes
  useEffect(() => {
    setBrandInput(formData.brand || '');
  }, [formData.brand]);

  useEffect(() => {
    setCategoryInput(formData.category || '');
  }, [formData.category]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showBrandDropdown || showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBrandDropdown, showCategoryDropdown]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost !== undefined && product.cost !== null ? product.cost : undefined as any,
        brand: product.brand || '',
        category: product.category || '',
        stock: product.stock || 0,
        minStock: product.minStock || 0,
        isActive: product.isActive !== false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        cost: undefined as any,
        brand: '',
        category: '',
        stock: 0,
        minStock: 0,
        isActive: true
      });
    }
    setErrors({});
  }, [product, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }

    if (formData.minStock < 0) {
      newErrors.minStock = 'Minimum stock cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: formData.price,
        cost: formData.cost !== undefined && formData.cost !== null ? formData.cost : undefined,
        brand: formData.brand.trim() || undefined,
        category: formData.category.trim() || undefined,
        stock: formData.stock,
        minStock: formData.minStock || undefined,
        isActive: formData.isActive,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/20 dark:bg-black/20 flex items-center justify-center p-4 z-50">
      <div 
        className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
            {title}
          </h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-2"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Product Information - Simplified */}
            <FormSection title="Product Details">
              <div className="space-y-4">
                <Input
                  label="What is this product called? *"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  placeholder="Example: Samsung Galaxy Phone"
                  required
                />
                
                <Textarea
                  label="Tell us about this product (optional)"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this product is or does..."
                  rows={3}
                />

                {/* Brand field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium block" style={{ color: 'var(--foreground)' }}>
                    Brand (optional)
                  </label>
                  <div className="relative" ref={brandRef}>
                    <div className="relative">
                      <Input
                        value={brandInput}
                        onChange={(e) => {
                          setBrandInput(e.target.value);
                          handleInputChange('brand', e.target.value);
                          setShowBrandDropdown(true);
                        }}
                        onFocus={() => setShowBrandDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (brandInput.trim()) {
                              handleInputChange('brand', brandInput.trim());
                              setShowBrandDropdown(false);
                            }
                          } else if (e.key === 'Escape') {
                            setShowBrandDropdown(false);
                          }
                        }}
                        placeholder="e.g. Apple, Samsung, TP-Link..."
                      />
                      {brandInput && (
                        <button
                          type="button"
                          onClick={() => { setBrandInput(''); handleInputChange('brand', ''); setShowBrandDropdown(false); }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {showBrandDropdown && (
                      <div
                        className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-48 overflow-y-auto"
                        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                      >
                        {brands.filter(b => b.toLowerCase().includes(brandInput.toLowerCase())).map(brand => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => { setBrandInput(brand); handleInputChange('brand', brand); setShowBrandDropdown(false); }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <span>{brand}</span>
                            {brandInput === brand && <CheckIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />}
                          </button>
                        ))}
                        {brandInput && !brands.some(b => b.toLowerCase() === brandInput.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => { handleInputChange('brand', brandInput.trim()); setShowBrandDropdown(false); }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 border-t"
                            style={{ color: 'var(--accent)', borderColor: 'var(--border)' }}
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>Use "{brandInput.trim()}"</span>
                          </button>
                        )}
                        {brands.length === 0 && !brandInput && (
                          <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                            No brands yet. Type to add one.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium block"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Category (optional)
                  </label>
                  <div className="relative" ref={categoryRef}>
                    <div className="relative">
                      <Input
                        value={categoryInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCategoryInput(value);
                          handleInputChange('category', value);
                          setShowCategoryDropdown(true);
                        }}
                        onFocus={() => setShowCategoryDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (categoryInput.trim()) {
                              handleInputChange('category', categoryInput.trim());
                              setShowCategoryDropdown(false);
                            }
                          } else if (e.key === 'Escape') {
                            setShowCategoryDropdown(false);
                          }
                        }}
                        placeholder="Select or type a new category..."
                      />
                      {categoryInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryInput('');
                            handleInputChange('category', '');
                            setShowCategoryDropdown(false);
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {showCategoryDropdown && (
                      <div 
                        className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto"
                        style={{ 
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)'
                        }}
                      >
                        {/* Filtered categories */}
                        {categories
                          .filter(cat => 
                            cat.toLowerCase().includes(categoryInput.toLowerCase())
                          )
                          .map(category => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                setCategoryInput(category);
                                handleInputChange('category', category);
                                setShowCategoryDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                              style={{ color: 'var(--foreground)' }}
                            >
                              <span>{category}</span>
                              {categoryInput === category && (
                                <CheckIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                              )}
                            </button>
                          ))}
                        
                        {/* Create new category option */}
                        {categoryInput && 
                         !categories.some(cat => cat.toLowerCase() === categoryInput.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => {
                              handleInputChange('category', categoryInput.trim());
                              setShowCategoryDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 border-t"
                            style={{ 
                              color: 'var(--accent)',
                              borderColor: 'var(--border)'
                            }}
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>Create "{categoryInput.trim()}"</span>
                          </button>
                        )}
                        
                        {/* Empty state */}
                        {categories.length === 0 && !categoryInput && (
                          <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                            No categories yet. Type to create one.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    Select an existing category or type to create a new one
                  </p>
                </div>
              </div>
            </FormSection>

            {/* Pricing */}
            <FormSection title="Pricing">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="How much will you sell it for? *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ''}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  error={errors.price}
                  placeholder="0.00"
                  required
                />

                <Input
                  label="How much did it cost you? (optional)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost !== undefined && formData.cost !== null ? formData.cost : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // If empty string, set to undefined (not set)
                    // If valid number, parse it (including 0)
                    if (value === '' || value === null || value === undefined) {
                      handleInputChange('cost', undefined as any);
                    } else {
                      const numValue = parseFloat(value);
                      handleInputChange('cost', isNaN(numValue) ? undefined as any : numValue);
                    }
                  }}
                  placeholder="Leave empty if unknown"
                />
              </div>

              {/* Profit Margin Display - Simplified */}
              {formData.price > 0 && formData.cost !== undefined && formData.cost !== null && formData.cost >= 0 && (
                <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      Profit per item:
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(formData.price - formData.cost)}
                    </span>
                  </div>
                </div>
              )}
            </FormSection>

            {/* Inventory */}
            <FormSection title="Stock & Inventory">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="How many do you have right now? *"
                  type="number"
                  min="0"
                  value={formData.stock || ''}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  error={errors.stock}
                  placeholder="0"
                  required
                />

                <Input
                  label="When should we warn you to order more? (optional)"
                  type="number"
                  min="0"
                  value={formData.minStock || ''}
                  onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                  error={errors.minStock}
                  placeholder="Example: 5"
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                We'll alert you when stock gets low.
              </p>
            </FormSection>

            {/* Status - Hidden by default to keep it simple, only shows when editing */}
            {product && (
              <FormSection title="Product Status">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  />
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {formData.isActive ? 'Product is Active' : 'Product is Inactive'}
                    </label>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {formData.isActive 
                        ? 'This product will appear in your product list'
                        : 'This product will be hidden from your product list'
                      }
                    </p>
                  </div>
                </div>
              </FormSection>
            )}

            {/* Product Info (for editing) */}
            {product && (
              <FormSection title="Product Information">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Product ID:</span>
                    <p style={{ color: 'var(--muted-foreground)' }}>{product.id}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Created:</span>
                    <p style={{ color: 'var(--muted-foreground)' }}>{new Date(product.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Last Updated:</span>
                    <p style={{ color: 'var(--muted-foreground)' }}>{new Date(product.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </FormSection>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  {product ? 'Update Product' : 'Add Product'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
