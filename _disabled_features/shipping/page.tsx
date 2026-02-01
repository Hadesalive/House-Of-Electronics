'use client';

import React from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { EmptyState } from '@/components/ui/core';

export default function ShippingPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <EmptyState
          title="Shipping Coming Soon"
          description="Shipping management features will be available in the next update."
          icon="TruckIcon"
        />
      </div>
    </AppLayout>
  );
}
