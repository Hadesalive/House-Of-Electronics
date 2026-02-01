import React, { useState, useEffect, useMemo } from 'react';
import { PaginatedTableCard, KPICard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select } from '@/components/ui/forms';
import { productService } from '@/lib/services';
import { Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export default function InventoryPage() {
  const { formatCurrency, formatDate } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Stock adjustment states
  const [adjustingStock, setAdjustingStock] = useState<string | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      
      if (response.success && response.data) {
        // Ensure all products have valid cost values
        const sanitizedProducts = response.data.map(product => ({
          ...product,
          cost: product.cost !== undefined && product.cost !== null ? product.cost : 0
        }));
        setProducts(sanitizedProducts);
      } else {
        setProducts([]);
        setToast({ message: response.error || 'Failed to load products', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
      setToast({ message: 'Failed to load products', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async (productId: string, adjustment: number) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const newStock = Math.max(0, product.stock + adjustment);
      const response = await productService.updateProduct(productId, { stock: newStock });

      if (response.success) {
        setToast({ 
          message: `Stock ${adjustment >= 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`, 
          type: 'success' 
        });
        loadProducts();
        setAdjustingStock(null);
        setStockAdjustment(0);
      } else {
        setToast({ message: response.error || 'Failed to update stock', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
      setToast({ message: 'Failed to update stock', type: 'error' });
    }
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const categorySet = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(categorySet).sort();
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      const matchesStockFilter = (() => {
        const stock = product.stock || 0;
        const minStock = product.minStock || 0;
        
        switch (stockFilter) {
          case 'low':
            // Low stock: has minStock set and stock is at or below minimum
            return minStock > 0 && stock > 0 && stock <= minStock;
          case 'out':
            // Out of stock: stock is exactly 0
            return stock === 0;
          case 'normal':
            // Normal stock: stock is above minimum (or no minimum set and stock > 0)
            return stock > 0 && (minStock === 0 || stock > minStock);
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesCategory && matchesStockFilter;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortBy] || '';
      let bValue: string | number = b[sortBy] || '';
      
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
  }, [products, searchTerm, selectedCategory, stockFilter, sortBy, sortOrder]);

  const tableColumns = [
    { key: 'name', label: 'Product', sortable: true },
    { key: 'sku', label: 'SKU', sortable: false },
    { key: 'stock', label: 'Current Stock', sortable: true },
    { key: 'minStock', label: 'Min Stock', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
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
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {product.category || 'No category'}
          </div>
        </div>
      </div>
    ),
    sku: product.sku || '-',
    stock: (() => {
      const stock = product.stock || 0;
      const minStock = product.minStock || 0;
      
      let textColor = 'text-green-600';
      let showWarning = false;
      
      if (stock === 0) {
        textColor = 'text-red-600';
        showWarning = true;
      } else if (minStock > 0 && stock <= minStock) {
        textColor = 'text-orange-600';
        showWarning = true;
      } else if (minStock > 0 && stock < minStock * 2) {
        textColor = 'text-yellow-600';
      }
      
      return (
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-lg ${textColor}`}>
            {stock}
          </span>
          {showWarning && (
            <ExclamationTriangleIcon className={`h-4 w-4 ${stock === 0 ? 'text-red-500' : 'text-orange-500'}`} />
          )}
        </div>
      );
    })(),
    minStock: product.minStock !== undefined && product.minStock !== null ? product.minStock.toString() : '-',
    status: (() => {
      const stock = product.stock || 0;
      const minStock = product.minStock || 0;
      
      // Check for out of stock first
      if (stock === 0) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            Out of Stock
          </span>
        );
      }
      
      // Check for low stock (at or below minimum)
      if (minStock > 0 && stock <= minStock) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            Low Stock
          </span>
        );
      }
      
      // Check for getting low (below 2x minimum)
      if (minStock > 0 && stock < minStock * 2) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            Getting Low
          </span>
        );
      }
      
      // In stock
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          In Stock
        </span>
      );
    })(),
    actions: (
      <div className="flex items-center gap-2">
        {adjustingStock === product.id ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStockAdjustment(product.id, -1)}
              disabled={product.stock <= 0}
            >
              <MinusIcon className="h-3 w-3" />
            </Button>
            <span className="text-sm font-medium min-w-[2rem] text-center">
              {product.stock}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStockAdjustment(product.id, 1)}
            >
              <PlusIcon className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdjustingStock(null);
                setStockAdjustment(0);
              }}
            >
              ✓
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAdjustingStock(product.id)}
          >
            Adjust
          </Button>
        )}
      </div>
    ),
  }));

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => {
      const stock = p.stock || 0;
      const minStock = p.minStock || 0;
      return minStock > 0 && stock > 0 && stock <= minStock;
    }).length;
    const outOfStockProducts = products.filter(p => (p.stock || 0) === 0).length;
    const totalValue = products.reduce((sum, p) => {
      try {
        const stock = p.stock || 0;
        // Use cost if available and valid, otherwise use price
        const unitValue = (p.cost !== undefined && p.cost !== null && !isNaN(p.cost) && p.cost >= 0) 
          ? p.cost 
          : (p.price || 0);
        return sum + (unitValue * stock);
      } catch (error) {
        console.warn('Error calculating value for product:', p.name, error);
        const stock = p.stock || 0;
        return sum + ((p.price || 0) * stock);
      }
    }, 0);
    
    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalValue
    };
  }, [products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Inventory Management
          </h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard 
            title="Total Products" 
            value={stats.totalProducts.toString()}
            icon={<CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
            accentColor="#06b6d4"
          />
          <KPICard 
            title="Low Stock Items" 
            value={stats.lowStockProducts.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />}
            accentColor="#f59e0b"
          />
          <KPICard 
            title="Out of Stock" 
            value={stats.outOfStockProducts.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
            accentColor="#ef4444"
          />
          <KPICard 
            title="Inventory Value" 
            value={formatCurrency(stats.totalValue)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
            accentColor="#10b981"
          />
        </div>

        {/* Search and Filters */}
        <div 
          className="p-6 rounded-xl"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            border: '1px solid var(--border)'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)10' }}>
              <FunnelIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Search & Filters
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Find and organize your inventory
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
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
            <div>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map(category => ({ value: category || '', label: category || '' }))
                ]}
                placeholder="Select Category"
              />
            </div>
            <div>
              <Select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out' | 'normal')}
                options={[
                  { value: 'all', label: 'All Stock' },
                  { value: 'low', label: 'Low Stock' },
                  { value: 'out', label: 'Out of Stock' },
                  { value: 'normal', label: 'Normal Stock' }
                ]}
                placeholder="Stock Filter"
              />
            </div>
            <div>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'stock' | 'price' | 'category')}
                options={[
                  { value: 'name', label: 'Sort by Name' },
                  { value: 'stock', label: 'Sort by Stock' },
                  { value: 'price', label: 'Sort by Price' },
                  { value: 'category', label: 'Sort by Category' }
                ]}
                placeholder="Sort by"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {filteredAndSortedProducts.length} of {products.length} products
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <PaginatedTableCard 
          title="Inventory Overview"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
          loading={loading}
          empty={!loading && tableData.length === 0}
          emptyTitle="No products found"
          emptyDescription={searchTerm || selectedCategory || stockFilter !== 'all' ? "Try adjusting your filters" : "No products in inventory"}
          headerActions={
            <div className="flex items-center gap-2 flex-wrap">
              {searchTerm && (
                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--accent)10', color: 'var(--accent)' }}>
                  &quot;{searchTerm}&quot;
                </span>
              )}
              {selectedCategory && (
                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                  {selectedCategory}
                </span>
              )}
              {stockFilter !== 'all' && (
                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ 
                  backgroundColor: stockFilter === 'out' ? 'rgba(239, 68, 68, 0.1)' : stockFilter === 'low' ? 'rgba(249, 115, 22, 0.1)' : 'var(--muted)',
                  color: stockFilter === 'out' ? 'rgb(239, 68, 68)' : stockFilter === 'low' ? 'rgb(249, 115, 22)' : 'var(--muted-foreground)'
                }}>
                  {stockFilter === 'low' ? 'Low Stock' : 
                   stockFilter === 'out' ? 'Out of Stock' : 'Normal Stock'}
                </span>
              )}
            </div>
          }
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
  );
}
