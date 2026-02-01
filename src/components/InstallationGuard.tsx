import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InstallationWizardPage from '@/pages/InstallationWizardPage';

/**
 * Installation Guard Component
 * Checks if product key is activated, redirects to installation wizard if not
 */
export function InstallationGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    checkActivation(true);
  }, []);

  const checkActivation = async (isInitialCheck = false) => {
    if (isInitialCheck) {
      setChecking(true);
    }
    
    try {
      if (!window.electron?.ipcRenderer) {
        // In development, allow access
        setActivated(true);
        setChecking(false);
        return;
      }

      const result = await window.electron.ipcRenderer.invoke('check-product-key') as {
        success: boolean;
        activated: boolean;
      };

      if (result.success && result.activated) {
        setActivated(true);
      } else {
        setActivated(false);
      }
    } catch (error) {
      console.error('Error checking activation:', error);
      // In case of error, allow access in development
      setActivated(process.env.NODE_ENV === 'development');
    } finally {
      if (isInitialCheck) {
        setChecking(false);
      }
    }
  };

  // Re-check activation when route changes (e.g., after activation from /installation)
  useEffect(() => {
    if (location.pathname !== '/installation' && !checking) {
      // Silent re-check (don't show loading spinner)
      checkActivation(false);
    }
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking activation...</p>
        </div>
      </div>
    );
  }

  if (!activated) {
    return <InstallationWizardPage />;
  }

  return <>{children}</>;
}
