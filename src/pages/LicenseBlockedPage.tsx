import { XCircle, AlertTriangle, Key, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BlockReason {
    title: string;
    message: string;
    icon: 'error' | 'warning';
    canRetry: boolean;
}

export default function LicenseBlockedPage() {
    const navigate = useNavigate();
    const [reason, setReason] = useState<BlockReason>({
        title: 'License Validation Failed',
        message: 'Unable to verify your license. Please contact support.',
        icon: 'error',
        canRetry: false
    });
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        // Get the reason from URL params or localStorage
        const params = new URLSearchParams(window.location.search);
        const reasonParam = params.get('reason');

        if (reasonParam) {
            setReason(getBlockReasonDetails(reasonParam));
        }
    }, []);

    const getBlockReasonDetails = (reasonCode: string): BlockReason => {
        switch (reasonCode) {
            case 'no-license':
                return {
                    title: 'No License Found',
                    message: 'This application requires activation. Please activate your copy to continue using House Of Electronics Sales Manager.',
                    icon: 'warning',
                    canRetry: false
                };
            case 'invalid-signature':
                return {
                    title: 'Invalid License',
                    message: 'Your license file appears to be invalid or corrupted. The digital signature could not be verified.',
                    icon: 'error',
                    canRetry: false
                };
            case 'hardware-mismatch':
                return {
                    title: 'Hardware Mismatch',
                    message: 'This license is locked to different hardware. If you have upgraded your computer, please contact support for a license transfer.',
                    icon: 'error',
                    canRetry: false
                };
            case 'license-tampered':
                return {
                    title: 'License Tampering Detected',
                    message: 'The license file has been modified or tampered with. Please restore the original license file or contact support.',
                    icon: 'error',
                    canRetry: false
                };
            case 'license-expired':
                return {
                    title: 'License Expired',
                    message: 'Your license has expired. Please renew your license to continue using the application.',
                    icon: 'warning',
                    canRetry: false
                };
            case 'validation-failed':
                return {
                    title: 'Validation Failed',
                    message: 'Unable to validate your license at this time. This may be a temporary issue.',
                    icon: 'warning',
                    canRetry: true
                };
            default:
                return {
                    title: 'License Error',
                    message: 'An error occurred while checking your license. Please contact support for assistance.',
                    icon: 'error',
                    canRetry: true
                };
        }
    };

    const handleRetry = async () => {
        setRetrying(true);
        try {
            // Try to revalidate license
            const result = await window.electronAPI.retryLicenseValidation();
            // If successful, navigate to dashboard (LicenseGuard will handle redirect)
            if (result.success) {
                navigate('/');
            } else {
                setRetrying(false);
            }
        } catch (error) {
            console.error('Retry failed:', error);
            setRetrying(false);
        }
    };

    const handleActivate = () => {
        navigate('/activation');
    };

    const handleContactSupport = () => {
        window.electronAPI.invoke('open-external', 'mailto:support@houseofelectronics.com?subject=License Issue');
    };

    const handleExit = () => {
        window.electronAPI.invoke('quit-application');
    };

    const IconComponent = reason.icon === 'error' ? XCircle : AlertTriangle;
    const iconColor = reason.icon === 'error' ? 'text-red-500' : 'text-yellow-500';
    const bgColor = reason.icon === 'error' ? 'bg-red-50' : 'bg-yellow-50';
    const borderColor = reason.icon === 'error' ? 'border-red-200' : 'border-yellow-200';

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Main Error Card */}
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className={`${bgColor} border-b ${borderColor} p-6`}>
                        <div className="flex items-center gap-4">
                            <IconComponent className={`h-12 w-12 ${iconColor} flex-shrink-0`} />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{reason.title}</h1>
                                <p className="text-gray-700 mt-1">House Of Electronics Sales Manager</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <p className="text-gray-700 text-lg mb-6">{reason.message}</p>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {reason.canRetry && (
                                <button
                                    onClick={handleRetry}
                                    disabled={retrying}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                                >
                                    <RefreshCw className={`h-5 w-5 ${retrying ? 'animate-spin' : ''}`} />
                                    {retrying ? 'Retrying...' : 'Retry Validation'}
                                </button>
                            )}

                            <button
                                onClick={handleActivate}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                <Key className="h-5 w-5" />
                                Activate License
                            </button>

                            <button
                                onClick={handleContactSupport}
                                className="w-full px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Contact Support
                            </button>

                            <button
                                onClick={handleExit}
                                className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
                            >
                                Exit Application
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                            <div className="flex-shrink-0 mt-0.5">
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium">Why is this happening?</p>
                                <p className="mt-1">
                                    House Of Electronics Sales Manager is licensed software that must be activated on each machine.
                                    This ensures that only authorized users can access the application and helps prevent
                                    unauthorized distribution.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                        For immediate assistance, email:
                        <a href="mailto:support@houseofelectronics.com" className="text-blue-600 hover:text-blue-700 ml-1">
                            support@houseofelectronics.com
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

