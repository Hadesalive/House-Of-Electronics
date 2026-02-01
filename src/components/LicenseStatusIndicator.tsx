import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldCheck, AlertTriangle, Key, User } from 'lucide-react';
import { useLicense } from '@/contexts/LicenseContext';
import LicenseStatusDialog from './LicenseStatusDialog';

export default function LicenseStatusIndicator() {
  const { isActivated, activationStatus, isChecking } = useLicense();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const navigate = useNavigate();

  const handleStatusClick = () => {
    if (isActivated) {
      setShowStatusDialog(true);
    } else {
      navigate('/installation');
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <Shield className="h-4 w-4 text-gray-400" />;
    }
    
    if (isActivated) {
      return <ShieldCheck className="h-4 w-4 text-green-600" />;
    }
    
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = () => {
    if (isChecking) {
      return 'Checking...';
    }
    
    if (isActivated) {
      return activationStatus?.license?.customer?.name || 'Licensed';
    }
    
    return 'Unlicensed';
  };

  const getStatusColor = () => {
    if (isChecking) {
      return 'text-gray-500';
    }
    
    if (isActivated) {
      return 'text-green-600';
    }
    
    return 'text-red-600';
  };

  return (
    <>
      <button
        onClick={handleStatusClick}
        className={`flex items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors ${getStatusColor()}`}
        title={isActivated ? 'View license details' : 'Activate license'}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
      </button>

      {showStatusDialog && (
        <LicenseStatusDialog
          isOpen={showStatusDialog}
          onClose={() => setShowStatusDialog(false)}
        />
      )}
    </>
  );
}
