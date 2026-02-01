import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainDashboardPage from '../pages/MainDashboardPage';

export default function HomePage() {
  const navigate = useNavigate();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    // Onboarding disabled for now - go straight to dashboard
    setCheckingOnboarding(false);
    
    // TODO: Re-enable onboarding later
    // const checkOnboardingStatus = async () => { ... };
    // checkOnboardingStatus();
  }, [navigate]);

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

  return <MainDashboardPage />;
}