/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button, Alert, Toast } from '@/components/ui/core';
import { KPICard } from '@/components/ui/dashboard';
import { ProductForm } from '@/components/ui/forms/product-form';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { productService } from '@/lib/services';
import { Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  TagIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface ProductDetails {
  product: Product;
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency, formatDate } = useSettings();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
  
  const productId = params.id as string;
  
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (productId) {
      loadProductDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await productService.getProductById(productId);
      
      if (response.success && response.data) {
        const details: ProductDetails = {
          product: response.data
        };
        
        setProductDetails(details);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      console.error('Failed to load product details:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await productService.updateProduct(productId, productData);

      if (response.success) {
        setToast({ message: 'Product updated successfully!', type: 'success' });
        setShowEditForm(false);
        loadProductDetails();
      } else {
        setToast({ message: response.error || 'Failed to update product', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      setToast({ message: 'Failed to update product', type: 'error' });
    }
  };

  const handleDeleteProduct = () => {
    if (!productDetails?.product) return;

    confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${productDetails.product.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        const response = await productService.deleteProduct(productId);
        if (response.success) {
          setToast({ message: 'Product deleted successfully', type: 'success' });
          setTimeout(() => {
            router.push('/products');
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to delete product:', error);
        setToast({ message: 'Failed to delete product', type: 'error' });
      }
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading product details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !productDetails) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Alert variant="error" title="Error">
              {error || 'Product not found'}
            </Alert>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { product } = productDetails;
  const isLowStock = product.minStock && product.stock <= product.minStock;
  const profitMargin = product.cost ? product.price - product.cost : 0;
  const profitMarginPercent = product.cost ? ((profitMargin / product.price) * 100).toFixed(1) : 0;
  const totalValue = product.price * product.stock;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/products')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Products
          </Button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditForm(true)}
              className="flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteProduct}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Hero Section - Product Info Banner */}
        <div 
          className="relative overflow-hidden rounded-xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10"></div>
          
          {/* Content */}
          <div className="relative p-8">
            <div className="flex items-center gap-6">
              {/* Product Image */}
              <div className="flex-shrink-0">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-24 w-24 rounded-xl object-cover border-4"
                    style={{ borderColor: 'var(--background)' }}
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-3xl font-bold">
                    {product.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                      {product.name}
                    </h1>
                    {product.description && (
                      <p className="text-base mb-3" style={{ color: 'var(--muted-foreground)' }}>
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <div className="flex items-center gap-1.5">
                    <TagIcon className="h-4 w-4" />
                    SKU: {product.sku || 'N/A'}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <CubeIcon className="h-4 w-4" />
                    {product.category || 'Uncategorized'}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4" />
                    Added {formatDate(product.createdAt)}
                  </div>
                  {isLowStock && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1.5 text-red-600 font-medium">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        Low Stock
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Selling Price" 
            value={formatCurrency(product.price)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Current Stock" 
            value={product.stock.toString()}
            icon={<CubeIcon className="h-6 w-6" style={{ color: isLowStock ? '#ef4444' : 'var(--accent)' }} />}
          />
          <KPICard 
            title="Total Value" 
            value={formatCurrency(totalValue)}
            icon={<ChartBarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Profit Margin" 
            value={product.cost ? `${profitMarginPercent}%` : 'N/A'}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
        </div>

        {/* Low Stock Alert */}
        {isLowStock && (
          <Alert variant="warning" title="Low Stock Alert">
            <p>
              This product is running low on stock ({product.stock} remaining). 
              Consider restocking to avoid stockouts.
            </p>
          </Alert>
        )}

        {/* Product Information Cards - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pricing Information */}
          <div 
            className="p-6 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <CurrencyDollarIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Pricing Information
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Selling Price</span>
                <span className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  {formatCurrency(product.price)}
                </span>
              </div>
              
              {product.cost ? (
                <>
                  <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Cost Price</span>
                    <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                      {formatCurrency(product.cost)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3">
                    <span style={{ color: 'var(--muted-foreground)' }}>Profit per Unit</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(profitMargin)} ({profitMarginPercent}%)
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    No cost price set
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Information */}
          <div 
            className="p-6 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <CubeIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Inventory Information
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Current Stock</span>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-semibold ${isLowStock ? 'text-red-600' : ''}`}>
                    {product.stock}
                  </span>
                  {isLowStock && (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
              
              {product.minStock && (
                <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Minimum Stock</span>
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {product.minStock}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-3">
                <span style={{ color: 'var(--muted-foreground)' }}>Total Value</span>
                <span className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div 
          className="p-6 rounded-xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
              <TagIcon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Additional Information
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>SKU</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {product.sku || 'Not specified'}
              </p>
            </div>
            
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Category</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {product.category || 'Uncategorized'}
              </p>
            </div>
            
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                product.isActive !== false 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {product.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Product Form Modal */}
        <ProductForm
          product={product}
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSave={handleSaveProduct}
          title="Edit Product"
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isOpen}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />

        {/* Toast Notifications */}
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
    </AppLayout>
  );
}
