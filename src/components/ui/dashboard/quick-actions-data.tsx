import React from "react";
import { useNavigate } from "react-router-dom";
// Tabler Icons
import {
  IconShoppingCart,
  IconUserPlus,
  IconFileText,
  IconCube,
} from '@tabler/icons-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: "primary" | "secondary" | "accent";
}

// Hook to create quick actions with navigation
export const useQuickActions = (): QuickAction[] => {
  const navigate = useNavigate();

  return [
    {
      id: "new-sale",
      label: "New Sale",
      icon: <IconShoppingCart className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />,
      onClick: () => {
        navigate("/sales/new");
      },
      color: "accent"
    },
    {
      id: "new-customer", 
      label: "Add Customer",
      icon: <IconUserPlus className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />,
      onClick: () => {
        navigate("/customers/new");
      },
      color: "primary"
    },
    {
      id: "new-invoice",
      label: "Create Invoice", 
      icon: <IconFileText className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />,
      onClick: () => {
        navigate("/invoices/new");
      },
      color: "secondary"
    },
    {
      id: "new-product",
      label: "Add Product",
      icon: <IconCube className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />,
      onClick: () => {
        navigate("/products/new");
      },
      color: "primary"
    }
  ];
};

// Legacy export for backward compatibility (deprecated)
export const commonQuickActions: QuickAction[] = [
  {
    id: "new-sale",
    label: "New Sale",
    icon: <IconShoppingCart className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />,
    onClick: () => {
      // This will be replaced by the hook version
      console.warn("Using deprecated commonQuickActions. Use useQuickActions hook instead.");
    },
    color: "accent"
  },
  {
    id: "new-customer", 
    label: "Add Customer",
    icon: <IconUserPlus className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />,
    onClick: () => {
      console.warn("Using deprecated commonQuickActions. Use useQuickActions hook instead.");
    },
    color: "primary"
  },
  {
    id: "new-invoice",
    label: "Create Invoice", 
    icon: <IconFileText className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />,
    onClick: () => {
      console.warn("Using deprecated commonQuickActions. Use useQuickActions hook instead.");
    },
    color: "secondary"
  },
  {
    id: "new-product",
    label: "Add Product",
    icon: <IconCube className="h-5 w-5" style={{ color: 'var(--accent)' }} stroke={1.5} />,
    onClick: () => {
      console.warn("Using deprecated commonQuickActions. Use useQuickActions hook instead.");
    },
    color: "primary"
  }
];