/**
 * Forgot Password Page
 * House Of Electronics
 * Simplified Branding & Refined Minimalist Design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon, UserIcon, LockClosedIcon, KeyIcon } from '@heroicons/react/24/outline';

interface UserInfo {
    username: string;
    fullName: string;
    role: string;
    isActive: boolean;
}

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [checkingUser, setCheckingUser] = useState(false);

    // Check username when it changes (with debounce)
    useEffect(() => {
        if (!username || username.trim() === '') {
            setUserInfo(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setCheckingUser(true);
            try {
                if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
                    const result = await window.electron.ipcRenderer.invoke('get-user-by-username', username.trim()) as {
                        success: boolean;
                        data?: UserInfo;
                        error?: string;
                    };

                    if (result.success && result.data) {
                        setUserInfo(result.data);
                        setError('');
                    } else {
                        setUserInfo(null);
                    }
                }
            } catch (err) {
                setUserInfo(null);
            } finally {
                setCheckingUser(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!username) {
            setError('Please enter your username');
            return;
        }

        if (!newPassword) {
            setError('Please enter a new password');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            if (typeof window !== 'undefined' && window.electron?.ipcRenderer) {
                const result = await window.electron.ipcRenderer.invoke('reset-user-password', {
                    username,
                    newPassword
                }) as {
                    success: boolean;
                    error?: string;
                };

                if (result.success) {
                    setSuccess(true);
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                } else {
                    setError(result.error || 'Failed to reset password');
                }
            } else {
                setError('Unable to connect to system. Please try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-100">
            {/* Electronics-themed Background with Overlay */}
            <div className="absolute inset-0 z-0">
                {/* Electronics Pattern Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-800 to-indigo-900"></div>
                {/* Electronics Logo Pattern Overlay */}
                <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-4 gap-8 p-8 h-full">
                        {['samsung-Logo.png', 'Apple-Logo.png', 'Dell Logo.png', 'HP-Logо.png', 'lenovo-logo.png', 'Asus-Logo.png', 'Tplink-logo.png', 'Google-logo.png'].map((logo, idx) => (
                            <div key={idx} className="flex items-center justify-center">
                                <img
                                    src={`/logo/${logo}`}
                                    alt="Electronics Brand"
                                    className="w-24 h-24 object-contain grayscale brightness-0 invert opacity-30"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"></div>
            </div>

            <div className="w-full max-w-[480px] relative z-10 p-6">
                {/* Simplified Brand Header */}
                <div className="text-center mb-10">
                    <img
                        src="/images/hoe logo.png"
                        alt="House Of Electronics"
                        className="h-16 w-auto mx-auto mb-6 drop-shadow-lg"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                        }}
                    />
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
                            House Of Electronics
                        </h1>
                        <p className="text-sm text-white/90 uppercase tracking-[0.2em] font-medium">
                            Your Trusted Electronics Partner
                        </p>
                    </div>
                </div>

                {/* Reset Password Card */}
                <div className="bg-white/95 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 lg:p-10">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                                <KeyIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Enter your details to create a new password</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-sm">
                            <p className="text-xs font-semibold text-red-600 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl shadow-sm">
                            <p className="text-xs font-semibold text-green-600 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Password reset successfully! Redirecting...
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-slate-500" />
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl transition-all duration-200 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium shadow-sm hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter your username"
                                    required
                                    disabled={isLoading || success}
                                />
                            </div>
                            {userInfo && (
                                <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-600 rounded-lg">
                                            <UserIcon className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">{userInfo.fullName}</p>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{userInfo.role}</p>
                                        </div>
                                    </div>
                                    <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"></div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="newPassword" className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
                                <LockClosedIcon className="w-4 h-4 text-slate-500" />
                                New Password
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <LockClosedIcon className="w-5 h-5" />
                                </div>
                                <input
                                    id="newPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl transition-all duration-200 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium shadow-sm hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter new password"
                                    required
                                    disabled={isLoading || success}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                                    disabled={isLoading || success}
                                >
                                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
                                <LockClosedIcon className="w-4 h-4 text-slate-500" />
                                Confirm Password
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <LockClosedIcon className="w-5 h-5" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl transition-all duration-200 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium shadow-sm hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Confirm new password"
                                    required
                                    disabled={isLoading || success}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                                    disabled={isLoading || success}
                                >
                                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6 text-sm uppercase tracking-wider flex items-center justify-center gap-2 group"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Processing...
                                </>
                            ) : success ? (
                                <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Done
                                </>
                            ) : (
                                <>
                                    Update Password
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
