'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { PaginatedTableCard, KPICard } from '@/components/ui/dashboard';
import { Button, Toast, Alert } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { ProductForm } from '@/components/ui/forms/product-form';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { productService } from '@/lib/services';
import { Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function ProductsPage() {
  const router = useRouter();
  const { formatCurrency, formatDate } = useSettings();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      
      if (response.success && response.data) {
        setProducts(response.data);
      } else {
        setProducts([]); // Set empty array if no data
        setToast({ message: response.error || 'Failed to load products', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]); // Set empty array on error
      setToast({ message: 'Failed to load products', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      let response;
      if (editingProduct) {
        response = await productService.updateProduct(editingProduct.id, productData);
      } else {
        response = await productService.createProduct(productData);
      }

      if (response.success) {
        setToast({ 
          message: editingProduct ? 'Product updated successfully!' : 'Product added successfully!', 
          type: 'success' 
        });
        setShowForm(false);
        setEditingProduct(null);
        loadProducts();
      } else {
        setToast({ message: response.error || 'Failed to save product', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      setToast({ message: 'Failed to save product', type: 'error' });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = (productId: string) => {
    const currentProducts = products || [];
    const product = currentProducts.find(p => p.id === productId);
    confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product?.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        const response = await productService.deleteProduct(productId);
        if (response.success) {
          setToast({ message: 'Product deleted successfully', type: 'success' });
          loadProducts();
        } else {
          setToast({ message: response.error || 'Failed to delete product', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete product:', error);
        setToast({ message: 'Failed to delete product', type: 'error' });
      }
    });
  };

  const handleViewProduct = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const currentProducts = products || [];
    const categorySet = new Set(currentProducts.map(p => p.category).filter(Boolean));
    return Array.from(categorySet).sort();
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const currentProducts = products || [];
    const filtered = currentProducts.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesActive = showInactive || product.isActive !== false;
      
      return matchesSearch && matchesCategory && matchesActive;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortBy];
      let bValue: string | number | Date = b[sortBy];
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, sortBy, sortOrder, showInactive]);

  // Table configuration
  const tableColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'sku', label: 'SKU', sortable: false },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'stock', label: 'Stock', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  const tableData = filteredAndSortedProducts.map(product => ({
    id: product.id,
    name: (
      <div className="flex items-center space-x-3">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-8 w-8 rounded-lg object-cover border"
            style={{ borderColor: 'var(--border)' }}
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <div className="font-medium">{product.name}</div>
          {product.description && (
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {product.description.length > 50 
                ? `${product.description.substring(0, 50)}...` 
                : product.description
              }
            </div>
          )}
        </div>
      </div>
    ),
    sku: product.sku || '-',
    price: formatCurrency(product.price),
    stock: (
      <div className="flex items-center gap-2">
        <span className={product.stock <= (product.minStock || 0) ? 'text-red-600 font-medium' : ''}>
          {product.stock}
        </span>
        {product.stock <= (product.minStock || 0) && (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
        )}
      </div>
    ),
    category: product.category || '-',
    createdAt: formatDate(product.createdAt),
    actions: (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleViewProduct(product)}>
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleDeleteProduct(product.id)}
          className="text-red-600 hover:text-red-700"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }));

  // Calculate stats
  const stats = useMemo(() => {
    const currentProducts = products || [];
    const totalProducts = currentProducts.length;
    const activeProducts = currentProducts.filter(p => p.isActive !== false).length;
    const lowStockProducts = currentProducts.filter(p => p.minStock && p.stock <= p.minStock).length;
    const totalValue = currentProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalValue
    };
  }, [products]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Products
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Manage your product inventory
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard 
            title="Total Products" 
            value={stats.totalProducts.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Active Products" 
            value={stats.activeProducts.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
          <KPICard 
            title="Low Stock Items" 
            value={stats.lowStockProducts.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-500" />}
          />
          <KPICard 
            title="Total Inventory Value" 
            value={formatCurrency(stats.totalValue)}
            icon={<ExclamationTriangleIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          />
        </div>

        {/* Low Stock Alert */}
        {stats.lowStockProducts > 0 && (
          <Alert variant="warning" title="Low Stock Alert">
            <p>
              {stats.lowStockProducts} product{stats.lowStockProducts !== 1 ? 's' : ''} 
              {stats.lowStockProducts === 1 ? ' is' : ' are'} running low on stock. 
              Consider restocking these items.
            </p>
          </Alert>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                placeholder="Search products by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-w-[150px] px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'stock' | 'createdAt')}
              className="min-w-[120px] px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="stock">Sort by Stock</option>
              <option value="createdAt">Sort by Date</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <span>
            Showing {filteredAndSortedProducts.length} of {(products || []).length} products
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedCategory && ` in ${selectedCategory}`}
          </span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive products
          </label>
        </div>

        {/* Products Table */}
        <PaginatedTableCard 
          title="Products"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
          headerActions={
            <div className="flex items-center gap-2">
              {searchTerm && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  &quot;{searchTerm}&quot;
                </span>
              )}
              {selectedCategory && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {selectedCategory}
                </span>
              )}
            </div>
          }
        />

        {/* Product Form Modal */}
        <ProductForm
          product={editingProduct}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
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

