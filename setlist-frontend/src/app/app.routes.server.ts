import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'songs',
    renderMode: RenderMode.Server,
  },
  {
    path: 'gigs',
    renderMode: RenderMode.Server,
  },
  {
    path: 'sets',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
