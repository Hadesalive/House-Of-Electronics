import React, { useState } from 'react';
import { Button } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { LockClosedIcon, EyeIcon, EyeSlashIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface PasswordProtectionProps {
  onSuccess: () => void;
  onManagePassword: () => void;
  title?: string;
  description?: string;
}

export function PasswordProtection({ 
  onSuccess, 
  onManagePassword,
  title = "Protected Content",
  description = "Please enter the password to access this content."
}: PasswordProtectionProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check if password is set
    const storedPassword = await getStoredPassword();
    if (!storedPassword) {
      setError('No password set. Please contact administrator to set up password protection.');
      setLoading(false);
      return;
    }

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === storedPassword) {
      onSuccess();
    } else {
      setError('Incorrect password. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-accent/10">
            <LockClosedIcon className="h-6 w-6 text-accent" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password.trim()}
            >
              {loading ? 'Verifying...' : 'Access Content'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onManagePassword}
              disabled={loading}
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Manage Password
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Contact administrator if you need to reset the password
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
