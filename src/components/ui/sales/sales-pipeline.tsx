import React from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Deal {
  id: string;
  title: string;
  customer: string;
  value: number;
  stage: string;
  probability: number;
  createdDate: string;
}

interface PipelineStage {
  id: string;
  name: string;
  deals: Deal[];
  color: string;
}

interface SalesPipelineProps {
  stages: PipelineStage[];
  onAddDeal?: (stageId: string) => void;
  onMoveDeal?: (dealId: string, fromStage: string, toStage: string) => void;
  className?: string;
}

export function SalesPipeline({ 
  stages, 
  onAddDeal, 
  onMoveDeal, 
  className = "" 
}: SalesPipelineProps) {
  const { formatCurrency } = useSettings();

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="w-full"
          >
            <div 
              className="rounded-xl p-4"
              style={{ 
                background: 'var(--card)', 
                border: '1px solid var(--border)' 
              }}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 
                    className="text-sm font-semibold"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {stage.name}
                  </h3>
                  <span 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: 'var(--muted)',
                      color: 'var(--muted-foreground)'
                    }}
                  >
                    {stage.deals.length}
                  </span>
                </div>
                {onAddDeal && (
                  <button
                    onClick={() => onAddDeal(stage.id)}
                    className="p-1 rounded-md hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Stage Value */}
              <div className="mb-4">
                <p 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  {formatCurrency(stage.deals.reduce((sum, deal) => sum + deal.value, 0))}
                </p>
              </div>

              {/* Deals */}
              <div className="space-y-3">
                {stage.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3 rounded-lg border cursor-pointer transition-shadow"
                    style={{ 
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)'
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('dealId', deal.id);
                      e.dataTransfer.setData('fromStage', stage.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dealId = e.dataTransfer.getData('dealId');
                      const fromStage = e.dataTransfer.getData('fromStage');
                      if (dealId && fromStage !== stage.id && onMoveDeal) {
                        onMoveDeal(dealId, fromStage, stage.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 
                        className="text-sm font-medium"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {deal.title}
                      </h4>
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: 'var(--muted)',
                          color: 'var(--muted-foreground)'
                        }}
                      >
                        {deal.probability}%
                      </span>
                    </div>
                    
                    <p 
                      className="text-xs mb-2"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {deal.customer}
                    </p>
                    
                    <p 
                      className="text-sm font-semibold"
                      style={{ color: 'var(--accent)' }}
                    >
                      {formatCurrency(deal.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
