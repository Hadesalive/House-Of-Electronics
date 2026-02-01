import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal } from '@/components/ui/core';
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  Loader2, 
  Shield, 
  Key, 
  User, 
  Building, 
  Calendar, 
  Cpu, 
  Monitor,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

interface LicenseStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LicenseStatusDialog({ isOpen, onClose }: LicenseStatusDialogProps) {
  const [licenseInfo, setLicenseInfo] = useState<ActivationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadLicenseInfo();
    }
  }, [isOpen]);

  const loadLicenseInfo = async () => {
    setLoading(true);
    try {
      const status: ActivationStatus = await window.electronAPI.getActivationStatus();
      setLicenseInfo(status);
    } catch (error) {
      console.error('Failed to load license info:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <Modal isOpen={isOpen} onClose={onClose} title="License Information">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <span className="ml-2 text-muted-foreground">Loading license information...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* License Status */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">License Status</h3>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                licenseInfo?.activated 
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}>
                {licenseInfo?.activated ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Activated</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Not Activated</>
                )}
              </div>
            </div>
            
            {licenseInfo?.activated && licenseInfo.license && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{licenseInfo.license.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{licenseInfo.license.customer.email}</p>
                  </div>
                </div>
                
                {licenseInfo.license.customer.company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{licenseInfo.license.customer.company}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Activated on {formatDate(licenseInfo.license.activatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Machine Information */}
          {licenseInfo?.machineInfo && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-4">Machine Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Machine ID</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {licenseInfo.machineInfo.machineId}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(licenseInfo.machineInfo?.machineId || '')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Hardware</p>
                    <p className="text-sm text-muted-foreground">
                      {licenseInfo.machineInfo.displayInfo.cpu} ({licenseInfo.machineInfo.displayInfo.cores} cores)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">System</p>
                    <p className="text-sm text-muted-foreground">
                      {licenseInfo.machineInfo.displayInfo.os} ({licenseInfo.machineInfo.displayInfo.arch})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Machine Fingerprint</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                        {licenseInfo.machineInfo.fullHash}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(licenseInfo.machineInfo?.fullHash || '')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Support Information */}
          <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Need Help?
            </h3>
            <div className="space-y-2 text-sm text-orange-800 dark:text-orange-200">
              <p>If you need assistance with your license, contact our support team:</p>
              <div className="space-y-1">
                <p><strong>Phone:</strong> +232 74762243</p>
                <p><strong>Email:</strong> ahmadbahofficial@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {!licenseInfo?.activated && (
          <Button 
            onClick={() => {
              onClose();
              navigate('/installation');
            }}
          >
            <Key className="h-4 w-4 mr-2" />
            Activate License
          </Button>
        )}
      </div>
    </Modal>,
    document.body
  );
}