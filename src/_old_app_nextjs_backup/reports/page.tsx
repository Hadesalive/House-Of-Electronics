'use client';

import React from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { EmptyState } from '@/components/ui/core';

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <EmptyState
          title="Reports Coming Soon"
          description="Advanced reporting and analytics features will be available in the next update."
          icon="ChartBarIcon"
        />
      </div>
    </AppLayout>
  );
}
