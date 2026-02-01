import { useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

/**
 * Hook to sync dark mode preference from settings with the DOM
 */
export const useDarkMode = () => {
  const { preferences } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.darkMode) {
      root.classList.add('theme-dark');
    } else {
      root.classList.remove('theme-dark');
    }
  }, [preferences.darkMode]);
};
