'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { Product } from '@/lib/types/core';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CompactProductFormProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export function CompactProductForm({ 
  product, 
  isOpen, 
  onClose, 
  onSave
}: CompactProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    category: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price || 0,
        stock: product.stock || 0,
        category: product.category || '',
        description: product.description || '',
      });
    } else {
      setFormData({
        name: '',
        price: 0,
        stock: 0,
        category: '',
        description: '',
      });
    }
    setErrors({});
  }, [product, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (formData.price <= 0) {
      newErrors.price = 'Price must be > 0';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        price: formData.price,
        stock: formData.stock,
        category: formData.category.trim() || undefined,
        description: formData.description.trim() || undefined,
        isActive: true,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onClose}
    >
      <div 
        className="rounded-lg w-full max-w-sm border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              {product ? 'Edit Product' : 'New Product'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-0.5 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <Input
            label="Product Name *"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
            }}
            error={errors.name}
            placeholder="Product name"
            className="text-xs"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Price *"
              type="number"
              step="0.01"
              value={formData.price || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setFormData(prev => ({ ...prev, price: val }));
                if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
              }}
              error={errors.price}
              placeholder="0.00"
              className="text-xs"
            />
            <Input
              label="Stock *"
              type="number"
              value={formData.stock || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setFormData(prev => ({ ...prev, stock: val }));
                if (errors.stock) setErrors(prev => ({ ...prev, stock: '' }));
              }}
              error={errors.stock}
              placeholder="0"
              className="text-xs"
            />
          </div>
          
          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="Category (optional)"
            className="text-xs"
          />
          
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Description (optional)"
            className="text-xs"
          />

          {/* Minimal Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 text-xs py-1.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 text-xs py-1.5"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast, white)'
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

