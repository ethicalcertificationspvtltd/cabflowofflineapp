import {useEffect} from 'react';
import {useSyncStatusStore} from '../../sync/status/syncStatusStore';
import {getServices} from '../../app/services';
import {logger} from '../lib/logger';

type NetInfoModule = {
  addEventListener: (
    listener: (state: {isConnected: boolean | null; isInternetReachable: boolean | null}) => void,
  ) => () => void;
};

function getNetInfo(): NetInfoModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-community/netinfo').default as NetInfoModule;
  } catch {
    return null;
  }
}

/**
 * Tracks connectivity and triggers sync on reconnect (after auth refresh).
 */
export function useConnectivity(): void {
  const setOnline = useSyncStatusStore(s => s.setOnline);

  useEffect(() => {
    const netInfo = getNetInfo();
    if (!netInfo) {
      setOnline(true);
      return;
    }

    const unsub = netInfo.addEventListener(state => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      const wasOnline = useSyncStatusStore.getState().online;
      setOnline(online);
      if (!wasOnline && online) {
        logger.info('Reconnect detected — starting sync flush');
        const {syncEngine, refreshCounts} = getServices();
        void syncEngine.runFullSync().then(() => refreshCounts());
      }
    });

    return unsub;
  }, [setOnline]);
}
