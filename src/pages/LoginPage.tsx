/**
 * Login Page
 * House Of Electronics
 * Simplified Branding & Refined Minimalist Design
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading: authLoading } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(username, password);

            if (result.success) {
                navigate(from, { replace: true });
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

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

            <div className="w-full max-w-[440px] relative z-10 p-6">
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

                {/* Login Card */}
                <div className="bg-white/95 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 lg:p-10">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                                <LockClosedIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Enter your credentials to continue</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
                            <p className="text-xs font-semibold text-red-600">{error}</p>
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
                                    className="w-full pl-12 pr-4 py-3 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-slate-900 placeholder:text-slate-400 font-medium shadow-sm hover:border-slate-300"
                                    placeholder="Enter your username"
                                    required
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label htmlFor="password" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <LockClosedIcon className="w-4 h-4 text-slate-500" />
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <LockClosedIcon className="w-5 h-5" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none text-slate-900 placeholder:text-slate-400 font-medium shadow-sm hover:border-slate-300"
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !username || !password}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6 text-sm uppercase tracking-wider flex items-center justify-center gap-2 group"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Secure Footer */}
                <div className="mt-8 text-center text-white/50">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
                        Secure Access Terminal
                    </p>
                    <p className="text-[10px] mt-2">
                        © {new Date().getFullYear()} House Of Electronics. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}