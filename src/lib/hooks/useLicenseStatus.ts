import { useState, useEffect, useCallback } from 'react';

interface ActivationStatus {
  activated: boolean;
  reason?: string;
  machineId?: string;
  machineInfo?: {
    machineId: string;
    fullHash: string;
    platform: string;
    hostname: string;
    displayInfo: {
      os: string;
      arch: string;
      cpu: string;
      cores: number;
    };
  };
  license?: {
    customer: {
      name?: string;
      email?: string;
      company?: string;
    };
    activatedAt: string;
    product: {
      name: string;
      version: string;
    };
  };
  message?: string;
}

export function useLicenseStatus() {
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [activationStatus, setActivationStatus] = useState<ActivationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkLicenseStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);
      
      const status: ActivationStatus = await window.electronAPI.getActivationStatus();
      setActivationStatus(status);
      setIsActivated(status.activated);
      
      return status.activated;
    } catch (err: any) {
      console.error('Failed to check license status:', err);
      setError(err.message || 'Failed to check license status');
      setIsActivated(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const retryValidation = useCallback(async () => {
    try {
      const result = await window.electronAPI.retryLicenseValidation();
      if (result.success) {
        await checkLicenseStatus();
      }
      return result;
    } catch (err: any) {
      console.error('Failed to retry license validation:', err);
      setError(err.message || 'Failed to retry license validation');
      return { success: false, error: err.message };
    }
  }, [checkLicenseStatus]);

  // Check license status on mount
  useEffect(() => {
    checkLicenseStatus();
  }, [checkLicenseStatus]);

  // Note: Periodic checking is handled by the backend (activation-service.js)
  // which sends IPC events when license status changes. No need for frontend polling.

  return {
    isActivated,
    activationStatus,
    isChecking,
    error,
    checkLicenseStatus,
    retryValidation
  };
}
