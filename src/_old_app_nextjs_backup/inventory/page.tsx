'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { PaginatedTableCard, KPICard } from '@/components/ui/dashboard';
import { productService } from '@/lib/services';
import { Product } from '@/lib/types/core';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const tableColumns = [
    { key: 'name', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'stock', label: 'Current Stock' },
    { key: 'minStock', label: 'Min Stock' },
    { key: 'status', label: 'Status' }
  ];

  const tableData = products.map(product => ({
    name: product.name,
    sku: product.sku || '-',
    stock: product.stock.toString(),
    minStock: product.minStock?.toString() || '-',
    status: (
      <span 
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          product.minStock && product.stock <= product.minStock
            ? 'bg-red-100 text-red-800'
            : product.stock < (product.minStock || 0) * 2
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
        }`}
      >
        {product.minStock && product.stock <= product.minStock
          ? 'Low Stock'
          : product.stock < (product.minStock || 0) * 2
          ? 'Getting Low'
          : 'In Stock'}
      </span>
    ),
  }));

  const lowStockCount = products.filter(p => p.minStock && p.stock <= p.minStock).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard 
            title="Total Products" 
            value={products.length.toString()} 
          />
          <KPICard 
            title="Low Stock Items" 
            value={lowStockCount.toString()} 
          />
          <KPICard 
            title="Inventory Value" 
            value={`$${totalValue.toFixed(2)}`} 
          />
        </div>

        {/* Inventory Table */}
        <PaginatedTableCard 
          title="Inventory Overview"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
        />
      </div>
    </AppLayout>
  );
}
