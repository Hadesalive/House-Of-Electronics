import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/core';
import { Input, Textarea } from '@/components/ui/forms';
import { FormCard, FormSection } from '@/components/ui/forms';
import { Alert } from '@/components/ui/core';
import {
    Terminal,
    CheckCircle2,
    XCircle,
    Key,
    Upload,
    FileText,
    Copy,
    CheckCircle,
    AlertCircle,
    Info,
    Phone,
    Mail,
    Building,
    Cpu,
    Monitor,
    Shield
} from 'lucide-react';

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

export default function ActivationPage() {
    const navigate = useNavigate();
    const [activationStatus, setActivationStatus] = useState<ActivationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [importMethod, setImportMethod] = useState<'file' | 'paste'>('file');
    const [licenseText, setLicenseText] = useState('');
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    // Load activation status
    useEffect(() => {
        loadActivationStatus();
    }, []);

    const loadActivationStatus = async () => {
        setLoading(true);
        try {
            const status: ActivationStatus = await window.electronAPI.getActivationStatus();
            setActivationStatus(status);
        } catch (error) {
            console.error('Failed to load activation status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileImport = async () => {
        setImporting(true);
        setImportError('');

        try {
            const result = await window.electronAPI.importLicenseFile();

            if (result.success) {
                setImportSuccess(true);
                // Reload activation status to reflect changes
                await loadActivationStatus();
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            } else {
                setImportError(result.error || 'Failed to import license');
            }
        } catch (error: any) {
            setImportError(error.message || 'Failed to import license');
        } finally {
            setImporting(false);
        }
    };

    const handleTextImport = async () => {
        if (!licenseText.trim()) {
            setImportError('Please paste your license content');
            return;
        }

        setImporting(true);
        setImportError('');

        try {
            const result = await window.electronAPI.importLicenseData(licenseText);

            if (result.success) {
                setImportSuccess(true);
                // Reload activation status to reflect changes
                await loadActivationStatus();
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            } else {
                setImportError(result.error || 'Failed to import license');
            }
        } catch (error: any) {
            setImportError(error.message || 'Failed to import license');
        } finally {
            setImporting(false);
        }
    };

    const copyMachineId = () => {
        if (activationStatus?.machineInfo?.fullHash) {
            navigator.clipboard.writeText(activationStatus.machineInfo.fullHash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const exportActivationRequest = async () => {
        try {
            await window.electronAPI.exportActivationRequest();
        } catch (error) {
            console.error('Failed to export activation request:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading activation information...</p>
                </div>
            </div>
        );
    }

    if (importSuccess) {
        return (
            <div className="flex items-center justify-center h-screen">
                <FormCard className="max-w-md text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">Activation Successful!</h2>
                    <p className="text-muted-foreground mb-4">Your license has been activated successfully.</p>
                    <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
                </FormCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <Shield className="h-8 w-8 text-accent" />
                            <div>
                                <h1 className="text-xl font-bold text-foreground">House Of Electronics Sales Manager</h1>
                                <p className="text-sm text-muted-foreground">License Activation</p>
                            </div>
                        </div>
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            License Required
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Left Column - Machine ID */}
                    <FormCard>
                        <FormSection>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="flex items-center justify-center w-8 h-8 bg-accent/10 text-accent rounded-full text-sm font-bold">
                                    1
                                </span>
                                <h2 className="text-lg font-semibold text-foreground">Your Machine ID</h2>
                            </div>
                            <p className="text-muted-foreground mb-6">
                                Copy this Machine ID and send it to your vendor to receive your license file.
                            </p>

                            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <code className="text-sm font-mono text-foreground break-all">
                                        {activationStatus?.machineInfo?.fullHash}
                                    </code>
                                    <Button
                                        size="sm"
                                        onClick={copyMachineId}
                                        className="ml-2"
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        {copied ? 'Copied!' : 'Copy'}
                                    </Button>
                                </div>
                            </div>

                            {activationStatus?.machineInfo && (
                                <div className="bg-muted/50 rounded-lg p-4 space-y-3 mb-4">
                                    <h4 className="font-semibold text-foreground text-sm">Machine Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">{activationStatus.machineInfo.displayInfo.os}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Cpu className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">{activationStatus.machineInfo.displayInfo.cpu}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Building className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">{activationStatus.machineInfo.hostname}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                onClick={exportActivationRequest}
                                className="w-full"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Export Activation Request
                            </Button>
                        </FormSection>
                    </FormCard>

                    {/* Right Column - License Import */}
                    <FormCard>
                        <FormSection>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full text-sm font-bold">
                                    2
                                </span>
                                <h2 className="text-lg font-semibold text-foreground">Import License</h2>
                            </div>
                            <p className="text-muted-foreground mb-6">
                                Once you receive your license file, import it here to activate your copy.
                            </p>

                            {/* Import Method Tabs */}
                            <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-6">
                                <button
                                    onClick={() => setImportMethod('file')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${importMethod === 'file'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Upload className="h-4 w-4" />
                                    File Import
                                </button>
                                <button
                                    onClick={() => setImportMethod('paste')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${importMethod === 'paste'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <FileText className="h-4 w-4" />
                                    Paste License
                                </button>
                            </div>

                            {/* File Import */}
                            {importMethod === 'file' && (
                                <div className="space-y-4">
                                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground mb-2">Click to select your license file</p>
                                        <Button onClick={handleFileImport} disabled={importing}>
                                            {importing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                                                    Importing...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    Select License File
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Text Import */}
                            {importMethod === 'paste' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Paste License Content
                                        </label>
                                        <Textarea
                                            value={licenseText}
                                            onChange={(e) => setLicenseText(e.target.value)}
                                            placeholder="Paste your license content here..."
                                            className="min-h-[200px] font-mono text-sm"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleTextImport}
                                        disabled={importing || !licenseText.trim()}
                                        className="w-full"
                                    >
                                        {importing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Key className="h-4 w-4 mr-2" />
                                                Activate License
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Error Message */}
                            {importError && (
                                <Alert variant="error">
                                    <XCircle className="h-4 w-4" />
                                    <div>
                                        <h4 className="font-medium">Activation Failed</h4>
                                        <p className="text-sm">{importError}</p>
                                    </div>
                                </Alert>
                            )}
                        </FormSection>
                    </FormCard>
                </div>

                {/* Support Information */}
                <FormCard className="mt-8">
                    <FormSection>
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-accent mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    If you need assistance with your license activation, contact our support team:
                                </p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-foreground">+232 74762243</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-foreground">ahmadbahofficial@gmail.com</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FormSection>
                </FormCard>
            </div>
        </div>
    );
}