import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { useLicense } from '@/contexts/LicenseContext';

interface LicenseGuardProps {
  children: React.ReactNode;
}

export default function LicenseGuard({ children }: LicenseGuardProps) {
  const { isActivated, isChecking } = useLicense();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  // Redirect logic - only on initial load or when status changes from valid to invalid
  useEffect(() => {
    // Don't redirect while checking
    if (isChecking) return;

    // Only redirect once when license becomes invalid (not during periodic checks)
    if (isActivated === false && !hasRedirected.current && location.pathname !== '/installation') {
      hasRedirected.current = true;
      navigate('/installation', { replace: true });
    } 
    // Only redirect from installation page if license becomes valid
    else if (isActivated === true && location.pathname === '/installation') {
      hasRedirected.current = false; // Reset flag
      navigate('/', { replace: true });
    }
  }, [isActivated, isChecking, location.pathname, navigate]);

  // Show loading spinner while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[--accent]" />
          <p className="text-gray-600">Verifying license...</p>
        </div>
      </div>
    );
  }

  // If not activated and not on installation page, show redirect message
  if (isActivated === false && location.pathname !== '/installation') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Redirecting to activation...</p>
        </div>
      </div>
    );
  }

  // If on installation page but license is valid, show redirect message
  if (isActivated === true && location.pathname === '/installation') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // If activated or on allowed pages, show children
  if (isActivated === true || location.pathname === '/installation') {
    return <>{children}</>;
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Shield className="h-8 w-8 mx-auto mb-4 text-red-600" />
        <p className="text-gray-600">License verification required</p>
      </div>
    </div>
  );
}
