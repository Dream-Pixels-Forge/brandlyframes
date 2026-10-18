import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Providers } from '../router';

export const Route = createRootRoute({
  component: () => (
    <Providers>
      <Outlet />
    </Providers>
  ),
});
