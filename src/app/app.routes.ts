import { Routes } from '@angular/router';
import { adminGuard, authGuard } from '@core/auth/auth.guards';

// Each feature is lazy-loaded: its code is downloaded only when one of its pages is opened.
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // /login, /register
  { path: '', loadChildren: () => import('./features/auth/auth.routes') },

  // /contacts, /contacts/details/:contactID
  {
    path: 'contacts',
    canActivate: [authGuard],
    loadChildren: () => import('./features/contacts/contacts.routes'),
  },

  // /register-requests
  {
    path: 'register-requests',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/register-requests/register-requests'),
  },
];
