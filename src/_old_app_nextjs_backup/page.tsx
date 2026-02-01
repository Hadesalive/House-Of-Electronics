'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import DashboardPage from '../app/dashboard';

export default function HomePage() {
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Check if onboarding has been completed from database
        if (typeof window !== 'undefined' && window.electronAPI) {
          const electronAPI = window.electronAPI as Record<string, unknown>;
          if ('getPreferences' in electronAPI && typeof electronAPI.getPreferences === 'function') {
            const response = await (electronAPI.getPreferences as () => Promise<{ success: boolean; data?: { onboardingCompleted: boolean } }>)();
            if (response && response.success && response.data) {
              const preferences = response.data;
              if (!preferences.onboardingCompleted) {
                // Redirect to onboarding
                router.push('/onboarding');
              } else {
                setCheckingOnboarding(false);
              }
            } else {
              // Fallback: redirect to onboarding if we can't get preferences
              router.push('/onboarding');
            }
          } else {
            // Fallback: redirect to onboarding if method not available
            router.push('/onboarding');
          }
        } else {
          // Fallback: redirect to onboarding if we can't access electron
          router.push('/onboarding');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Fallback: redirect to onboarding if we can't check
        router.push('/onboarding');
      }
    };
    
    checkOnboardingStatus();
  }, [router]);

  if (checkingOnboarding) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}