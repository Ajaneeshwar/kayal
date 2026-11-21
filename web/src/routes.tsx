import { lazy } from 'react';

/**
 * One line per screen. Each page lives in pages/<name>/ and default-exports its component.
 * Also add the path to WEB_APP_PATHS in ../../server.mjs so the server hands it to this app.
 */
export const routes = [
  { path: '/', Page: lazy(() => import('./pages/landing/LandingPage.tsx')) },
  { path: '/boat/:boatId', Page: lazy(() => import('./pages/boat/BoatPage.tsx')) },
  { path: '/boat/:boatId/sticker', Page: lazy(() => import('./pages/boat/StickerPage.tsx')) },
  { path: '/dashboard', Page: lazy(() => import('./pages/dashboard/DashboardPage.tsx')) },
  { path: '/crew', Page: lazy(() => import('./pages/crew/CrewPage.tsx')) },
];
