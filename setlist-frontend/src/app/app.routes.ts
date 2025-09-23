import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/songs',
    pathMatch: 'full',
  },
  {
    path: 'songs',
    loadComponent: () =>
      import('./features/songs/songs.component').then((c) => c.SongsComponent),
  },
  {
    path: 'gigs',
    loadComponent: () =>
      import('./features/gigs/gigs.component').then((c) => c.GigsComponent),
  },
  {
    path: 'sets',
    loadComponent: () =>
      import('./features/sets/sets.component').then((c) => c.SetsComponent),
  },
  {
    path: '**',
    redirectTo: '/songs',
  },
];
