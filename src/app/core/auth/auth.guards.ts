import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '@core/supabase/supabase.service';
import { AuthService } from './auth.service';

async function hasSession(): Promise<boolean> {
  const { data } = await inject(SupabaseService).client.auth.getSession();
  return !!data.session;
}

export const guestGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  if (!(await hasSession())) return true;

  const returnUrl: string = route.queryParams['returnUrl'] ?? '';
  const isSafe =
    returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith('/login');

  return router.parseUrl(isSafe ? returnUrl : '/contacts');
};

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  if (await hasSession()) return true;

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  try {
    const role = await authService.getUserRole();
    return role === 'admin' ? true : router.parseUrl('/contacts');
  } catch {
    return router.parseUrl('/contacts');
  }
};
