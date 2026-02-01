'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button } from '@/components/ui/core';
import { FormCard, FormSection, FormActions } from '@/components/ui/forms';
import { Input, Textarea } from '@/components/ui/forms';
import { productService } from '@/lib/services';
import { Product } from '@/lib/types/core';
import { useRouter } from 'next/navigation';

export default function NewProductPage() {
  const router = useRouter();
  const [product, setProduct] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    sku: '',
    category: '',
    stock: 0,
    minStock: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product.name.trim()) {
      alert('Product name is required');
      return;
    }

    if (product.price <= 0) {
      alert('Product price must be greater than 0');
      return;
    }

    setLoading(true);
    
    try {
      const response = await productService.createProduct(product);
      
      if (response.success) {
        alert('Product created successfully!');
        router.push('/products');
      } else {
        alert(`Failed to create product: ${response.error}`);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof typeof product, value: string | number) => {
    setProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <FormCard title="New Product">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormSection title="Product Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Product Name *"
                  value={product.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
                <Input
                  label="SKU"
                  value={product.sku}
                  onChange={(e) => updateField('sku', e.target.value)}
                />
                <Input
                  label="Category"
                  value={product.category}
                  onChange={(e) => updateField('category', e.target.value)}
                />
                <Input
                  label="Price *"
                  type="number"
                  value={product.price}
                  onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Description"
                  value={product.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>
            </FormSection>

            <FormSection title="Inventory">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Cost"
                  type="number"
                  value={product.cost}
                  onChange={(e) => updateField('cost', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                <Input
                  label="Current Stock"
                  type="number"
                  value={product.stock}
                  onChange={(e) => updateField('stock', parseInt(e.target.value) || 0)}
                  min="0"
                />
                <Input
                  label="Minimum Stock"
                  type="number"
                  value={product.minStock}
                  onChange={(e) => updateField('minStock', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </FormSection>

            <FormActions>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Product'}
              </Button>
            </FormActions>
          </form>
        </FormCard>
      </div>
    </AppLayout>
  );
}
