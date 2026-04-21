import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  showReconnected: boolean;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    showReconnected: false
  });

  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      isOnline: true,
      wasOffline: prev.wasOffline || !prev.isOnline,
      showReconnected: !prev.isOnline // Show reconnected only if was offline
    }));

    // Auto-hide the reconnected message after 3 seconds
    setTimeout(() => {
      setStatus(prev => ({ ...prev, showReconnected: false }));
    }, 3000);
  }, []);

  const handleOffline = useCallback(() => {
    setStatus({
      isOnline: false,
      wasOffline: true,
      showReconnected: false
    });
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
}
