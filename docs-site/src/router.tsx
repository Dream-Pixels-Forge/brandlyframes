import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect, type ReactNode } from 'react';
import './styles/globals.css';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        retry: 1,
        gcTime: 1000 * 60 * 30,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {mounted && process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
