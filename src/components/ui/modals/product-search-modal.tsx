import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
  CubeIcon,
  CurrencyDollarIcon,
  TagIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product, quantity: number, customPrice?: number) => void;
  products: Product[];
  title?: string;
}

export function ProductSearchModal({ 
  isOpen, 
  onClose, 
  onSelectProduct, 
  products, 
  title = "Select Product" 
}: ProductSearchModalProps) {
  const { formatCurrency } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [showQuantityInput, setShowQuantityInput] = useState(false);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term) ||
      product.sku?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    filteredProducts.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(product);
    });
    return groups;
  }, [filteredProducts]);

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setCustomPrice(null);
    setShowQuantityInput(true);
  }, []);

  const handleAddToSale = useCallback(() => {
    if (!selectedProduct) return;
    
    onSelectProduct(selectedProduct, quantity, customPrice || undefined);
    setSelectedProduct(null);
    setQuantity(1);
    setCustomPrice(null);
    setShowQuantityInput(false);
    setSearchTerm('');
  }, [selectedProduct, quantity, customPrice, onSelectProduct]);

  const handleClose = useCallback(() => {
    setSelectedProduct(null);
    setQuantity(1);
    setCustomPrice(null);
    setShowQuantityInput(false);
    setSearchTerm('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div 
          className="relative w-full max-w-6xl max-h-[90vh] rounded-xl border shadow-xl"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />
              <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                {title}
              </h2>
              <span className="px-2 py-1 text-xs rounded-full" style={{ 
                backgroundColor: 'var(--muted)', 
                color: 'var(--muted-foreground)' 
              }}>
                {filteredProducts.length} products
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-2"
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex h-[70vh]">
            {/* Left Panel - Product List */}
            <div className="flex-1 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    placeholder="Search products by name, SKU, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {Object.keys(groupedProducts).length === 0 ? (
                  <div className="text-center py-12">
                    <CubeIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                      No products found
                    </p>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {searchTerm ? 'Try adjusting your search terms' : 'No products available'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold mb-3 px-2" style={{ color: 'var(--muted-foreground)' }}>
                          {category}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              isSelected={selectedProduct?.id === product.id}
                              onClick={() => handleProductClick(product)}
                              formatCurrency={formatCurrency}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Selected Product Details */}
            {selectedProduct && showQuantityInput && (
              <div className="w-80 border-l p-6" style={{ borderColor: 'var(--border)' }}>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                      {selectedProduct.name}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {selectedProduct.description || 'No description available'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium" style={{ color: 'var(--muted-foreground)' }}>SKU:</span>
                        <p style={{ color: 'var(--foreground)' }}>{selectedProduct.sku || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Category:</span>
                        <p style={{ color: 'var(--foreground)' }}>{selectedProduct.category || 'Uncategorized'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                          Quantity
                        </label>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1"
                          placeholder="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                          Unit Price
                        </label>
                        <Input
                          type="number"
                          value={customPrice || ''}
                          onChange={(e) => setCustomPrice(e.target.value ? parseFloat(e.target.value) : null)}
                          step="0.01"
                          placeholder={formatCurrency(selectedProduct.price)}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                          Default: {formatCurrency(selectedProduct.price)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--muted-foreground)' }}>Unit Price:</span>
                          <span style={{ color: 'var(--foreground)' }}>
                            {formatCurrency(customPrice || selectedProduct.price)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--muted-foreground)' }}>Quantity:</span>
                          <span style={{ color: 'var(--foreground)' }}>{quantity}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                          <span style={{ color: 'var(--foreground)' }}>Total:</span>
                          <span style={{ color: 'var(--accent)' }}>
                            {formatCurrency((customPrice || selectedProduct.price) * quantity)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddToSale}
                        className="flex-1"
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: 'var(--accent-contrast)',
                        }}
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add to Sale
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowQuantityInput(false)}
                        className="px-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onClick: () => void;
  formatCurrency: (amount: number) => string;
}

function ProductCard({ product, isSelected, onClick, formatCurrency }: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2' : ''
      }`}
      style={{
        backgroundColor: isSelected ? 'var(--accent)' : 'var(--background)',
        borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
        color: isSelected ? 'var(--accent-contrast)' : 'var(--foreground)',
      }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
          <div className="flex items-center gap-1 text-xs" style={{ 
            color: isSelected ? 'var(--accent-contrast)' : 'var(--muted-foreground)' 
          }}>
            <TagIcon className="h-3 w-3" />
            {product.category || 'Uncategorized'}
          </div>
        </div>
        
        {product.description && (
          <p className="text-xs line-clamp-2" style={{ 
            color: isSelected ? 'var(--accent-contrast)' : 'var(--muted-foreground)' 
          }}>
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <CurrencyDollarIcon className="h-3 w-3" />
            <span className="font-semibold text-sm">
              {formatCurrency(product.price)}
            </span>
          </div>
          
          {product.stock !== undefined && (
            <div className="text-xs" style={{ 
              color: isSelected ? 'var(--accent-contrast)' : 'var(--muted-foreground)' 
            }}>
              Stock: {product.stock}
            </div>
          )}
        </div>
        
        {product.sku && (
          <div className="text-xs" style={{ 
            color: isSelected ? 'var(--accent-contrast)' : 'var(--muted-foreground)' 
          }}>
            SKU: {product.sku}
          </div>
        )}
      </div>
    </div>
  );
}
