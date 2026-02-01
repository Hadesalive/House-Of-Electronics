import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

interface LicenseContextType {
  isActivated: boolean | null;
  activationStatus: ActivationStatus | null;
  isChecking: boolean;
  error: string | null;
  checkLicenseStatus: () => Promise<boolean>;
  retryValidation: () => Promise<{ success: boolean; error?: string }>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};

interface LicenseProviderProps {
  children: ReactNode;
}

export const LicenseProvider: React.FC<LicenseProviderProps> = ({ children }) => {
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [activationStatus, setActivationStatus] = useState<ActivationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const checkLicenseStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);

      if (!window.electron?.ipcRenderer) {
        setIsActivated(true);
        return true;
      }

      // Check local activation (offline) via product key IPC
      const checkResult = await window.electron.ipcRenderer.invoke('check-product-key') as {
        success: boolean;
        activated: boolean;
        error?: string;
      };

      if (!checkResult?.success) {
        setIsActivated(false);
        setActivationStatus({ activated: false, message: checkResult?.error });
        return false;
      }

      const info = await window.electron.ipcRenderer.invoke('get-activation-info').catch(() => null) as any;
      const activated = !!checkResult.activated;
      setIsActivated(activated);
      setActivationStatus({
        activated,
        machineId: info?.machine_id,
        message: activated ? 'Activated' : 'Not activated'
      });

      return activated;
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
    // For product-key flow, just re-check
    const ok = await checkLicenseStatus();
    return { success: ok, error: ok ? undefined : 'Not activated' };
  }, [checkLicenseStatus]);

  // Initial license check on mount - only once
  useEffect(() => {
    if (!hasInitialized) {
      checkLicenseStatus().then(() => {
        setHasInitialized(true);
      });
    }
  }, [checkLicenseStatus, hasInitialized]);

  // No runtime events for product-key flow

  const contextValue: LicenseContextType = {
    isActivated,
    activationStatus,
    isChecking,
    error,
    checkLicenseStatus,
    retryValidation
  };

  return (
    <LicenseContext.Provider value={contextValue}>
      {children}
    </LicenseContext.Provider>
  );
};

