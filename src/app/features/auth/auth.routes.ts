import { Routes } from '@angular/router';
import { guestGuard } from '@core/auth/auth.guards';

export default [
  { path: 'login', loadComponent: () => import('./login/login'), canActivate: [guestGuard] },
  {
    path: 'register',
    loadComponent: () => import('./register/register'),
    canActivate: [guestGuard],
  },
] satisfies Routes;
