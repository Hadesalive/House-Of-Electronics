import React, { useState } from 'react';
import { Button } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { 
  LockClosedIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface PasswordManagerProps {
  onPasswordSet: (password: string) => void;
  onCancel: () => void;
  isFirstTime?: boolean;
}

export function PasswordManager({ 
  onPasswordSet, 
  onCancel, 
  isFirstTime = false 
}: PasswordManagerProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get stored password from database
  const getStoredPassword = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getReportsPassword();
        return result.success && result.data ? result.data : '';
      }
      return '';
    } catch (error) {
      console.error('Error getting stored password:', error);
      return '';
    }
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (password.length > 50) {
      return 'Password must be less than 50 characters';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    // Check password confirmation
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // For first time setup, no current password needed
    if (!isFirstTime) {
      const storedPassword = await getStoredPassword();
      if (!storedPassword) {
        setError('No existing password found. Please contact administrator.');
        setLoading(false);
        return;
      }
      if (currentPassword !== storedPassword) {
        setError('Current password is incorrect');
        setLoading(false);
        return;
      }
    }

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Store the new password in database
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.setReportsPassword(newPassword);
      if (!result.success) {
        setError(result.error || 'Failed to save password');
        setLoading(false);
        return;
      }
    } else {
      setError('Electron API not available');
      setLoading(false);
      return;
    }
    
    // Clear form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    
    // Notify parent component
    onPasswordSet(newPassword);
    
    setLoading(false);
  };

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return 'bg-red-500';
    if (strength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return 'Weak';
    if (strength < 4) return 'Medium';
    return 'Strong';
  };

  const strength = passwordStrength(newPassword);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-accent/10">
            <KeyIcon className="h-6 w-6 text-accent" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            {isFirstTime ? 'Set Reports Password' : 'Update Reports Password'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isFirstTime 
              ? 'Set a secure password to protect financial reports and analytics.'
              : 'Update your password to maintain security for financial reports.'
            }
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isFirstTime && (
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength)}`}
                        style={{ width: `${(strength / 6) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {getStrengthText(strength)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Use at least 6 characters with a mix of letters, numbers, and symbols
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-1 flex items-center gap-1">
                  {newPassword === confirmPassword ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !newPassword.trim() || !confirmPassword.trim() || newPassword !== confirmPassword}
            >
              {loading ? 'Updating...' : (isFirstTime ? 'Set Password' : 'Update Password')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Password is stored locally and encrypted for security
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
