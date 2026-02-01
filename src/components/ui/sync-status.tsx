'use client';

import React from 'react';
import { useSync } from '@/contexts/SyncContext';
import { CloudArrowUpIcon, CloudArrowDownIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const SyncStatus: React.FC = () => {
  const { status, syncing, syncAll, pullChanges, error } = useSync();

  if (!status) {
    return null;
  }

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusColor = () => {
    if (!status.enabled) return 'text-gray-500';
    if (status.errors > 0) return 'text-red-500';
    if (status.pending > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!status.enabled) return null;
    if (status.errors > 0) return <ExclamationTriangleIcon className="w-4 h-4" />;
    if (status.pending > 0) return <CloudArrowUpIcon className="w-4 h-4" />;
    return <CheckCircleIcon className="w-4 h-4" />;
  };

  if (!status.enabled) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <CloudArrowUpIcon className="w-4 h-4" />
        <span>Sync disabled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <div className={`flex items-center gap-1.5 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {status.pending > 0 ? `${status.pending} pending` : 'Synced'}
        </span>
      </div>

      {/* Last sync time */}
      <span className="text-xs text-gray-500">
        {formatLastSync(status.lastSyncAt)}
      </span>

      {/* Error count */}
      {status.errors > 0 && (
        <span className="text-xs text-red-500">
          {status.errors} errors
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => syncAll()}
          disabled={syncing || status.pending === 0}
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Push changes to cloud"
        >
          <CloudArrowUpIcon className="w-3 h-3" />
        </button>
        <button
          onClick={() => pullChanges()}
          disabled={syncing}
          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Pull changes from cloud"
        >
          <CloudArrowDownIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <span className="text-xs text-red-500" title={error}>
          {error}
        </span>
      )}
    </div>
  );
};
