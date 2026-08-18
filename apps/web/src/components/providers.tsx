'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuth } from '@/store/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const status = (error as { status?: number }).status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  const refresh = useAuth((s) => s.refresh);

  // Restore the session from the refresh cookie on first paint.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#f4f1ec',
            border: '1px solid #2a2724',
            fontFamily: 'var(--font-inter)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
