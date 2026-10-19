import { Injectable, signal, inject, computed } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { UserRole } from './role.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private readonly _currentUser = signal<User | null>(null);
  private readonly _userRole = signal<UserRole | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly userRole = this._userRole.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._userRole() === 'admin');

  // Runs once at startup (see provideAppInitializer in app.config.ts), so the user
  // and role are loaded before the router runs any guard.
  async init(): Promise<void> {
    const { data } = await this.supabaseService.client.auth.getUser();
    const user = data.user ?? null;
    this._currentUser.set(user);
    if (!user) return;

    try {
      this._userRole.set(await this.getUserRole());
    } catch {
      this._userRole.set(null);
    }
  }

  async register(email: string, password: string, displayName: string) {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('This email is already used, please use another email.');
      }
      throw new Error(error.message);
    }

    // Sign out so registering doesn't start a session; the user logs in from the login page.
    if (data.session) {
      await this.supabaseService.client.auth.signOut();
    }

    return data;
  }

  async login(email: string, password: string, redirectUrl: string = '/contacts') {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('The email or the password is incorrect');
      }
      throw new Error(error.message);
    }

    // Normally the block_pending_users hook refuses the session for pending users (error above).
    // This is a fallback in case the hook isn't enabled: drop the session before using it.
    this._currentUser.set(data.user);
    let role: UserRole;
    try {
      role = await this.getUserRole();
    } catch {
      role = 'new';
    }
    if (role === 'new') {
      await this.supabaseService.client.auth.signOut();
      this._currentUser.set(null);
      throw new Error('Your account is waiting for admin approval. Please check back later.');
    }

    this._userRole.set(role);
    this.router.navigateByUrl(redirectUrl);
    return data;
  }

  async logout() {
    await this.supabaseService.client.auth.signOut();
    this._currentUser.set(null);
    this._userRole.set(null);
    this.router.navigate(['/login']);
  }

  async getUserRole(): Promise<UserRole> {
    // Read the id from the session, not the currentUser signal, so this works
    // no matter when it's called (e.g. from a guard right after a page refresh).
    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('No active session');

    const { data, error } = await this.supabaseService.client
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new Error(' Error Occured: ' + error);

    const roleName = (data.roles as any)?.name as UserRole;
    return roleName || 'user';
  }

  hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.userRole();
    return role !== null && allowedRoles.includes(role);
  }
}
