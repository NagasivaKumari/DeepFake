import { useEffect } from 'react';

function useSyncOnReconnect(syncFunction) {
  useEffect(() => {
    const handleOnline = () => {
      console.log('Reconnected to the internet. Syncing data...');
      syncFunction();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncFunction]);
}

export default useSyncOnReconnect;