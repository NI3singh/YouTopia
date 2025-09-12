'use client';

import { createContext, useState, useContext, useCallback, useMemo } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  // ADD THIS LOG to see state changes
  console.log(`[Provider] isLoading state is now: ${isLoading}`);

  const showLoader = useCallback(() => setIsLoading(true), []);

  const hideLoader = useCallback(() => {
    // ADD THIS LOG to confirm the function is called
    console.log('[Provider] HIDE LOADER CALLED!');
    setIsLoading(false);
  }, []);

  const value = useMemo(() => ({
    isLoading,
    showLoader,
    hideLoader
  }), [isLoading, showLoader, hideLoader]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};