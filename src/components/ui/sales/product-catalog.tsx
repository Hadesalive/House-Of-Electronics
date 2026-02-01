import React from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { CubeIcon, TagIcon } from "@heroicons/react/24/outline";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  sku: string;
  stock: number;
  status: "active" | "inactive";
}

interface ProductCatalogProps {
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  className?: string;
}

export function ProductCatalog({ 
  products, 
  onSelectProduct, 
  className = "" 
}: ProductCatalogProps) {
  const { formatCurrency } = useSettings();

  return (
    <div 
      className={cn("rounded-xl", className)}
      style={{ 
        background: 'var(--card)', 
        border: '1px solid var(--border)' 
      }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 
            className="text-lg font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Products
          </h3>
          <span 
            className="text-sm px-3 py-1 rounded-full"
            style={{ 
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)'
            }}
          >
            {products.length} total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="p-4 rounded-lg border cursor-pointer transition-all"
              style={{ 
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)'
              }}
              onClick={() => onSelectProduct?.(product)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <CubeIcon 
                    className="h-5 w-5"
                    style={{ color: 'var(--muted-foreground)' }}
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 
                      className="text-sm font-semibold"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {product.name}
                    </h4>
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${
                        product.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                  
                  <p 
                    className="text-xs"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    SKU: {product.sku}
                  </p>
                </div>
              </div>
              
              {product.description && (
                <p 
                  className="text-xs mb-3 line-clamp-2"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {product.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <TagIcon 
                      className="h-3 w-3"
                      style={{ color: 'var(--muted-foreground)' }}
                    />
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {product.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <CubeIcon 
                      className="h-3 w-3"
                      style={{ color: 'var(--muted-foreground)' }}
                    />
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {product.stock} in stock
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p 
                    className="text-sm font-semibold"
                    style={{ color: 'var(--accent)' }}
                  >
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
