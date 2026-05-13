import { createRouter } from '@tanstack/react-router';

import { routerAuth } from './auth';
import { routeTree } from './routeTree.gen';

export const router = createRouter({
  context: {
    auth: routerAuth,
  },
  routeTree,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
