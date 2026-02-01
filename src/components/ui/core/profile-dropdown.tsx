'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UserCircleIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, KeyIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth, PERMISSIONS } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '@/contexts/LicenseContext';
import LicenseStatusDialog from '@/components/LicenseStatusDialog';

interface ProfileDropdownProps {
  user: {
    fullName?: string;
    username?: string;
  } | null;
  onLogout: () => void;
}

export function ProfileDropdown({ user, onLogout }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { isActivated, activationStatus, isChecking } = useLicense();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const canViewSettings = hasPermission(PERMISSIONS.VIEW_SETTINGS);

  const handleLicenseClick = () => {
    if (isActivated) {
      setShowLicenseDialog(true);
      setIsOpen(false);
    } else {
      navigate('/installation');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 rounded-md hover:bg-opacity-10 transition-colors flex items-center justify-center"
        style={{ 
          backgroundColor: isOpen ? 'rgba(0, 0, 0, 0.05)' : 'transparent'
        }}
        aria-label="Profile menu"
      >
        <div className="h-7 w-7 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 to-teal-500">
          {user?.fullName ? (
            <span className="text-xs font-semibold text-white">
              {user.fullName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <UserCircleIcon className="h-5 w-5 text-white" />
          )}
        </div>
      </button>

      {isOpen && (
        <>
          {/* Dropdown Panel */}
          <div
            className="absolute right-0 top-10 w-56 overflow-hidden rounded-2xl shadow-2xl z-50 flex flex-col"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 to-teal-500">
                  {user?.fullName ? (
                    <span className="text-sm font-semibold text-white">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <UserCircleIcon className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {user?.fullName || 'User'}
                  </p>
                  {user?.username && (
                    <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                      {user.username}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  navigate('/profile');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-black/5 transition-colors text-sm"
                style={{ color: 'var(--foreground)' }}
              >
                <UserCircleIcon className="h-4 w-4" />
                Profile
              </button>

              {canViewSettings && (
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-black/5 transition-colors text-sm"
                  style={{ color: 'var(--foreground)' }}
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Settings
                </button>
              )}
              
              {/* License Section */}
              <button
                onClick={handleLicenseClick}
                className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-black/5 transition-colors border-t border-b my-1"
                style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}
              >
                <div className="flex items-center gap-3">
                  {isChecking ? (
                    <KeyIcon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                  ) : isActivated ? (
                    <ShieldCheckIcon className="h-4 w-4" style={{ color: '#10b981' }} />
                  ) : (
                    <ExclamationTriangleIcon className="h-4 w-4" style={{ color: '#ef4444' }} />
                  )}
                  <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                    License
                  </span>
                </div>
                <span 
                  className="text-xs font-medium"
                  style={{ 
                    color: isActivated ? '#10b981' : isChecking ? 'var(--muted-foreground)' : '#ef4444' 
                  }}
                >
                  {isChecking 
                    ? 'Checking...' 
                    : isActivated 
                      ? (activationStatus?.license?.customer?.name || 'Licensed')
                      : 'Unlicensed'}
                </span>
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-red-500/10 transition-colors text-sm"
                style={{ color: '#ef4444' }}
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-8px) scale(0.96);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </>
      )}

      {showLicenseDialog && (
        <LicenseStatusDialog
          isOpen={showLicenseDialog}
          onClose={() => setShowLicenseDialog(false)}
        />
      )}
    </div>
  );
}

