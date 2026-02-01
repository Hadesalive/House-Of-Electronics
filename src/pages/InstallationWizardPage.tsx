import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import {
    KeyIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowRightIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function InstallationWizardPage() {
    const navigate = useNavigate();
    const [productKey, setProductKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isActivated, setIsActivated] = useState(false);

    useEffect(() => {
        checkActivationStatus();
    }, []);

    const checkActivationStatus = async () => {
        try {
            if (!window.electron?.ipcRenderer) return;

            const result = await window.electron.ipcRenderer.invoke('check-product-key') as {
                success: boolean;
                activated: boolean;
            };

            if (result.success && result.activated) {
                setIsActivated(true);
                // Redirect to dashboard - InstallationGuard will re-check on route change
                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 2000);
            }
        } catch (error) {
            console.error('Error checking activation:', error);
        }
    };

    const handleValidate = async () => {
        if (!productKey.trim()) {
            setToast({ message: 'Please enter a product key', type: 'error' });
            return;
        }

        setValidating(true);
        try {
            if (!window.electron?.ipcRenderer) {
                setToast({ message: 'Electron API not available', type: 'error' });
                return;
            }

            const result = await window.electron.ipcRenderer.invoke('validate-product-key', productKey) as {
                success: boolean;
                error?: string;
            };

            if (result.success) {
                setToast({ message: 'Product key is valid!', type: 'success' });
            } else {
                setToast({ message: result.error || 'Invalid product key', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error validating product key', type: 'error' });
        } finally {
            setValidating(false);
        }
    };

    const handleActivate = async () => {
        if (!productKey.trim()) {
            setToast({ message: 'Please enter a product key', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            if (!window.electron?.ipcRenderer) {
                setToast({ message: 'Electron API not available', type: 'error' });
                return;
            }

            const result = await window.electron.ipcRenderer.invoke('activate-product-key', productKey) as {
                success: boolean;
                error?: string;
            };

            if (result.success) {
                setToast({ message: 'Product key activated successfully!', type: 'success' });
                setIsActivated(true);
                // Redirect to dashboard - InstallationGuard will re-check on route change
                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 1500);
            } else {
                setToast({ message: result.error || 'Failed to activate product key', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error activating product key', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (isActivated) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
                <div className="text-center p-8">
                    <CheckCircleIcon className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--accent)' }} />
                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                        Activation Successful!
                    </h1>
                    <p className="text-muted-foreground">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen p-4" style={{ backgroundColor: 'var(--background)' }}>
            <div className="w-full max-w-md">
                <div
                    className="p-8 rounded-lg border shadow-lg"
                    style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)'
                    }}
                >
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div
                                className="p-4 rounded-full"
                                style={{ backgroundColor: 'var(--accent)' + '20' }}
                            >
                                <ShieldCheckIcon className="h-12 w-12" style={{ color: 'var(--accent)' }} />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                            Installation Wizard
                        </h1>
                        <p className="text-muted-foreground">
                            Enter your product key to activate House Of Electronics Sales Manager
                        </p>
                    </div>

                    {/* Product Key Input */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                Product Key
                            </label>
                            <div className="relative">
                                <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                                <Input
                                    type="text"
                                    value={productKey}
                                    onChange={(e) => setProductKey(e.target.value.toUpperCase())}
                                    placeholder="Enter product key"
                                    className="pl-10"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleActivate();
                                        }
                                    }}
                                    disabled={loading || validating}
                                />
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                                Enter the product key provided by your system administrator
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleValidate}
                            disabled={loading || validating || !productKey.trim()}
                            className="flex-1"
                        >
                            {validating ? 'Validating...' : 'Validate'}
                        </Button>
                        <Button
                            onClick={handleActivate}
                            disabled={loading || validating || !productKey.trim()}
                            className="flex-1"
                        >
                            {loading ? (
                                'Activating...'
                            ) : (
                                <>
                                    Activate
                                    <ArrowRightIcon className="h-5 w-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Info Box */}
                    <div
                        className="mt-6 p-4 rounded-lg"
                        style={{
                            backgroundColor: 'var(--muted)' + '40',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                            <strong>Note:</strong> This is an internal system. The product key is required for activation and is provided by your system administrator during installation. An internet connection is required to validate and bind the key to this machine.
                        </p>
                    </div>
                </div>

                {/* Toast */}
                {toast && (
                    <Toast
                        title={toast.message}
                        variant={toast.type}
                        onClose={() => setToast(null)}
                    >
                        {toast.message}
                    </Toast>
                )}
            </div>
        </div>
    );
}
