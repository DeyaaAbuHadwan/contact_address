import { Routes } from '@angular/router';

// authGuard is applied once on the parent 'contacts' route in app.routes.ts
export default [
  { path: '', loadComponent: () => import('./contact-list/contact-list') },
  { path: 'details/:contactID', loadComponent: () => import('./contact-details/contact-details') },
] satisfies Routes;
