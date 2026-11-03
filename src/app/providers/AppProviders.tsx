import React, {useEffect} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {errorReporter} from '../../shared/monitoring/sentry';
import {useAuthStore} from '../../features/auth/hooks/authStore';
import {useConnectivity} from '../../shared/hooks/useConnectivity';
import {getServices} from '../services';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Bootstrap({children}: {children: React.ReactNode}): React.JSX.Element {
  const hydrate = useAuthStore(s => s.hydrate);
  const user = useAuthStore(s => s.user);
  useConnectivity();

  useEffect(() => {
    errorReporter.init();
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const {syncEngine, refreshCounts} = getServices();
    // Initial pull after login / hydrate when online
    void syncEngine.runFullSync().then(() => refreshCounts());
  }, [user]);

  return <>{children}</>;
}

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Bootstrap>{children}</Bootstrap>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
