import { useEffect } from 'react';

/**
 * usePageLogger - Custom hook for logging page mounts and unmounts
 * Helps identify which pages are being accessed and if they have errors
 * 
 * @param {string} pageName - The name of the page component
 */
export const usePageLogger = (pageName) => {
  useEffect(() => {
    console.log(`📄 PAGE MOUNTED: ${pageName}`, {
      timestamp: new Date().toLocaleTimeString(),
      url: window.location.pathname
    });

    // Log when page unmounts
    return () => {
      console.log(`📄 PAGE UNMOUNTED: ${pageName}`, {
        timestamp: new Date().toLocaleTimeString()
      });
    };
  }, [pageName]);

  // Log errors globally
  useEffect(() => {
    const handleError = (event) => {
      console.error(`❌ ERROR on page ${pageName}:`, {
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [pageName]);
};

export default usePageLogger;
